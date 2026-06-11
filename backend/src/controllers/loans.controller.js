const Loan = require('../models/Loan.model');

function calcEMI(principal, annualRate, months) {
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / months;
  return principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
}

function generateSchedule(principal, annualRate, months, startDate, paidSoFar) {
  const r = annualRate / 12 / 100;
  const emi = calcEMI(principal, annualRate, months);
  let balance = principal;
  const schedule = [];

  for (let i = 0; i < months; i++) {
    const interest = balance * r;
    const principalPart = emi - interest;
    balance -= principalPart;
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);

    schedule.push({
      month: i + 1,
      date: date.toISOString().slice(0, 7),
      emi: Math.round(emi),
      interest: Math.round(interest),
      principal: Math.round(principalPart),
      balance: Math.round(Math.max(0, balance)),
      paid: i < paidSoFar
    });
  }

  return schedule;
}

const getLoans = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { userId: req.user.id };
    if (status && status !== 'all') filter.status = status;
    const loans = await Loan.find(filter).sort({ startDate: -1 });

    const enriched = loans.map(l => {
      const emi = l.emi || calcEMI(l.principal, l.annualRate, l.tenureMonths);
      const totalInterest = emi * l.tenureMonths - l.principal;
      const remainingMonths = l.tenureMonths - l.paidEmis;
      const remainingBalance = remainingMonths > 0 ? calcRemainingBalance(l.principal, l.annualRate, l.tenureMonths, l.paidEmis) : 0;
      return {
        ...l.toObject(),
        emi: Math.round(emi),
        totalInterest: Math.round(totalInterest),
        totalPayment: Math.round(emi * l.tenureMonths),
        progress: Math.round((l.paidEmis / l.tenureMonths) * 100),
        remainingMonths: Math.max(0, remainingMonths),
        remainingBalance: Math.round(remainingBalance)
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

function calcRemainingBalance(principal, annualRate, months, paid) {
  const r = annualRate / 12 / 100;
  const emi = calcEMI(principal, annualRate, months);
  let balance = principal;
  for (let i = 0; i < paid; i++) {
    balance = balance - (emi - balance * r);
  }
  return Math.max(0, balance);
}

const getSummary = async (req, res) => {
  try {
    const loans = await Loan.find({ userId: req.user.id, status: 'active' });
    const totalPrincipal = loans.reduce((s, l) => s + l.principal, 0);
    const totalEmi = loans.reduce((s, l) => s + (l.emi || calcEMI(l.principal, l.annualRate, l.tenureMonths)), 0);
    const totalRemaining = loans.reduce((s, l) => {
      const emi = l.emi || calcEMI(l.principal, l.annualRate, l.tenureMonths);
      const remMonths = l.tenureMonths - l.paidEmis;
      return s + (remMonths > 0 ? calcRemainingBalance(l.principal, l.annualRate, l.tenureMonths, l.paidEmis) : 0);
    }, 0);
    const totalPaid = loans.reduce((s, l) => s + l.totalPaid, 0);
    const totalInterest = loans.reduce((s, l) => {
      const emi = l.emi || calcEMI(l.principal, l.annualRate, l.tenureMonths);
      return s + Math.round(emi * l.tenureMonths - l.principal);
    }, 0);

    res.json({ success: true, data: {
      activeCount: loans.length,
      totalPrincipal: Math.round(totalPrincipal),
      totalEmi: Math.round(totalEmi),
      totalRemaining: Math.round(totalRemaining),
      totalPaid: Math.round(totalPaid),
      totalInterest: totalInterest,
      totalPayment: totalInterest + Math.round(totalPrincipal)
    }});
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createLoan = async (req, res) => {
  try {
    const { name, type, lender, principal, annualRate, tenureMonths, startDate, notes } = req.body;
    if (!name || !principal || !annualRate || !tenureMonths || !startDate) {
      return res.status(400).json({ success: false, message: 'name, principal, annualRate, tenureMonths, startDate required' });
    }
    const emi = calcEMI(principal, annualRate, tenureMonths);
    const loan = await Loan.create({
      userId: req.user.id, name, type: type || 'personal', lender: lender || 'Bank',
      principal, annualRate, tenureMonths, emi: Math.round(emi),
      startDate: new Date(startDate), notes
    });
    res.json({ success: true, data: loan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    delete updates.userId;
    if (updates.principal || updates.annualRate || updates.tenureMonths) {
      const loan = await Loan.findOne({ _id: id, userId: req.user.id });
      if (loan) {
        const p = updates.principal || loan.principal;
        const r = updates.annualRate || loan.annualRate;
        const t = updates.tenureMonths || loan.tenureMonths;
        updates.emi = Math.round(calcEMI(p, r, t));
      }
    }
    const loan = await Loan.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    res.json({ success: true, data: loan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await Loan.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    res.json({ success: true, message: 'Loan deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAmortization = async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await Loan.findOne({ _id: id, userId: req.user.id });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    const schedule = generateSchedule(loan.principal, loan.annualRate, loan.tenureMonths, loan.startDate, loan.paidEmis);
    const emi = loan.emi || calcEMI(loan.principal, loan.annualRate, loan.tenureMonths);

    const summary = {
      emi: Math.round(emi),
      totalInterest: Math.round(emi * loan.tenureMonths - loan.principal),
      totalPayment: Math.round(emi * loan.tenureMonths),
      paidMonths: loan.paidEmis,
      remainingMonths: loan.tenureMonths - loan.paidEmis,
      totalPaid: loan.totalPaid
    };

    res.json({ success: true, data: { schedule, summary } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const payEmi = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, month } = req.body;
    const loan = await Loan.findOne({ _id: id, userId: req.user.id });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    if (loan.paidEmis >= loan.tenureMonths) return res.status(400).json({ success: false, message: 'Loan already fully paid' });

    const emi = loan.emi || calcEMI(loan.principal, loan.annualRate, loan.tenureMonths);
    const payAmount = amount || Math.round(emi);
    loan.paidEmis = month || (loan.paidEmis + 1);
    loan.totalPaid += payAmount;
    if (loan.paidEmis >= loan.tenureMonths) loan.status = 'closed';
    await loan.save();

    res.json({ success: true, message: `EMI #${loan.paidEmis} recorded`, data: loan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const simulatePrepayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { prepayAmount } = req.body;
    if (!prepayAmount || prepayAmount <= 0) return res.status(400).json({ success: false, message: 'Valid prepayAmount required' });

    const loan = await Loan.findOne({ _id: id, userId: req.user.id });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    const emi = loan.emi || calcEMI(loan.principal, loan.annualRate, loan.tenureMonths);
    const r = loan.annualRate / 12 / 100;

    // Calculate remaining balance after paid EMIs
    let balance = loan.principal;
    for (let i = 0; i < loan.paidEmis; i++) {
      balance = balance - (Math.round(emi) - balance * r);
    }
    balance = Math.max(0, balance);

    // Apply prepayment
    const newBalance = Math.max(0, balance - prepayAmount);
    if (newBalance <= 0) {
      return res.json({ success: true, data: {
        originalRemaining: Math.round(balance),
        prepayAmount: Math.round(prepayAmount),
        newBalance: 0,
        monthsSaved: loan.tenureMonths - loan.paidEmis,
        interestSaved: Math.round(emi * (loan.tenureMonths - loan.paidEmis) - balance),
        loanCleared: true
      }});
    }

    // Recalculate remaining tenure
    const newEmi = calcEMI(newBalance, loan.annualRate, loan.tenureMonths - loan.paidEmis);
    let tempBalance = newBalance;
    let newMonths = 0;
    while (tempBalance > 0 && newMonths < 600) {
      tempBalance = tempBalance - (newEmi - tempBalance * r);
      newMonths++;
    }

    const originalRemaining = loan.tenureMonths - loan.paidEmis;
    const originalTotalRemaining = emi * originalRemaining;
    const newTotalRemaining = newEmi * newMonths;
    const interestSaved = Math.round(originalTotalRemaining - newTotalRemaining - prepayAmount);

    res.json({ success: true, data: {
      originalRemaining: Math.round(balance),
      prepayAmount: Math.round(prepayAmount),
      newBalance: Math.round(newBalance),
      originalRemainingMonths: originalRemaining,
      newRemainingMonths: newMonths,
      monthsSaved: originalRemaining - newMonths,
      interestSaved: Math.max(0, interestSaved),
      loanCleared: false
    }});
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getLoans, getSummary, createLoan, updateLoan, deleteLoan,
  getAmortization, payEmi, simulatePrepayment
};
