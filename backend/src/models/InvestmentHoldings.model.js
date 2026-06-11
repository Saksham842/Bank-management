const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  sector: {
    type: String,
    default: 'Other'
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  avgBuyPrice: {
    type: Number,
    required: true,
    min: 0
  },
  currentPrice: {
    type: Number,
    default: 0
  },
  totalInvested: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'INR'
  }
}, { timestamps: true });

holdingSchema.index({ userId: 1, symbol: 1 }, { unique: true });

module.exports = mongoose.model('InvestmentHoldings', holdingSchema);
