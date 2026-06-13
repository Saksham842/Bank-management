const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
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
  description: String,
  category: {
    type: String,
    default: 'Entertainment'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  billingCycle: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'semi-annual', 'annual'],
    default: 'monthly'
  },
  nextBillingDate: {
    type: Date,
    required: true
  },
  lastBillingDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'netbanking', 'auto-debit', 'other'],
    default: 'auto-debit'
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled', 'expired'],
    default: 'active'
  },
  reminderDays: {
    type: Number,
    default: 3
  },
  autoDetected: {
    type: Boolean,
    default: false
  },
  confidence: {
    type: Number,
    default: 1.0
  },
  linkedTransactionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  totalPaid: {
    type: Number,
    default: 0
  },
  billingHistory: [{
    amount: Number,
    date: Date,
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }
  }]
}, { timestamps: true });

subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ userId: 1, nextBillingDate: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
