const TaxProfile = require('../models/TaxProfile.model');

const OLD_SLABS = [
  { min: 0, max: 250000, rate: 0 },
  { min: 250000, max: 500000, rate: 0.05 },
  { min: 500000, max: 1000000, rate: 0.20 },
  { min: 1000000, max: Infinity, rate: 0.30 }
];

const NEW_SLABS = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300000, max: 700000, rate: 0.05 },
  { min: 700000, max: 1000000, rate: 0.10 },
  { min: 1000000, max: 1200000, rate: 0.15 },
  { min: 1200000, max: 1500000, rate: 0.20 },
  { min: 1500000, max: Infinity, rate: 0.30 }
];

const CESS_RATE = 0.04;
const OLD_REBATE_LIMIT = 500000;
const OLD_REBATE_MAX = 12500;
const NEW_REBATE_LIMIT = 700000;
const NEW_REBATE_MAX = 25000;

const MAX_80C = 150000;
const MAX_80D = 25000;
const MAX_80D_SENIOR = 50000;
const MAX_80TTA = 10000;
const STANDARD_DEDUCTION = 50000;

function computeTaxOld(grossIncome, deductions) {
  const ded80C = Math.min(deductions.section80C || 0, MAX_80C);
  const ded80D = Math.min(deductions.section80D || 0, MAX_80D);
  const ded80E = deductions.section80E || 0;
  const ded80G = deductions.section80G || 0;
  const ded80TTA = Math.min(deductions.section80TTA || 0, MAX_80TTA);
  const ded80CCD = deductions.section80CCD || 0;
  const hra = deductions.hra || 0;
  const lta = deductions.lta || 0;
  const stdDed = deductions.standardDeduction || STANDARD_DEDUCTION;
  const homeLoan = deductions.homeLoanInterest || 0;

  const totalDeductions = ded80C + ded80D + ded80E + ded80G + ded80TTA + ded80CCD + hra + lta + stdDed + homeLoan;
  const taxableIncome = Math.max(0, grossIncome - totalDeductions);

  let tax = 0;
  for (const slab of OLD_SLABS) {
    if (taxableIncome > slab.min) {
      const slabAmount = Math.min(taxableIncome, slab.max) - slab.min;
      tax += slabAmount * slab.rate;
    }
  }

  if (grossIncome <= OLD_REBATE_LIMIT) {
    tax = Math.max(0, tax - OLD_REBATE_MAX);
  }

  const cess = tax * CESS_RATE;
  return { taxableIncome: Math.round(taxableIncome), totalDeductions: Math.round(totalDeductions), tax: Math.round(tax), cess: Math.round(cess), totalLiability: Math.round(tax + cess) };
}

function computeTaxNew(grossIncome, deductions) {
  const allowedDeductions = (deductions.section80CCD || 0) + (deductions.standardDeduction || 0);
  const taxableIncome = Math.max(0, grossIncome - allowedDeductions);

  let tax = 0;
  for (const slab of NEW_SLABS) {
    if (taxableIncome > slab.min) {
      const slabAmount = Math.min(taxableIncome, slab.max) - slab.min;
      tax += slabAmount * slab.rate;
    }
  }

  if (grossIncome <= NEW_REBATE_LIMIT) {
    tax = Math.max(0, tax - NEW_REBATE_MAX);
  }

  const cess = tax * CESS_RATE;
  return { taxableIncome: Math.round(taxableIncome), allowedDeductions: Math.round(allowedDeductions), tax: Math.round(tax), cess: Math.round(cess), totalLiability: Math.round(tax + cess) };
}

