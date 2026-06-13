const Transaction = require('../models/Transaction.model');
const Scenario = require('../models/Scenario.model');

function monthsBetween(start, end) {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function generateBaseline(txns, monthsAhead = 12) {
  const now = new Date();
  const lookback = 6;
  const start = new Date(now.getFullYear(), now.getMonth() - lookback, 1);

  // Aggregate monthly income/expense
  const monthly = {};
  for (let i = 0; i < lookback; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = d.toISOString().slice(0, 7);
    monthly[key] = { income: 0, expense: 0, count: 0 };
  }

  txns.forEach(t => {
    const d = new Date(t.date);
    if (d >= start && d <= now) {
      const key = d.toISOString().slice(0, 7);
      if (monthly[key]) {
        if (t.type === 'income' || t.type === 'CREDIT') monthly[key].income += t.amount;
        else monthly[key].expense += t.amount;
        monthly[key].count++;
      }
    }
  });

  const months = Object.values(monthly);
  if (months.length === 0) return { income: [], expense: [], balance: [] };

  const avgIncome = months.reduce((s, m) => s + m.income, 0) / months.length;
  const avgExpense = months.reduce((s, m) => s + m.expense, 0) / months.length;
  const currentBalance = txns.filter(t => t.type === 'income' || t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0)
    - txns.filter(t => t.type === 'expense' || t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);

  // Income trend
  let incomeTrend = 0;
  if (months.length >= 2) {
    const first = months[0].income;
    const last = months[months.length - 1].income;
    incomeTrend = (last - first) / months.length;
  }

  const income = [];
  const expense = [];
  const balance = [];
  let running = currentBalance;

  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const month = d.toISOString().slice(0, 7);
    const inc = Math.max(0, avgIncome + incomeTrend * (i + 1));
    const exp = Math.max(0, avgExpense + incomeTrend * 0.3 * (i + 1));
    running = running + inc - exp;

    income.push({ month, value: Math.round(inc) });
    expense.push({ month, value: Math.round(exp) });
    balance.push({ month, value: Math.round(running) });
  }

  return { income, expense, balance };
}

