const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['budget_alert', 'system', 'recurring'],
    default: 'system'
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Map,
    of: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
