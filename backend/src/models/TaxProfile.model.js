const mongoose = require('mongoose');

const taxProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  financialYear: {
    type: String,
    default: '2025-26'
  },
  regime: {
    type: String,
    enum: ['old', 'new'],
    default: 'new'
  },
  income: {
    grossSalary: { type: Number, default: 0 },
    businessIncome: { type: Number, default: 0 },
    otherIncome: { type: Number, default: 0 },
    capitalGains: { type: Number, default: 0 }
  },
  deductions: {
    section80C: { type: Number, default: 0 },
    section80D: { type: Number, default: 0 },
    section80E: { type: Number, default: 0 },
    section80G: { type: Number, default: 0 },
    section80TTA: { type: Number, default: 0 },
    section80CCD: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    lta: { type: Number, default: 0 },
    standardDeduction: { type: Number, default: 50000 },
    homeLoanInterest: { type: Number, default: 0 }
  },
  investments: [{
    type: { type: String, enum: ['PPF', 'ELSS', 'NSC', 'FD', 'EPF', 'NPS', 'ULIP', 'TaxSaverFD', 'Other'] },
    amount: { type: Number, default: 0 },
    provider: String,
    startDate: Date
  }],
  taxPaid: {
    advanceTax: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    selfAssessment: { type: Number, default: 0 }
  }
}, { timestamps: true });

taxProfileSchema.index({ userId: 1, financialYear: 1 }, { unique: true });

module.exports = mongoose.model('TaxProfile', taxProfileSchema);
