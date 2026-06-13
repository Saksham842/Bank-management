const Debt = require('../models/Debt.model');

const getAll = async (req, res) => {
  try {
    const debts = await Debt.find({ userId: req.user.id }).sort({ interestRate: -1 });
    res.json({ success: true, data: debts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user.id });
    if (!debt) return res.status(404).json({ success: false, message: 'Debt not found' });
    res.json({ success: true, data: debt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const debt = new Debt({ ...req.body, userId: req.user.id });
    await debt.save();
    res.status(201).json({ success: true, data: debt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const debt = await Debt.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!debt) return res.status(404).json({ success: false, message: 'Debt not found' });
    res.json({ success: true, data: debt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const debt = await Debt.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!debt) return res.status(404).json({ success: false, message: 'Debt not found' });
    res.json({ success: true, message: 'Debt deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getSummary = async (req, res) => {
  try {
    const debts = await Debt.find({ userId: req.user.id, isActive: true });

    const totalBalance = debts.reduce((s, d) => s + d.totalBalance, 0);
    const totalMinPayment = debts.reduce((s, d) => s + d.minimumPayment, 0);
    const weightedRate = totalBalance > 0
      ? debts.reduce((s, d) => s + d.totalBalance * d.interestRate, 0) / totalBalance
      : 0;

    const byType = {};
    for (const d of debts) {
      if (!byType[d.type]) byType[d.type] = { count: 0, balance: 0, minPayment: 0 };
      byType[d.type].count++;
      byType[d.type].balance += d.totalBalance;
      byType[d.type].minPayment += d.minimumPayment;
    }

    res.json({
      success: true,
      data: {
        totalDebts: debts.length,
        totalBalance: Math.round(totalBalance),
        totalMinPayment: Math.round(totalMinPayment),
        weightedInterestRate: Math.round(weightedRate * 10) / 10,
        byType,
        highestInterest: debts.length > 0 ? Math.max(...debts.map(d => d.interestRate)) : 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPayoffPlan = async (req, res) => {
  try {
    const { extraPayment, strategy } = req.body;
    const debts = await Debt.find({ userId: req.user.id, isActive: true });
    if (debts.length === 0) return res.json({ success: true, data: { message: 'No active debts', plans: [] } });

    const extra = extraPayment || 0;
    const method = strategy || 'avalanche';

    const sorted = method === 'avalanche'
      ? [...debts].sort((a, b) => b.interestRate - a.interestRate)
      : [...debts].sort((a, b) => a.totalBalance - b.totalBalance);

    let totalInterestPaid = 0;
    let totalMonths = 0;
    const timeline = [];
    let month = 0;

    const active = sorted.map(d => ({
      _id: d._id,
      creditor: d.creditor,
      type: d.type,
      balance: d.totalBalance,
      rate: d.interestRate,
      minPayment: d.minimumPayment || Math.round(d.totalBalance * 0.05),
      monthlyPayment: d.monthlyPayment || d.minimumPayment || Math.round(d.totalBalance * 0.05),
    }));

    const monthlyRate = (r) => r / 100 / 12;

    while (active.some(d => d.balance > 1)) {
      month++;
      if (month > 600) break;

      let availableExtra = extra;
      const monthData = { month, payments: [], totalPaid: 0 };

      for (const d of active) {
        if (d.balance <= 1) continue;
        const rate = monthlyRate(d.rate);
        const interest = d.balance * rate;
        let payment = d.minPayment;

        if (availableExtra > 0) {
          const extraHere = Math.min(availableExtra, d.balance + interest - d.minPayment);
          payment += extraHere;
          availableExtra -= extraHere;
        }

        const actualPayment = Math.min(payment, d.balance + interest);
        const principalPaid = actualPayment - interest;
        d.balance = Math.max(0, d.balance - principalPaid);

        totalInterestPaid += interest;

        monthData.payments.push({
          debtId: d._id,
          creditor: d.creditor,
          payment: Math.round(actualPayment),
          interest: Math.round(interest),
          principal: Math.round(principalPaid),
          remaining: Math.round(d.balance)
        });
        monthData.totalPaid += actualPayment;
      }

      timeline.push(monthData);
      totalMonths = month;
    }

    const snowballSorted = [...debts].sort((a, b) => a.totalBalance - b.totalBalance);
    let snowballMonths = 0;
    let snowballInterest = 0;
    month = 0;
    const snowballActive = snowballSorted.map(d => ({
      _id: d._id,
      creditor: d.creditor,
      type: d.type,
      balance: d.totalBalance,
      rate: d.interestRate,
      minPayment: d.minimumPayment || Math.round(d.totalBalance * 0.05),
      monthlyPayment: d.monthlyPayment || d.minimumPayment || Math.round(d.totalBalance * 0.05),
    }));

    while (snowballActive.some(d => d.balance > 1)) {
      month++;
      if (month > 600) break;
      let availableExtra = extra;
      for (const d of snowballActive) {
        if (d.balance <= 1) continue;
        const rate = monthlyRate(d.rate);
        const interest = d.balance * rate;
        let payment = d.minPayment;
        if (availableExtra > 0) {
          const extraHere = Math.min(availableExtra, d.balance + interest - d.minPayment);
          payment += extraHere;
          availableExtra -= extraHere;
        }
        const actualPayment = Math.min(payment, d.balance + interest);
        d.balance = Math.max(0, d.balance - (actualPayment - interest));
        snowballInterest += interest;
      }
      snowballMonths = month;
    }

    res.json({
      success: true,
      data: {
        method,
        totalMonths,
        totalPayments: Math.round(totalInterestPaid + debts.reduce((s, d) => s + d.totalBalance, 0)),
        totalInterest: Math.round(totalInterestPaid),
        principalTotal: Math.round(debts.reduce((s, d) => s + d.totalBalance, 0)),
        monthlyExtra: extra,
        timeline,
        comparison: {
          avalancheMonths: totalMonths,
          avalancheInterest: Math.round(totalInterestPaid),
          snowballMonths,
          snowballInterest: Math.round(snowballInterest),
          recommended: method === 'avalanche' ? 'avalanche' : 'snowball'
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove, getSummary, getPayoffPlan };
