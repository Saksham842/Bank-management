const Loan = require('../models/Loan.model');

const calculateEMI = (principal, annualRate, tenureMonths) => {
  const r = annualRate / 100 / 12;
  if (r === 0) return { emi: Math.round(principal / tenureMonths), totalInterest: 0, totalPayment: principal };
  const emi = Math.round(principal * r * Math.pow(1 + r, tenureMonths) / (Math.pow(1 + r, tenureMonths) - 1));
  const totalPayment = emi * tenureMonths;
  const totalInterest = totalPayment - principal;
  return { emi, totalInterest, totalPayment };
};

const generateAmortizationSchedule = (principal, annualRate, tenureMonths, prepaymentAmount, prepaymentMonths) => {
  const r = annualRate / 100 / 12;
  const schedule = [];
  let balance = principal;
  let totalInterest = 0;
  let month = 1;

  while (balance > 0 && month <= tenureMonths) {
    const interest = Math.round(balance * r);
    let emi = Math.round(balance * r * Math.pow(1 + r, tenureMonths - month + 1) / (Math.pow(1 + r, tenureMonths - month + 1) - 1));
    if (emi > balance + interest) emi = balance + interest;
    let prepay = 0;
    if (prepaymentAmount > 0 && prepaymentMonths.includes(month)) {
      prepay = Math.min(prepaymentAmount, balance - (emi - interest));
    }
    const principalPaid = Math.round(emi - interest + prepay);
    const actualPaid = emi + prepay;
    totalInterest += interest;

    schedule.push({
      month,
      emi: Math.round(emi),
      interest: Math.round(interest),
      principalPaid: Math.round(principalPaid),
      prepayment: Math.round(prepay),
      totalPaid: Math.round(actualPaid),
      balance: Math.round(Math.max(0, balance - principalPaid))
    });

    balance -= principalPaid;
    month++;
  }

  return { schedule, totalMonths: month - 1, totalInterest };
};

exports.getLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: loans });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.createLoan = async (req, res) => {
  try {
    const loan = await Loan.create({ ...req.body, userId: req.userId });
    res.status(201).json({ success: true, data: loan });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.updateLoan = async (req, res) => {
  try {
    const loan = await Loan.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, { new: true, runValidators: true });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    res.json({ success: true, data: loan });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    res.json({ success: true, message: 'Loan deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.calculateEMI = async (req, res) => {
  try {
    const { principal, interestRate, tenureMonths } = req.body;
    const result = calculateEMI(principal, interestRate, tenureMonths);
    const { emi, totalInterest, totalPayment } = result;

    const schedule = [];
    let balance = principal;
    const r = interestRate / 100 / 12;
    for (let y = 1; y <= Math.ceil(tenureMonths / 12); y++) {
      const yearMonths = Math.min(12, tenureMonths - (y - 1) * 12);
      let yearInterest = 0, yearPrincipal = 0;
      for (let m = 0; m < yearMonths; m++) {
        const interestPart = Math.round(balance * r);
        const principalPart = emi - interestPart;
        yearInterest += interestPart;
        yearPrincipal += principalPart;
        balance -= principalPart;
      }
      schedule.push({ year: y, interest: Math.round(yearInterest), principal: Math.round(yearPrincipal), balance: Math.round(Math.max(0, balance)) });
    }

    const monthlyData = [];
    balance = principal;
    for (let m = 1; m <= tenureMonths; m++) {
      const interestPart = Math.round(balance * r);
      const principalPart = emi - interestPart;
      monthlyData.push({ month: m, payment: emi, interest: interestPart, principal: principalPart, balance: Math.round(Math.max(0, balance - principalPart)) });
      balance -= principalPart;
    }

    res.json({ success: true, data: { emi, totalInterest, totalPayment, schedule, monthlyData } });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.generateSchedule = async (req, res) => {
  try {
    const { principal, interestRate, tenureMonths, prepaymentAmount, prepaymentStartMonth } = req.body;
    const prepayAmt = prepaymentAmount || 0;
    const prepayMonths = prepayAmt > 0 && prepaymentStartMonth ? Array.from({ length: tenureMonths - prepaymentStartMonth + 1 }, (_, i) => prepaymentStartMonth + i) : [];
    const result = generateAmortizationSchedule(principal, interestRate, tenureMonths, prepayAmt, prepayMonths);
    const normalResult = generateAmortizationSchedule(principal, interestRate, tenureMonths, 0, []);
    res.json({
      success: true,
      data: {
        withPrepayment: result,
        withoutPrepayment: normalResult,
        savings: normalResult.totalInterest - result.totalInterest,
        monthsSaved: normalResult.totalMonths - result.totalMonths
      }
    });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.getLoanSummary = async (req, res) => {
  try {
    const loans = await Loan.find({ userId: req.userId });
    const activeLoans = loans.filter(l => l.status === 'active');
    const totalPrincipal = activeLoans.reduce((s, l) => s + l.principal, 0);
    const totalEmi = activeLoans.reduce((s, l) => s + l.emiAmount, 0);
    const totalOutstanding = activeLoans.reduce((s, l) => {
      const { emi } = calculateEMI(l.principal, l.interestRate, l.tenureMonths);
      return s + l.principal;
    }, 0);
    const avgRate = activeLoans.length > 0 ? activeLoans.reduce((s, l) => s + l.interestRate, 0) / activeLoans.length : 0;

    const typeBreakdown = {};
    loans.forEach(l => {
      const t = l.type || 'Other';
      if (!typeBreakdown[t]) typeBreakdown[t] = { count: 0, totalPrincipal: 0, totalEmi: 0 };
      typeBreakdown[t].count++;
      typeBreakdown[t].totalPrincipal += l.principal;
      typeBreakdown[t].totalEmi += l.emiAmount;
    });

    const monthsUntilPaid = activeLoans.map(l => {
      const { emi } = calculateEMI(l.principal, l.interestRate, l.tenureMonths);
      const r = l.interestRate / 100 / 12;
      let bal = l.principal, months = 0;
      while (bal > 0 && months < 600) {
        bal = bal * (1 + r) - emi;
        months++;
      }
      return { name: l.name, months, emi, principal: l.principal };
    });

    res.json({
      success: true,
      data: {
        totalLoans: loans.length,
        activeLoans: activeLoans.length,
        totalPrincipal,
        totalEmi,
        avgRate: Math.round(avgRate * 100) / 100,
        typeBreakdown,
        monthsUntilPaid
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.compareLoans = async (req, res) => {
  try {
    const { loans } = req.body;
    if (!loans || loans.length < 2) return res.status(400).json({ success: false, message: 'Provide at least 2 loans to compare' });
    const results = loans.map(l => {
      const { emi, totalInterest, totalPayment } = calculateEMI(l.principal, l.interestRate, l.tenureMonths);
      return { name: l.name || 'Loan', principal: l.principal, interestRate: l.interestRate, tenureMonths: l.tenureMonths, emi, totalInterest, totalPayment };
    });
    res.json({ success: true, data: results });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};
