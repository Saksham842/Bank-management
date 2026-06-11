const Transaction = require('../models/Transaction.model');
const Account = require('../models/Account.model');
const Budget = require('../models/Budget.model');
const User = require('../models/User.model');
const AuditLog = require('../models/AuditLog.model');
const Notification = require('../models/Notification.model');
const ml = require('../services/ml.client');
const { sendBudgetAlert } = require('../services/email.service');

const getTransactions = async (req, res) => {
  try {
    const { category, type, startDate, endDate, accountId } = req.query;
    const filter = { userId: req.user.id };

    if (category) filter.category = category;
    if (type) filter.type = type;
    if (accountId) filter.accountId = accountId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 });
    res.json({ success: true, data: transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTransactionStats = async (req, res) => {
  try {
    const userId = req.user.id;
    // Aggregation for monthly totals
    const monthlyStats = await Transaction.aggregate([
      { $match: { userId: new require('mongoose').Types.ObjectId(userId) } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    // Grouping by category
    const categoryStats = await Transaction.aggregate([
      { $match: { userId: new require('mongoose').Types.ObjectId(userId), type: 'DEBIT' } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        monthly: monthlyStats,
        categories: categoryStats
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createTransaction = async (req, res) => {
  try {
    const { type, amount, description, accountId, category, date, isRecurring, recurringFreq, tags } = req.body;
    const userId = req.user.id;

    // Check account
    const account = await Account.findOne({ _id: accountId, userId });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found or unauthorized.' });
    }

    let finalCategory = category;

    // Auto-categorize if not provided using ML model
    if (!finalCategory && description) {
      try {
        const catResult = await ml.categorizeTransaction({ text: description });
        finalCategory = catResult.category;
      } catch {
        finalCategory = 'Other';
      }
    }

    const transaction = new Transaction({
      userId,
      accountId,
      type,
      amount,
      description,
      date: date ? new Date(date) : new Date(),
      category: finalCategory || 'Other',
      isRecurring: isRecurring || false,
      recurringFreq,
      tags: tags || [],
      extractedFrom: req.body.extractedFrom || 'manual'
    });

    if (transaction.isRecurring) {
      transaction.updateNextDueDate();
    }

    await transaction.save();

    // Adjust account balance
    const change = type === 'DEBIT' ? -amount : amount;
    account.balance += change;
    await account.save();

    // Emit balance update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(accountId.toString()).emit('balance-updated', {
        accountId,
        newBalance: account.balance
      });
    }

    // Audit log
    await AuditLog.create({
      userId,
      action: 'CREATE_TRANSACTION',
      targetType: 'Transaction',
      targetId: transaction._id,
      details: { amount, type, category: transaction.category }
    });

    // Budget Limit Monitoring (Only on DEBIT)
    if (type === 'DEBIT') {
      const txnDate = new Date(transaction.date);
      const budgetMonth = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`;
      
      const budget = await Budget.findOne({ userId, category: transaction.category, month: budgetMonth });
      if (budget) {
        // Calculate total spent on this category this month
        const start = new Date(txnDate.getFullYear(), txnDate.getMonth(), 1);
        const end = new Date(txnDate.getFullYear(), txnDate.getMonth() + 1, 0, 23, 59, 59, 999);

        const summary = await Transaction.aggregate([
          {
            $match: {
              userId: new require('mongoose').Types.ObjectId(userId),
              category: transaction.category,
              type: 'DEBIT',
              date: { $gte: start, $lte: end }
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const spent = summary.length ? summary[0].total : 0;
        budget.spent = spent;
        await budget.save();

        const usageRatio = spent / budget.limit;
        
        if (usageRatio >= 0.8) {
          const user = await User.findById(userId);
          const percent = Math.round(usageRatio * 100);
          const message = `Budget Alert: ${transaction.category} budget of ₹${budget.limit} is at ${percent}% usage (Spent ₹${spent}).`;
          
          // Create in-app notification
          await Notification.create({
            userId,
            type: 'budget_alert',
            message,
            metadata: { budgetId: budget._id.toString(), spent: String(spent), limit: String(budget.limit) }
          });

          // Send Email alert
          if (user && user.email) {
            await sendBudgetAlert(user.email, transaction.category, budget.limit, spent);
          }
        }
      }
    }

    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const { type, amount, description, category, date, isRecurring, recurringFreq, tags } = req.body;
    const userId = req.user.id;

    const transaction = await Transaction.findOne({ _id: req.params.id, userId });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found or unauthorized.' });
    }

    const oldAmount = transaction.amount;
    const oldType = transaction.type;
    const accountId = transaction.accountId;

    // Apply changes
    transaction.type = type || transaction.type;
    transaction.amount = amount !== undefined ? amount : transaction.amount;
    transaction.description = description !== undefined ? description : transaction.description;
    transaction.category = category || transaction.category;
    transaction.date = date ? new Date(date) : transaction.date;
    transaction.isRecurring = isRecurring !== undefined ? isRecurring : transaction.isRecurring;
    transaction.recurringFreq = recurringFreq || transaction.recurringFreq;
    transaction.tags = tags || transaction.tags;

    if (transaction.isRecurring) {
      transaction.updateNextDueDate();
    }

    await transaction.save();

    // Re-calculate Account balance
    const account = await Account.findOne({ _id: accountId, userId });
    if (account) {
      // First, reverse the old amount
      const oldChange = oldType === 'DEBIT' ? -oldAmount : oldAmount;
      account.balance -= oldChange;

      // Second, apply the new amount
      const newChange = transaction.type === 'DEBIT' ? -transaction.amount : transaction.amount;
      account.balance += newChange;

      await account.save();

      // Emit balance update via Socket.io
      const io = req.app.get('io');
      if (io) {
        io.to(accountId.toString()).emit('balance-updated', {
          accountId,
          newBalance: account.balance
        });
      }
    }

    await AuditLog.create({
      userId,
      action: 'UPDATE_TRANSACTION',
      targetType: 'Transaction',
      targetId: transaction._id,
      details: { amount: transaction.amount, type: transaction.type }
    });

    res.json({ success: true, data: transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, userId });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found or unauthorized.' });
    }

    // Revert balance on Account
    const account = await Account.findOne({ _id: transaction.accountId, userId });
    if (account) {
      const change = transaction.type === 'DEBIT' ? -transaction.amount : transaction.amount;
      account.balance -= change;
      await account.save();

      // Emit balance update via Socket.io
      const io = req.app.get('io');
      if (io) {
        io.to(transaction.accountId.toString()).emit('balance-updated', {
          accountId: transaction.accountId,
          newBalance: account.balance
        });
      }
    }

    await AuditLog.create({
      userId,
      action: 'DELETE_TRANSACTION',
      targetType: 'Transaction',
      targetId: transaction._id,
      details: { amount: transaction.amount, type: transaction.type }
    });

    res.json({ success: true, message: 'Transaction deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getTransactions, getTransactionStats, createTransaction, updateTransaction, deleteTransaction };
