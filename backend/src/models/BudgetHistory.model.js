const mongoose = require('mongoose');

const budgetHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: String,
    required: true
  },
  snapshots: [{
    category: String,
    limit: Number,
    spent: Number,
    updatedAt: { type: Date, default: Date.now }
  }],
  totalBudgeted: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 }
}, { timestamps: true });

budgetHistorySchema.index({ userId: 1, month: -1 });

module.exports = mongoose.model('BudgetHistory', budgetHistorySchema);
