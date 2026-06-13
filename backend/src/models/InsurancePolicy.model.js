const mongoose = require('mongoose');

const insurancePolicySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  policyType: {
    type: String,
    enum: ['Life', 'Term', 'Health', 'Motor', 'Home', 'Travel', 'Critical Illness', 'Disability', 'Annuity', 'Other'],
    required: true
  },
  policyName: {
    type: String,
    required: true,
    trim: true
  },
  policyNumber: {
    type: String,
    trim: true
  },
  provider: {
    type: String,
    required: true,
    trim: true
  },
  sumAssured: {
    type: Number,
    required: true,
    min: 0
  },
  premium: {
    type: Number,
    required: true,
    min: 0
  },
  premiumFrequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time'],
    default: 'yearly'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  nextDueDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'lapsed', 'claimed', 'cancelled'],
    default: 'active'
  },
  nominees: [{
    name: String,
    relation: String,
    share: { type: Number, min: 0, max: 100 }
  }],
  beneficiaries: [{
    name: String,
    relation: String,
    share: { type: Number, min: 0, max: 100 }
  }],
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

insurancePolicySchema.index({ userId: 1, status: 1 });
insurancePolicySchema.index({ userId: 1, nextDueDate: 1 });

module.exports = mongoose.model('InsurancePolicy', insurancePolicySchema);
