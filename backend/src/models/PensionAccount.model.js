const mongoose = require('mongoose');

const pensionAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountType: {
    type: String,
    enum: ['EPF', 'PPF', 'NPS', 'Superannuation', '401k', 'IRA', 'Pension', 'Annuity', 'Other'],
    required: true
  },
  accountNumber: {
    type: String,
    trim: true
  },
  provider: {
    type: String,
    trim: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  interestRate: {
    type: Number,
    default: 7.0,
    min: 0,
    max: 30
  },
  monthlyContribution: {
    type: Number,
    default: 0,
    min: 0
  },
  employerContribution: {
    type: Number,
    default: 0,
    min: 0
  },
  startDate: {
    type: Date
  },
  maturityDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

pensionAccountSchema.index({ userId: 1 });

module.exports = mongoose.model('PensionAccount', pensionAccountSchema);
