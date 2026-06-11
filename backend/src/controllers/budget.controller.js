const Budget = require('../models/Budget.model');
const BudgetHistory = require('../models/BudgetHistory.model');
const Transaction = require('../models/Transaction.model');

const getBudgets = async (req, res) => {
  try {
    const { month } = req.query; // format YYYY-MM
    const filter = { userId: req.user.id };
    if (month) filter.month = month;

    const budgets = await Budget.find(filter);
    res.json({ success: true, data: budgets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const setBudget = async (req, res) => {
  try {
    const { category, limit, month } = req.body;
    const userId = req.user.id;

    // Check if budget exists for category + month
    let budget = await Budget.findOne({ userId, category, month });

    // Calculate current spent on this category this month
    const parts = month.split('-');
    const year = parseInt(parts[0]);
    const monthIndex = parseInt(parts[1]) - 1;
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

    const summary = await Transaction.aggregate([
      {
        $match: {
          userId: new require('mongoose').Types.ObjectId(userId),
          category,
          type: 'DEBIT',
          date: { $gte: start, $lte: end }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const spent = summary.length ? summary[0].total : 0;

    if (budget) {
      budget.limit = limit;
      budget.spent = spent;
      await budget.save();
    } else {
      budget = new Budget({
        userId,
        category,
        limit,
        spent,
        month
      });
      await budget.save();
    }

    res.json({ success: true, data: budget });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getBudgetVsActual = async (req, res) => {
  try {
    const { month } = req.query;
    const userId = req.user.id;

    const budgets = await Budget.find({ userId, month });
    
    const result = budgets.map(b => ({
      category: b.category,
      limit: b.limit,
      spent: b.spent,
      remaining: Math.max(0, b.limit - b.spent),
      overBudget: b.spent > b.limit,
      pctUsed: Math.min(100, Math.round((b.spent / (b.limit || 1)) * 100))
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getBudgetRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    // Aggregate average monthly spend per category over last 3 months
    const avgSpend = await Transaction.aggregate([
      {
        $match: {
          userId: new (require('mongoose').Types.ObjectId(userId)),
          type: 'DEBIT',
          date: { $gte: threeMonthsAgo }
        }
      },
      {
        $group: {
          _id: { category: '$category', month: { $dateToString: { format: '%Y-%m', date: '$date' } } },
          total: { $sum: '$amount' }
        }
      },
      {
        $group: {
          _id: '$_id.category',
          avgMonthly: { $avg: '$total' },
          months: { $sum: 1 }
        }
      },
      { $sort: { avgMonthly: -1 } }
    ]);

    const recommendations = avgSpend.map(c => ({
      category: c._id,
      suggestedLimit: Math.ceil(c.avgMonthly * 1.1),
      avgSpend: Math.round(c.avgMonthly),
      monthsObserved: c.months,
      confidence: Math.min(1, c.months / 3)
    }));

    res.json({ success: true, data: recommendations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const recalculateSpent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month } = req.body;

    const parts = month.split('-');
    const year = parseInt(parts[0]);
    const monthIndex = parseInt(parts[1]) - 1;
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

    const budgets = await Budget.find({ userId, month });
    const results = [];

    for (const budget of budgets) {
      const summary = await Transaction.aggregate([
        {
          $match: {
            userId: new (require('mongoose').Types.ObjectId(userId)),
            category: budget.category,
            type: 'DEBIT',
            date: { $gte: start, $lte: end }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      budget.spent = summary.length ? summary[0].total : 0;
      await budget.save();
      results.push({ category: budget.category, spent: budget.spent });
    }

    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getBudgetHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await BudgetHistory.find({ userId })
      .sort({ month: -1 })
      .limit(12);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const saveMonthlySnapshot = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const budgets = await Budget.find({ userId, month });
    if (!budgets.length) {
      return res.json({ success: false, message: 'No budgets for current month' });
    }

    const snapshots = budgets.map(b => ({
      category: b.category, limit: b.limit, spent: b.spent
    }));

    const totalBudgeted = budgets.reduce((s, b) => s + b.limit, 0);
    const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

    await BudgetHistory.findOneAndUpdate(
      { userId, month },
      {
        userId, month,
        snapshots,
        totalBudgeted,
        totalSpent
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Snapshot saved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getBudgets, setBudget, getBudgetVsActual, getBudgetRecommendations, recalculateSpent, getBudgetHistory, saveMonthlySnapshot };
