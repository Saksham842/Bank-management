const InsurancePolicy = require('../models/InsurancePolicy.model');

const getAll = async (req, res) => {
  try {
    const policies = await InsurancePolicy.find({ userId: req.user.id }).sort({ nextDueDate: 1 });
    res.json({ success: true, data: policies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOne({ _id: req.params.id, userId: req.user.id });
    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });
    res.json({ success: true, data: policy });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const policy = new InsurancePolicy({ ...req.body, userId: req.user.id });
    await policy.save();
    res.status(201).json({ success: true, data: policy });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });
    res.json({ success: true, data: policy });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });
    res.json({ success: true, message: 'Policy deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getSummary = async (req, res) => {
  try {
    const policies = await InsurancePolicy.find({ userId: req.user.id });

    const totalPremium = policies.reduce((s, p) => s + p.premium, 0);
    const totalSumAssured = policies.reduce((s, p) => s + p.sumAssured, 0);
    const active = policies.filter(p => p.status === 'active').length;
    const lapsed = policies.filter(p => p.status === 'lapsed').length;

    const byType = {};
    for (const p of policies) {
      if (!byType[p.policyType]) byType[p.policyType] = { count: 0, sumAssured: 0, premium: 0 };
      byType[p.policyType].count++;
      byType[p.policyType].sumAssured += p.sumAssured;
      byType[p.policyType].premium += p.premium;
    }

    const upcoming = policies
      .filter(p => p.status === 'active' && p.nextDueDate)
      .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate))
      .slice(0, 10)
      .map(p => ({
        _id: p._id,
        policyName: p.policyName,
        policyType: p.policyType,
        provider: p.provider,
        premium: p.premium,
        nextDueDate: p.nextDueDate
      }));

    res.json({
      success: true,
      data: {
        totalPolicies: policies.length,
        totalPremium,
        totalSumAssured,
        active,
        lapsed,
        byType,
        upcoming
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getCoverageAnalysis = async (req, res) => {
  try {
    const policies = await InsurancePolicy.find({ userId: req.user.id });
    const activePolicies = policies.filter(p => p.status === 'active');

    const lifeCover = activePolicies
      .filter(p => ['Life', 'Term'].includes(p.policyType))
      .reduce((s, p) => s + p.sumAssured, 0);

    const healthCover = activePolicies
      .filter(p => ['Health', 'Critical Illness'].includes(p.policyType))
      .reduce((s, p) => s + p.sumAssured, 0);

    const gaps = [];
    if (lifeCover === 0) gaps.push({ type: 'Life', severity: 'critical', message: 'No life insurance cover. Recommend term insurance of 10-15x annual income.' });
    if (healthCover === 0) gaps.push({ type: 'Health', severity: 'critical', message: 'No health insurance. Medical inflation is 10-15% annually.' });
    if (lifeCover < 1000000) gaps.push({ type: 'Life', severity: 'warning', message: `Life cover of ₹${lifeCover.toLocaleString('en-IN')} may be insufficient. Aim for ₹1Cr+.` });

    const monthlyPremium = activePolicies.reduce((s, p) => {
      const freq = { monthly: 1, quarterly: 3, half_yearly: 6, yearly: 12, one_time: 120 };
      return s + p.premium / (freq[p.premiumFrequency] || 12);
    }, 0);

    res.json({
      success: true,
      data: {
        lifeCover,
        healthCover,
        totalCover: activePolicies.reduce((s, p) => s + p.sumAssured, 0),
        monthlyPremiumOutgo: Math.round(monthlyPremium),
        gaps,
        recommendations: [
          'Maintain life cover of 10-15x your annual income',
          'Health cover should cover entire family (min ₹5L)',
          'Consider critical illness rider for additional protection',
          'Review and update nominees periodically',
          'Set auto-pay to avoid policy lapse'
        ]
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove, getSummary, getCoverageAnalysis };
