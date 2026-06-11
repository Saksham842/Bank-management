const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['home', 'car', 'personal', 'education', 'business', 'other'],
    default: 'personal'
  },
  lender: {
    type: String,
    default: 'Bank'
  },
  principal: {
    type: Number,
    required: true,
    min: 0
  },
  annualRate: {
    type: Number,
    required: true,
    min: 0
  },
  tenureMonths: {
    type: Number,
    required: true,
    min: 1
  },
  emi: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  paidEmis: {
    type: Number,
    default: 0
  },
  totalPaid: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'defaulted'],
    default: 'active'
  },
  notes: String
}, { timestamps: true });

loanSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Loan', loanSchema);
