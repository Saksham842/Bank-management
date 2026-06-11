const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  type: {
    type: String,
    enum: ['DEBIT', 'CREDIT'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    default: 'Uncategorized'
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFreq: {
    type: String,
    enum: ['daily', 'weekly', 'monthly']
  },
  nextDueDate: {
    type: Date
  },
  tags: [String],
  metadata: {
    type: Map,
    of: String
  },
  // NLP fields
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral'
  },
  nlpCategory: {
    type: String
  },
  rawText: {
    type: String
  },
  extractedFrom: {
    type: String,
    enum: ['manual', 'csv', 'nlp_text', 'nlp_receipt'],
    default: 'manual'
  }
}, { timestamps: true });

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1 });
transactionSchema.index({ description: 'text', tags: 'text' }); // full-text index for NLP search

// Method to update next due date for recurring transactions
transactionSchema.methods.updateNextDueDate = function() {
  if (!this.isRecurring || !this.recurringFreq) return;
  const current = this.nextDueDate || this.date || new Date();
  const next = new Date(current);
  if (this.recurringFreq === 'daily') {
    next.setDate(next.getDate() + 1);
  } else if (this.recurringFreq === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (this.recurringFreq === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  }
  this.nextDueDate = next;
};

module.exports = mongoose.model('Transaction', transactionSchema);
