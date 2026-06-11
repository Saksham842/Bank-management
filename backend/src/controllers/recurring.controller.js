const Subscription = require('../models/Subscription.model');
const Transaction = require('../models/Transaction.model');

const getSubscriptions = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { userId: req.user.id };
    if (status && status !== 'all') filter.status = status;
    const subs = await Subscription.find(filter).sort({ nextBillingDate: 1 });
    res.json({ success: true, data: subs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createSubscription = async (req, res) => {
  try {
    const { name, description, category, amount, billingCycle, nextBillingDate, paymentMethod, reminderDays } = req.body;
    const sub = new Subscription({
      userId: req.user.id,
      name, description, category,
      amount, billingCycle, nextBillingDate: new Date(nextBillingDate),
      paymentMethod, reminderDays: reminderDays || 3
    });
    await sub.save();
    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    // Don't allow userId change
    delete updates.userId;
    const sub = await Subscription.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });
    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const sub = await Subscription.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });
    res.json({ success: true, message: 'Subscription deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const markBillingPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body;
    const sub = await Subscription.findOne({ _id: id, userId: req.user.id });
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });

    const billingEntry = { amount: sub.amount, date: new Date() };
    if (transactionId) {
      billingEntry.transactionId = transactionId;
      sub.linkedTransactionIds.push(transactionId);
    }

    sub.billingHistory.push(billingEntry);
    sub.totalPaid += sub.amount;
    sub.lastBillingDate = new Date();

    // Advance next billing date based on cycle
    const next = new Date(sub.nextBillingDate);
    switch (sub.billingCycle) {
      case 'weekly': next.setDate(next.getDate() + 7); break;
      case 'monthly': next.setMonth(next.getMonth() + 1); break;
      case 'quarterly': next.setMonth(next.getMonth() + 3); break;
      case 'semi-annual': next.setMonth(next.getMonth() + 6); break;
      case 'annual': next.setFullYear(next.getFullYear() + 1); break;
    }
    sub.nextBillingDate = next;
    await sub.save();

    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const detectRecurring = async (req, res) => {
  try {
    const userId = req.user.id;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Get all DEBIT transactions grouped by description similarity
    const txns = await Transaction.find({
      userId, type: 'DEBIT', date: { $gte: ninetyDaysAgo }
    }).sort({ date: 1 });

    // Group by normalized merchant name
    const groups = {};
    for (const t of txns) {
      const key = (t.description || t.category || '').toLowerCase().trim().slice(0, 30);
      if (!key) continue;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }

    const detected = [];
    for (const [key, group] of Object.entries(groups)) {
      if (group.length < 2) continue;

      // Calculate interval stats
      const intervals = [];
      for (let i = 1; i < group.length; i++) {
        intervals.push((group[i].date - group[i-1].date) / (1000 * 60 * 60 * 24));
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const stdDev = Math.sqrt(intervals.map(i => Math.pow(i - avgInterval, 2)).reduce((a, b) => a + b, 0) / intervals.length);
      const regularity = stdDev / (avgInterval || 1);

      // High regularity = likely recurring (low std dev relative to mean)
      if (regularity < 0.3 && avgInterval <= 35) {
        const avgAmount = group.reduce((s, t) => s + t.amount, 0) / group.length;
        let cycle = 'monthly';
        if (avgInterval <= 10) cycle = 'weekly';
        else if (avgInterval <= 45) cycle = 'monthly';
        else if (avgInterval <= 100) cycle = 'quarterly';
        else cycle = 'annual';

        const lastDate = new Date(group[group.length - 1].date);
        const nextDate = new Date(lastDate);
        switch (cycle) {
          case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
          case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
          case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
          case 'annual': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
        }

        detected.push({
          name: group[0].description || key,
          category: group[0].category,
          amount: Math.round(avgAmount),
          confidence: Math.round((1 - regularity) * 100) / 100,
          occurrences: group.length,
          avgIntervalDays: Math.round(avgInterval),
          suggestedCycle: cycle,
          nextBillingDate: nextDate.toISOString().split('T')[0],
          recentTransactions: group.slice(-3).map(t => ({
            id: t._id, amount: t.amount, date: t.date
          }))
        });
      }
    }

    res.json({ success: true, data: detected.sort((a, b) => b.confidence - a.confidence) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getUpcomingPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcoming = await Subscription.find({
      userId,
      status: 'active',
      nextBillingDate: { $gte: now, $lte: thirtyDays }
    }).sort({ nextBillingDate: 1 });

    const totalDue = upcoming.reduce((s, sub) => s + sub.amount, 0);

    res.json({ success: true, data: { upcoming, totalDue, count: upcoming.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getRecurringStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const subs = await Subscription.find({ userId, status: 'active' });
    const monthly = subs.reduce((s, sub) => {
      switch (sub.billingCycle) {
        case 'weekly': return s + sub.amount * 4.33;
        case 'monthly': return s + sub.amount;
        case 'quarterly': return s + sub.amount / 3;
        case 'semi-annual': return s + sub.amount / 6;
        case 'annual': return s + sub.amount / 12;
        default: return s + sub.amount;
      }
    }, 0);

    const byCategory = {};
    subs.forEach(sub => {
      const cat = sub.category || 'Other';
      if (!byCategory[cat]) byCategory[cat] = { count: 0, monthly: 0 };
      byCategory[cat].count++;
      const m = sub.billingCycle === 'weekly' ? sub.amount * 4.33
        : sub.billingCycle === 'monthly' ? sub.amount
        : sub.billingCycle === 'quarterly' ? sub.amount / 3
        : sub.billingCycle === 'semi-annual' ? sub.amount / 6
        : sub.billingCycle === 'annual' ? sub.amount / 12
        : sub.amount;
      byCategory[cat].monthly += m;
    });

    res.json({ success: true, data: { totalActive: subs.length, monthlyTotal: Math.round(monthly), byCategory } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getSubscriptions, createSubscription, updateSubscription, deleteSubscription,
  markBillingPaid, detectRecurring, getUpcomingPayments, getRecurringStats
};
