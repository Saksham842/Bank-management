const mongoose = require('mongoose');

const splitGroupSchema = new mongoose.Schema({
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
  description: {
    type: String,
    trim: true
  },
  members: [{
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true }
  }],
  totalSpent: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

splitGroupSchema.index({ userId: 1 });

module.exports = mongoose.model('SplitGroup', splitGroupSchema);