const getForecast = async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const txns = await Transaction.find({
      userId: req.user.id,
      date: { $gte: new Date(Date.now() - 365 * 86400000) }
    }).lean();

    const baseline = generateBaseline(txns, months);
    const avgMonthlyIncome = baseline.income.reduce((s, i) => s + i.value, 0) / baseline.income.length;
    const avgMonthlyExpense = baseline.expense.reduce((s, e) => s + e.value, 0) / baseline.expense.length;
    const projectedBalance = baseline.balance.length > 0 ? baseline.balance[baseline.balance.length - 1].value : 0;
    const startingBalance = baseline.balance.length > 0 ? baseline.balance[0].value : 0;

    res.json({
      success: true,
      data: {
        income: baseline.income,
        expense: baseline.expense,
        balance: baseline.balance,
        summary: {
          avgMonthlyIncome: Math.round(avgMonthlyIncome),
          avgMonthlyExpense: Math.round(avgMonthlyExpense),
          startingBalance: Math.round(startingBalance),
          projectedBalance: Math.round(projectedBalance),
          monthsAnalyzed: months,
          savingsRate: avgMonthlyIncome > 0 ? Math.round(((avgMonthlyIncome - avgMonthlyExpense) / avgMonthlyIncome) * 100) : 0
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const runWhatIf = async (req, res) => {
  try {
    const { incomeChange, expenseChange, oneTimeCost, monthlySavingsChange, months, currentBalance: balanceInput } = req.body;
    const forecastMonths = months || 12;

    const txns = await Transaction.find({
      userId: req.user.id,
      date: { $gte: new Date(Date.now() - 365 * 86400000) }
    }).lean();

    const baseline = generateBaseline(txns, forecastMonths);
    const startingBalance = balanceInput || (baseline.balance.length > 0 ? baseline.balance[0].value : 0);

    const incomeAdj = parseFloat(incomeChange) || 0;
    const expenseAdj = parseFloat(expenseChange) || 0;
    const oneTime = parseFloat(oneTimeCost) || 0;
    const savingsAdj = parseFloat(monthlySavingsChange) || 0;

    const scenarioIncome = [];
    const scenarioExpense = [];
    const scenarioBalance = [];
    let running = startingBalance;

    for (let i = 0; i < forecastMonths; i++) {
      const month = baseline.income[i]?.month || `year-${Math.floor(i / 12) + 1}-month-${(i % 12) + 1}`;
      const baseInc = baseline.income[i]?.value || 0;
      const baseExp = baseline.expense[i]?.value || 0;

      const inc = Math.max(0, baseInc * (1 + incomeAdj / 100));
      const exp = Math.max(0, baseExp * (1 + expenseAdj / 100) - (i === 0 ? 0 : savingsAdj));
      running = running + inc - exp - (i === 0 ? oneTime : 0);

      scenarioIncome.push({ month, value: Math.round(inc) });
      scenarioExpense.push({ month, value: Math.round(exp) });
      scenarioBalance.push({ month, value: Math.round(running) });
    }

    const finalBalance = scenarioBalance.length > 0 ? scenarioBalance[scenarioBalance.length - 1].value : 0;
    const diffFromBaseline = baseline.balance.length > 0 ? finalBalance - baseline.balance[baseline.balance.length - 1].value : 0;

    res.json({
      success: true,
      data: {
        income: scenarioIncome,
        expense: scenarioExpense,
        balance: scenarioBalance,
        baselineBalance: baseline.balance,
        summary: {
          startingBalance: Math.round(startingBalance),
          projectedBalance: Math.round(finalBalance),
          diffFromBaseline: Math.round(diffFromBaseline),
          monthsAnalyzed: forecastMonths
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const runMonteCarlo = async (req, res) => {
  try {
    const { targetAmount, months: monthsAhead, simulations: sims, monthlyContribution, currentBalance: balInput, expectedReturn, volatility } = req.body;
    const numSims = Math.min(sims || 500, 2000);
    const numMonths = monthsAhead || 12;
    const target = parseFloat(targetAmount) || 0;
    const contribution = parseFloat(monthlyContribution) || 0;
    const startBalance = parseFloat(balInput) || 0;
    const ret = (parseFloat(expectedReturn) || 8) / 100 / 12;
    const vol = (parseFloat(volatility) || 15) / 100 / Math.sqrt(12);

    const paths = [];
    let successes = 0;

    for (let s = 0; s < numSims; s++) {
      const path = [];
      let balance = startBalance;

      for (let m = 0; m < numMonths; m++) {
        const monthlyReturn = ret + vol * gaussianRandom();
        balance = balance * (1 + monthlyReturn) + contribution;
        path.push(Math.round(balance));
      }

      paths.push(path);
      if (balance >= target) successes++;
    }

    // Calculate percentile bands
    const bands = [];
    for (let m = 0; m < numMonths; m++) {
      const values = paths.map(p => p[m]).sort((a, b) => a - b);
      bands.push({
        month: m + 1,
        p10: values[Math.floor(numSims * 0.1)],
        p25: values[Math.floor(numSims * 0.25)],
        p50: values[Math.floor(numSims * 0.5)],
        p75: values[Math.floor(numSims * 0.75)],
        p90: values[Math.floor(numSims * 0.9)]
      });
    }

    const medianFinal = bands.length > 0 ? bands[bands.length - 1].p50 : 0;

    res.json({
      success: true,
      data: {
        bands,
        probability: numSims > 0 ? Math.round((successes / numSims) * 100) : 0,
        medianFinal: Math.round(medianFinal),
        targetAmount: Math.round(target),
        simulationsRun: numSims,
        monthsSimulated: numMonths,
        summary: {
          target,
          medianFinal: Math.round(medianFinal),
          probability: numSims > 0 ? Math.round((successes / numSims) * 100) : 0,
          onTrack: successes / numSims >= 0.7
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

function gaussianRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

const saveScenario = async (req, res) => {
  try {
    const { name, type, assumptions, results } = req.body;
    const scenario = await Scenario.create({
      userId: req.user.id, name, type: type || 'custom',
      assumptions: assumptions || {}, results: results || {}
    });
    res.json({ success: true, data: scenario });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getScenarios = async (req, res) => {
  try {
    const scenarios = await Scenario.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, data: scenarios });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteScenario = async (req, res) => {
  try {
    const { id } = req.params;
    await Scenario.findOneAndDelete({ _id: id, userId: req.user.id });
    res.json({ success: true, message: 'Scenario deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getFinancialIndependence = async (req, res) => {
  try {
    const txns = await Transaction.find({
      userId: req.user.id,
      date: { $gte: new Date(Date.now() - 180 * 86400000) }
    }).lean();

    const monthlyExpense = txns
      .filter(t => t.type === 'expense' || t.type === 'DEBIT')
      .reduce((s, t) => s + t.amount, 0) / 6;

    const savings = txns
      .filter(t => t.type === 'income' || t.type === 'CREDIT')
      .reduce((s, t) => s + t.amount, 0) / 6 * 0.3;

    const withdrawalRate = 0.04;
    const fiNumber = monthlyExpense * 12 / withdrawalRate;
    const monthlySavingsNeeded = fiNumber * withdrawalRate / 12;
    const yearsToFI = savings > 0 ? Math.log(1 + (fiNumber * 0.08 / 12) / savings) / Math.log(1 + 0.08 / 12) / 12 : 99;
    const currentSavingsRate = monthlyExpense > 0 ? ((savings * 12) / (monthlyExpense * 12 + savings * 12)) * 100 : 0;

    const milestones = [
      { label: '25% FI', amount: Math.round(fiNumber * 0.25) },
      { label: '50% FI', amount: Math.round(fiNumber * 0.5) },
      { label: '75% FI', amount: Math.round(fiNumber * 0.75) },
      { label: '100% FI', amount: Math.round(fiNumber) }
    ];

    res.json({
      success: true,
      data: {
        monthlyExpense: Math.round(monthlyExpense),
        fiNumber: Math.round(fiNumber),
        yearsToFI: Math.round(yearsToFI * 10) / 10,
        currentSavingsRate: Math.round(currentSavingsRate * 10) / 10,
        monthlySavingsNeeded: Math.round(monthlySavingsNeeded),
        milestones,
        progress: {
          currentSavings: Math.round(savings * 12),
          target: Math.round(fiNumber),
          pct: fiNumber > 0 ? Math.round(Math.min(100, (savings * 12 / fiNumber) * 100)) : 0
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getForecast, runWhatIf, runMonteCarlo,
  saveScenario, getScenarios, deleteScenario,
  getFinancialIndependence
};
