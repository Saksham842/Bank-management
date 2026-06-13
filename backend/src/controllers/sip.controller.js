const InvestmentGoal = require('../models/InvestmentGoal.model');

const getGoals = async (req, res) => {
  try {
    const goals = await InvestmentGoal.find({ userId: req.user.id }).sort({ targetDate: 1 });
    res.json({ success: true, data: goals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createGoal = async (req, res) => {
  try {
    const goal = new InvestmentGoal({ ...req.body, userId: req.user.id });
    await goal.save();
    res.status(201).json({ success: true, data: goal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateGoal = async (req, res) => {
  try {
    const goal = await InvestmentGoal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    res.json({ success: true, data: goal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteGoal = async (req, res) => {
  try {
    const goal = await InvestmentGoal.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    res.json({ success: true, message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const calculateSIP = async (req, res) => {
  try {
    const { monthlyInvestment, expectedReturnRate, tenureYears, stepUpPercentage } = req.body;
    const monthlyRate = (expectedReturnRate || 12) / 100 / 12;
    const months = (tenureYears || 10) * 12;
    const stepUp = (stepUpPercentage || 0) / 100;

    let totalInvestment = 0;
    let corpus = 0;
    let currentSIP = monthlyInvestment || 1000;
    const yearly = [];

    for (let m = 1; m <= months; m++) {
      corpus = corpus * (1 + monthlyRate) + currentSIP;
      totalInvestment += currentSIP;

      if (m % 12 === 0) {
        yearly.push({
          year: Math.floor(m / 12),
          invested: Math.round(totalInvestment),
          corpus: Math.round(corpus),
          returns: Math.round(corpus - totalInvestment)
        });
        if (stepUp > 0) currentSIP = currentSIP * (1 + stepUp);
      }
    }

    res.json({
      success: true,
      data: {
        monthlyInvestment: Math.round(monthlyInvestment || 1000),
        totalInvestment: Math.round(totalInvestment),
        expectedReturns: Math.round(corpus - totalInvestment),
        finalCorpus: Math.round(corpus),
        tenureYears: Math.round(tenureYears || 10),
        returnRate: expectedReturnRate || 12,
        stepUpPercentage: stepUpPercentage || 0,
        yearlyBreakdown: yearly
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const calculateLumpsum = async (req, res) => {
  try {
    const { investment, expectedReturnRate, tenureYears } = req.body;
    const rate = (expectedReturnRate || 12) / 100;
    const years = tenureYears || 10;
    const final = (investment || 0) * Math.pow(1 + rate, years);

    const yearly = [];
    for (let y = 1; y <= years; y++) {
      const val = (investment || 0) * Math.pow(1 + rate, y);
      yearly.push({ year: y, value: Math.round(val), growth: Math.round(val - (investment || 0)) });
    }

    res.json({
      success: true,
      data: {
        investment: Math.round(investment || 0),
        finalValue: Math.round(final),
        totalReturns: Math.round(final - (investment || 0)),
        returnRate: expectedReturnRate || 12,
        tenureYears: years,
        yearlyBreakdown: yearly
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const calculateGoal = async (req, res) => {
  try {
    const { targetAmount, targetDate, currentSavings, expectedReturnRate, inflationRate, currentDate } = req.body;
    const start = currentDate ? new Date(currentDate) : new Date();
    const end = new Date(targetDate);
    const months = Math.max(1, Math.round((end - start) / (30 * 24 * 60 * 60 * 1000)));
    const years = months / 12;
    const monthlyRate = (expectedReturnRate || 12) / 100 / 12;
    const inflationAdj = (inflationRate || 6) / 100;

    const inflatedTarget = Math.round((targetAmount || 0) * Math.pow(1 + inflationAdj, years));

    const savingsPV = (currentSavings || 0) * Math.pow(1 + (expectedReturnRate || 12) / 100 / 12, months);
    const remaining = Math.max(0, inflatedTarget - savingsPV);

    const requiredSIP = remaining > 0
      ? remaining * (monthlyRate / (Math.pow(1 + monthlyRate, months) - 1))
      : 0;

    res.json({
      success: true,
      data: {
        targetAmount: Math.round(targetAmount || 0),
        inflatedTarget,
        currentSavings: Math.round(currentSavings || 0),
        projectedSavings: Math.round(savingsPV),
        remainingGap: Math.round(remaining),
        requiredMonthlySIP: Math.round(requiredSIP),
        monthsRemaining: months,
        yearsRemaining: Math.round(years * 10) / 10,
        returnRate: expectedReturnRate || 12,
        inflationRate: inflationRate || 6
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const projectGoal = async (req, res) => {
  try {
    const goal = await InvestmentGoal.findOne({ _id: req.params.id, userId: req.user.id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    const start = new Date();
    const end = new Date(goal.targetDate);
    const months = Math.max(1, Math.round((end - start) / (30 * 24 * 60 * 60 * 1000)));
    const monthlyRate = goal.expectedReturnRate / 100 / 12;
    const stepUp = goal.stepUpPercentage / 100;

    let corpus = goal.currentSavings;
    let totalInvestment = goal.currentSavings;
    let currentSIP = goal.monthlySIP;
    const yearly = [];

    for (let m = 1; m <= months; m++) {
      corpus = corpus * (1 + monthlyRate) + currentSIP;
      totalInvestment += currentSIP;
      if (m % 12 === 0) {
        yearly.push({
          year: Math.floor(m / 12),
          invested: Math.round(totalInvestment),
          corpus: Math.round(corpus),
          progress: Math.min(100, Math.round((corpus / goal.targetAmount) * 100))
        });
        if (stepUp > 0) currentSIP = currentSIP * (1 + stepUp);
      }
    }

    const inflatedTarget = Math.round(goal.targetAmount * Math.pow(1 + goal.inflationRate / 100, months / 12));
    const onTrack = corpus >= goal.targetAmount;

    res.json({
      success: true,
      data: {
        goalName: goal.name,
        targetAmount: goal.targetAmount,
        inflatedTarget,
        projectedCorpus: Math.round(corpus),
        totalInvestment: Math.round(totalInvestment),
        expectedReturns: Math.round(corpus - totalInvestment),
        onTrack,
        progress: Math.min(100, Math.round((corpus / goal.targetAmount) * 100)),
        gap: Math.max(0, Math.round(inflatedTarget - corpus)),
        monthsRemaining: months,
        yearlyBreakdown: yearly,
        currentSIP: Math.round(goal.monthlySIP),
        finalSIP: Math.round(currentSIP)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getGoals, createGoal, updateGoal, deleteGoal, calculateSIP, calculateLumpsum, calculateGoal, projectGoal };
