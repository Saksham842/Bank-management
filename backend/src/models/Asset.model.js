const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
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
    enum: ['cash', 'bank', 'investment', 'property', 'vehicle', 'crypto', 'valuables', 'business', 'other'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  acquisitionValue: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  acquisitionDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  growthRate: {
    type: Number,
    default: 0
  },
  liquid: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const netWorthSnapshotSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  totalAssets: { type: Number, default: 0 },
  totalLiabilities: { type: Number, default: 0 },
  netWorth: { type: Number, default: 0 },
  breakdown: {
    cash: Number, bank: Number, investment: Number,
    property: Number, vehicle: Number, crypto: Number,
    valuables: Number, business: Number, other: Number
  },
  liabilities: {
    loans: Number, creditCards: Number, mortgage: Number, other: Number
  }
}, { timestamps: true });

netWorthSnapshotSchema.index({ userId: 1, date: -1 });
assetSchema.index({ userId: 1, type: 1 });

module.exports = {
  Asset: mongoose.model('Asset', assetSchema),
  NetWorthSnapshot: mongoose.model('NetWorthSnapshot', netWorthSnapshotSchema)
};
