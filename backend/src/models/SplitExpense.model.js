const mongoose = require('mongoose');

const splitExpenseSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SplitGroup',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paidBy: {
    type: String,
    required: true,
    trim: true
  },
  splitType: {
    type: String,
    enum: ['equal', 'percentage', 'shares', 'custom'],
    default: 'equal'
  },
  shares: [{
    memberName: { type: String, required: true },
    amount: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    settled: { type: Boolean, default: false }
  }],
  date: {
    type: Date,
    default: Date.now
  },
  category: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

splitExpenseSchema.index({ groupId: 1, date: -1 });

module.exports = mongoose.model('SplitExpense', splitExpenseSchema);
