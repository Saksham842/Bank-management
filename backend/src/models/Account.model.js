const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
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
  balance: {
    type: Number,
    required: true,
    default: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  type: {
    type: String,
    enum: ['savings', 'checking', 'business'],
    default: 'savings'
  }
}, { timestamps: true });

module.exports = mongoose.model('Account', accountSchema);
