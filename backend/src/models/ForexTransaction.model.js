const mongoose = require('mongoose');

const forexTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fromCurrency: {
    type: String,
    required: true,
    uppercase: true
  },
  toCurrency: {
    type: String,
    required: true,
    uppercase: true
  },
  fromAmount: {
    type: Number,
    required: true,
    min: 0
  },
  toAmount: {
    type: Number,
    required: true,
    min: 0
  },
  exchangeRate: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['conversion', 'deposit', 'withdrawal', 'transfer'],
    default: 'conversion'
  },
  date: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    trim: true
  }
}, { timestamps: true });

forexTransactionSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('ForexTransaction', forexTransactionSchema);
