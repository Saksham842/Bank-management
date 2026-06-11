const mongoose = require('mongoose');

const investmentTxSchema = new mongoose.Schema({
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
    required: true
  },
  type: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  notes: String,
  platform: {
    type: String,
    default: 'Manual'
  }
}, { timestamps: true });

investmentTxSchema.index({ userId: 1, symbol: 1 });
investmentTxSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('InvestmentTransaction', investmentTxSchema);
