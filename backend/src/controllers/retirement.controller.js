const RetirementPlan = require('../models/RetirementPlan.model');
const PensionAccount = require('../models/PensionAccount.model');
const mongoose = require('mongoose');

const getPlans = async (req, res) => {
  try {
    const plans = await RetirementPlan.find({ userId: req.user.id });
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPlan = async (req, res) => {
  try {
    const plan = await RetirementPlan.findOne({ _id: req.params.id, userId: req.user.id });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createPlan = async (req, res) => {
  try {
    const plan = new RetirementPlan({ ...req.body, userId: req.user.id });
    await plan.save();
    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updatePlan = async (req, res) => {
  try {
    const plan = await RetirementPlan.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deletePlan = async (req, res) => {
  try {
    const plan = await RetirementPlan.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.json({ success: true, message: 'Plan deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPensionAccounts = async (req, res) => {
  try {
    const accounts = await PensionAccount.find({ userId: req.user.id });
    res.json({ success: true, data: accounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createPensionAccount = async (req, res) => {
  try {
    const account = new PensionAccount({ ...req.body, userId: req.user.id });
    await account.save();
    res.status(201).json({ success: true, data: account });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updatePensionAccount = async (req, res) => {
  try {
    const account = await PensionAccount.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({ success: true, data: account });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deletePensionAccount = async (req, res) => {
  try {
    const account = await PensionAccount.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getProjection = async (req, res) => {
  try {
    const plan = await RetirementPlan.findOne({ _id: req.params.id, userId: req.user.id });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const { currentSavings, monthlyContribution, expectedReturnRate, inflationRate, currentAge, retirementAge, lifeExpectancy, drawdownRate } = plan;
    const monthlyRate = expectedReturnRate / 100 / 12;
    const yearsToRetirement = retirementAge - currentAge;
    const monthlyInflation = inflationRate / 100 / 12;

    const accumulation = [];
    let corpus = currentSavings;
    const totalMonths = yearsToRetirement * 12;

    for (let m = 0; m <= totalMonths; m++) {
      const year = currentAge + Math.floor(m / 12);
      const isEndOfYear = m % 12 === 0;
      if (isEndOfYear) {
        accumulation.push({
          age: year,
          year: new Date().getFullYear() + Math.floor(m / 12),
          phase: 'accumulation',
          corpus: Math.round(corpus),
          contributions: Math.round(currentSavings + monthlyContribution * m),
          returns: Math.round(corpus - (currentSavings + monthlyContribution * m))
        });
      }
      corpus = corpus * (1 + monthlyRate) + monthlyContribution;
    }

    const corpusAtRetirement = corpus;
    const withdrawalRate = drawdownRate / 100 / 12;
    const yearsInRetirement = lifeExpectancy - retirementAge;
    const retirementMonths = yearsInRetirement * 12;

    const drawdown = [];
    for (let m = 0; m <= retirementMonths; m++) {
      const year = retirementAge + Math.floor(m / 12);
      const isEndOfYear = m % 12 === 0;
      if (isEndOfYear) {
        drawdown.push({
          age: year,
          year: new Date().getFullYear() + yearsToRetirement + Math.floor(m / 12),
          phase: 'drawdown',
          corpus: Math.round(corpus),
          monthlyIncome: Math.round(corpus * withdrawalRate)
        });
      }
      corpus = corpus * (1 + monthlyRate) - corpus * withdrawalRate;
      if (corpus < 0) corpus = 0;
    }

    const monthlyIncomeRetirement = Math.round(corpusAtRetirement * withdrawalRate);
    const inflationAdjustedTarget = Math.round(plan.targetCorpus * Math.pow(1 + inflationRate / 100, yearsToRetirement));

    res.json({
      success: true,
      data: {
        accumulation,
        drawdown,
        corpusAtRetirement: Math.round(corpusAtRetirement),
        monthlyIncomeAtRetirement: monthlyIncomeRetirement,
        targetCorpus: plan.targetCorpus,
        inflationAdjustedTarget,
        gap: Math.max(0, inflationAdjustedTarget - Math.round(corpusAtRetirement)),
        yearsToRetirement,
        yearsInRetirement
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getReadinessScore = async (req, res) => {
  try {
    const plan = await RetirementPlan.findOne({ _id: req.params.id, userId: req.user.id });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const { currentSavings, monthlyContribution, expectedReturnRate, currentAge, retirementAge, targetCorpus } = plan;
    const monthlyRate = expectedReturnRate / 100 / 12;
    const monthsToRetirement = (retirementAge - currentAge) * 12;

    let projectedCorpus = currentSavings;
    for (let m = 0; m < monthsToRetirement; m++) {
      projectedCorpus = projectedCorpus * (1 + monthlyRate) + monthlyContribution;
    }

    const ratio = projectedCorpus / targetCorpus;
    const score = Math.min(100, Math.round(ratio * 100));

    let status = 'on_track';
    if (score < 50) status = 'critical';
    else if (score < 75) status = 'behind';
    else if (score < 90) status = 'close';

    const neededMonthly = (targetCorpus - currentSavings * Math.pow(1 + monthlyRate, monthsToRetirement)) *
      (monthlyRate / (Math.pow(1 + monthlyRate, monthsToRetirement) - 1));

    res.json({
      success: true,
      data: {
        readinessScore: score,
        status,
        projectedCorpus: Math.round(projectedCorpus),
        targetCorpus,
        gap: Math.max(0, targetCorpus - Math.round(projectedCorpus)),
        currentMonthly: monthlyContribution,
        recommendedMonthly: Math.round(Math.max(0, neededMonthly)),
        age: currentAge,
        retirementAge,
        monthsRemaining: monthsToRetirement
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMonteCarlo = async (req, res) => {
  try {
    const plan = await RetirementPlan.findOne({ _id: req.params.id, userId: req.user.id });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const { currentSavings, monthlyContribution, expectedReturnRate, currentAge, retirementAge, targetCorpus } = plan;
    const monthlyRate = expectedReturnRate / 100 / 12;
    const volatility = expectedReturnRate * 1.5 / 100 / Math.sqrt(12);
    const monthsToRetirement = (retirementAge - currentAge) * 12;
    const simulations = 1000;

    const finalCorpora = [];
    for (let s = 0; s < simulations; s++) {
      let corpus = currentSavings;
      for (let m = 0; m < monthsToRetirement; m++) {
        const randomReturn = monthlyRate + volatility * (Math.random() * 2 - 1);
        corpus = corpus * (1 + randomReturn) + monthlyContribution;
        if (corpus < 0) corpus = 0;
      }
      finalCorpora.push(corpus);
    }

    finalCorpora.sort((a, b) => a - b);
    const p5 = finalCorpora[Math.floor(simulations * 0.05)];
    const p25 = finalCorpora[Math.floor(simulations * 0.25)];
    const p50 = finalCorpora[Math.floor(simulations * 0.5)];
    const p75 = finalCorpora[Math.floor(simulations * 0.75)];
    const p95 = finalCorpora[Math.floor(simulations * 0.95)];

    const successes = finalCorpora.filter(c => c >= targetCorpus).length;
    const successRate = Math.round((successes / simulations) * 100);

    const percentiles = [];
    const step = Math.floor(simulations / 20);
    for (let i = 0; i < simulations; i += step) {
      percentiles.push(Math.round(finalCorpora[i]));
    }

    const distribution = {};
    for (const c of finalCorpora) {
      const bucket = Math.floor(c / (targetCorpus / 20)) * (targetCorpus / 20);
      const key = Math.round(bucket / 100000) * 100000;
      distribution[key] = (distribution[key] || 0) + 1;
    }
    const histogram = Object.entries(distribution).map(([corpus, count]) => ({
      corpus: parseInt(corpus),
      count,
      hitTarget: parseInt(corpus) >= targetCorpus
    })).sort((a, b) => a.corpus - b.corpus);

    res.json({
      success: true,
      data: {
        simulations,
        successRate,
        percentiles: { p5: Math.round(p5), p25: Math.round(p25), p50: Math.round(p50), p75: Math.round(p75), p95: Math.round(p95) },
        median: Math.round(p50),
        targetCorpus,
        histogram,
        volatility: Math.round(volatility * 100 * Math.sqrt(12) * 10) / 10
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getOptimize = async (req, res) => {
  try {
    const accounts = await PensionAccount.find({ userId: req.user.id });
    const plan = await RetirementPlan.findOne({ userId: req.user.id }).sort({ createdAt: -1 });

    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
    const totalMonthly = accounts.reduce((s, a) => s + a.monthlyContribution + a.employerContribution, 0);

    const recommendations = accounts.map(a => {
      const projectedGrowth = a.balance * Math.pow(1 + a.interestRate / 100 / 12, 12) + (a.monthlyContribution + a.employerContribution) * 12;
      const efficiency = a.interestRate / (a.monthlyContribution + a.employerContribution + 1) * 100;
      return {
        accountId: a._id,
        accountType: a.accountType,
        balance: a.balance,
        currentMonthly: a.monthlyContribution + a.employerContribution,
        interestRate: a.interestRate,
        projectedAnnualGrowth: Math.round(projectedGrowth - a.balance),
        efficiency: Math.round(efficiency * 10) / 10,
        suggestion: a.interestRate >= 8 ? 'maintain' : a.interestRate >= 6 ? 'consider_increase' : 'evaluate_alternatives'
      };
    });

    const topRated = [...recommendations].sort((a, b) => b.efficiency - a.efficiency);

    res.json({
      success: true,
      data: {
        totalBalance: Math.round(totalBalance),
        totalMonthlyContribution: Math.round(totalMonthly),
        accounts: recommendations,
        topRecommendation: topRated[0] || null,
        targetCorpus: plan ? plan.targetCorpus : 0,
        notes: plan ? `Target retirement age: ${plan.retirementAge}, Current age: ${plan.currentAge}` : 'Create a retirement plan for optimization'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getPlans, getPlan, createPlan, updatePlan, deletePlan,
  getPensionAccounts, createPensionAccount, updatePensionAccount, deletePensionAccount,
  getProjection, getReadinessScore, getMonteCarlo, getOptimize
};
