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
    enum: ['Home', 'Car', 'Personal', 'Education', 'Business', 'Credit Card', 'Other'],
    default: 'Personal'
  },
  principal: {
    type: Number,
    required: true,
    min: 1
  },
  interestRate: {
    type: Number,
    required: true,
    min: 0,
    max: 50
  },
  tenureMonths: {
    type: Number,
    required: true,
    min: 1,
    max: 480
  },
  startDate: {
    type: Date,
    required: true
  },
  emiAmount: {
    type: Number,
    required: true,
    min: 1
  },
  prepaymentAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  prepaymentFrequency: {
    type: String,
    enum: ['none', 'monthly', 'quarterly', 'yearly'],
    default: 'none'
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active'
  },
  closedDate: {
    type: Date
  },
  lender: {
    type: String,
    trim: true,
    default: ''
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  }
}, { timestamps: true });

loanSchema.index({ userId: 1 });

module.exports = mongoose.model('Loan', loanSchema);
