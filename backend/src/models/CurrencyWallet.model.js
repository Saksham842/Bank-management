const mongoose = require('mongoose');

const currencyWalletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  accountName: {
    type: String,
    trim: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

currencyWalletSchema.index({ userId: 1, currency: 1 }, { unique: true });

module.exports = mongoose.model('CurrencyWallet', currencyWalletSchema);
