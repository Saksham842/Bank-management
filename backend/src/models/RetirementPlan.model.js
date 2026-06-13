const mongoose = require('mongoose');

const retirementPlanSchema = new mongoose.Schema({
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
  targetCorpus: {
    type: Number,
    required: true,
    min: 0
  },
  currentAge: {
    type: Number,
    required: true,
    min: 18,
    max: 80
  },
  retirementAge: {
    type: Number,
    required: true,
    min: 30,
    max: 80
  },
  lifeExpectancy: {
    type: Number,
    default: 85,
    min: 60,
    max: 120
  },
  currentSavings: {
    type: Number,
    default: 0,
    min: 0
  },
  monthlyContribution: {
    type: Number,
    default: 0,
    min: 0
  },
  riskProfile: {
    type: String,
    enum: ['conservative', 'moderate', 'aggressive'],
    default: 'moderate'
  },
  expectedReturnRate: {
    type: Number,
    default: 10,
    min: 1,
    max: 30
  },
  inflationRate: {
    type: Number,
    default: 6,
    min: 0,
    max: 20
  },
  drawdownRate: {
    type: Number,
    default: 4,
    min: 1,
    max: 15
  },
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

retirementPlanSchema.index({ userId: 1 }, { unique: false });

module.exports = mongoose.model('RetirementPlan', retirementPlanSchema);
