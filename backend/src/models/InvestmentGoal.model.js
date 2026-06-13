const mongoose = require('mongoose');

const investmentGoalSchema = new mongoose.Schema({
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
  category: {
    type: String,
    enum: ['Retirement', 'Education', 'Home', 'Marriage', 'Travel', 'Emergency', 'Wealth', 'Vehicle', 'Other'],
    default: 'Wealth'
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 0
  },
  targetDate: {
    type: Date,
    required: true
  },
  currentSavings: {
    type: Number,
    default: 0,
    min: 0
  },
  monthlySIP: {
    type: Number,
    default: 0,
    min: 0
  },
  expectedReturnRate: {
    type: Number,
    default: 12,
    min: 1,
    max: 30
  },
  riskProfile: {
    type: String,
    enum: ['conservative', 'moderate', 'aggressive'],
    default: 'moderate'
  },
  inflationRate: {
    type: Number,
    default: 6,
    min: 0,
    max: 20
  },
  stepUpPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 50
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

investmentGoalSchema.index({ userId: 1 });

module.exports = mongoose.model('InvestmentGoal', investmentGoalSchema);
