const mongoose = require('mongoose');

const scenarioSchema = new mongoose.Schema({
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
    enum: ['income_change', 'expense_change', 'major_purchase', 'savings_goal', 'debt_repayment', 'investment', 'custom'],
    default: 'custom'
  },
  assumptions: {
    incomeAdjustment: { type: Number, default: 0 },
    expenseAdjustment: { type: Number, default: 0 },
    oneTimeCost: { type: Number, default: 0 },
    monthlySavingsChange: { type: Number, default: 0 },
    targetAmount: { type: Number, default: 0 },
    timeframeMonths: { type: Number, default: 12 },
    expectedReturn: { type: Number, default: 8 },
    inflationRate: { type: Number, default: 6 }
  },
  results: {
    projectedBalance: { type: Number, default: 0 },
    monthsToGoal: { type: Number, default: 0 },
    probability: { type: Number, default: 0 },
    vsBaseline: { type: Number, default: 0 }
  }
}, { timestamps: true });

scenarioSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Scenario', scenarioSchema);
