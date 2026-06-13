const mongoose = require('mongoose');

const debtSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creditor: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Credit Card', 'Personal Loan', 'Home Loan', 'Car Loan', 'Education Loan', 'Medical Debt', 'Student Loan', 'Business Loan', 'Other'],
    required: true
  },
  totalBalance: {
    type: Number,
    required: true,
    min: 0
  },
  interestRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  minimumPayment: {
    type: Number,
    default: 0,
    min: 0
  },
  monthlyPayment: {
    type: Number,
    default: 0,
    min: 0
  },
  originalAmount: {
    type: Number,
    min: 0
  },
  startDate: {
    type: Date
  },
  dueDay: {
    type: Number,
    min: 1,
    max: 31
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

debtSchema.index({ userId: 1 });
debtSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Debt', debtSchema);