const getProfile = async (req, res) => {
  try {
    const { year } = req.query;
    const filter = { userId: req.user.id };
    if (year) filter.financialYear = year;
    const profile = await TaxProfile.findOne(filter).sort({ createdAt: -1 });
    if (!profile) return res.json({ success: true, data: null });
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const saveProfile = async (req, res) => {
  try {
    let profile = await TaxProfile.findOne({ userId: req.user.id, financialYear: req.body.financialYear || '2025-26' });
    if (profile) {
      Object.assign(profile, req.body);
      await profile.save();
    } else {
      profile = new TaxProfile({ ...req.body, userId: req.user.id });
      await profile.save();
    }
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const calculate = async (req, res) => {
  try {
    const { grossIncome, deductions, financialYear } = req.body;
    const income = grossIncome || 0;
    const ded = deductions || {};

    const oldRegime = computeTaxOld(income, ded);
    const newRegime = computeTaxNew(income, ded);

    const savings = oldRegime.totalLiability - newRegime.totalLiability;

    const breakdown = [];
    let cumulative = 0;
    for (const slab of OLD_SLABS) {
      if (oldRegime.taxableIncome > slab.min) {
        const amount = Math.min(oldRegime.taxableIncome, slab.max) - slab.min;
        const slabTax = amount * slab.rate;
        cumulative += slabTax;
        breakdown.push({ regime: 'old', slab: `${(slab.min / 100000).toFixed(0)}L-${slab.max === Infinity ? 'above' : (slab.max / 100000).toFixed(0) + 'L'}`, amount: Math.round(amount), rate: slab.rate * 100, tax: Math.round(slabTax) });
      }
    }
    cumulative = 0;
    for (const slab of NEW_SLABS) {
      if (newRegime.taxableIncome > slab.min) {
        const amount = Math.min(newRegime.taxableIncome, slab.max) - slab.min;
        const slabTax = amount * slab.rate;
        cumulative += slabTax;
        breakdown.push({ regime: 'new', slab: `${(slab.min / 100000).toFixed(0)}L-${slab.max === Infinity ? 'above' : (slab.max / 100000).toFixed(0) + 'L'}`, amount: Math.round(amount), rate: slab.rate * 100, tax: Math.round(slabTax) });
      }
    }

    res.json({
      success: true,
      data: {
        financialYear: financialYear || '2025-26',
        grossIncome: Math.round(income),
        oldRegime,
        newRegime,
        recommendedRegime: savings > 0 ? 'new' : 'old',
        savings: Math.abs(savings),
        effectiveRateOld: income > 0 ? Math.round((oldRegime.totalLiability / income) * 100 * 100) / 100 : 0,
        effectiveRateNew: income > 0 ? Math.round((newRegime.totalLiability / income) * 100 * 100) / 100 : 0,
        breakdown
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getDeductionSuggestions = async (req, res) => {
  try {
    const { grossIncome, currentDeductions } = req.body;
    const income = grossIncome || 0;
    const ded = currentDeductions || {};

    const used80C = Math.min(ded.section80C || 0, MAX_80C);
    const remaining80C = Math.max(0, MAX_80C - used80C);

    const used80D = Math.min(ded.section80D || 0, MAX_80D);
    const remaining80D = Math.max(0, MAX_80D - used80D);

    const suggestions = [];
    if (remaining80C > 0) suggestions.push({ section: '80C', remaining: remaining80C, options: 'PPF, ELSS, EPF, NSC, TaxSaver FD, Life Insurance', potentialSaving: Math.round(remaining80C * 0.30) });
    if (remaining80D > 0) suggestions.push({ section: '80D', remaining: remaining80D, options: 'Health Insurance premium for self & family', potentialSaving: Math.round(remaining80D * 0.30) });
    if (!ded.section80CCD || ded.section80CCD < 50000) suggestions.push({ section: '80CCD(1B)', remaining: Math.max(0, 50000 - (ded.section80CCD || 0)), options: 'Additional NPS contribution (up to ₹50K)', potentialSaving: Math.round(Math.max(0, 50000 - (ded.section80CCD || 0)) * 0.30) });
    if (!ded.section80E) suggestions.push({ section: '80E', remaining: null, options: 'Education loan interest (no upper limit)', potentialSaving: null });

    const totalPotential = suggestions.filter(s => s.potentialSaving).reduce((s, v) => s + v.potentialSaving, 0);

    res.json({
      success: true,
      data: { suggestions, totalPotentialDeduction: remaining80C + remaining80D, totalPotentialSaving: totalPotential }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getProfile, saveProfile, calculate, getDeductionSuggestions };
