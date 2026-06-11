const Account = require('../models/Account.model');
const AuditLog = require('../models/AuditLog.model');

const getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.user.id });
    res.json({ success: true, data: accounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createAccount = async (req, res) => {
  try {
    const { name, balance, currency, type } = req.body;
    const account = new Account({
      userId: req.user.id,
      name,
      balance: balance || 0,
      currency: currency || 'INR',
      type: type || 'savings'
    });
    await account.save();

    await AuditLog.create({
      userId: req.user.id,
      action: 'CREATE_ACCOUNT',
      targetType: 'Account',
      targetId: account._id,
      details: { name, balance, currency, type }
    });

    res.status(201).json({ success: true, data: account });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAccountById = async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, userId: req.user.id });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found or unauthorized.' });
    }
    res.json({ success: true, data: account });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateAccount = async (req, res) => {
  try {
    const { name, currency, type } = req.body;
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { name, currency, type },
      { new: true }
    );
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found or unauthorized.' });
    }

    await AuditLog.create({
      userId: req.user.id,
      action: 'UPDATE_ACCOUNT',
      targetType: 'Account',
      targetId: account._id,
      details: { name, currency, type }
    });

    res.json({ success: true, data: account });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const account = await Account.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found or unauthorized.' });
    }

    await AuditLog.create({
      userId: req.user.id,
      action: 'DELETE_ACCOUNT',
      targetType: 'Account',
      targetId: account._id,
      details: { name: account.name }
    });

    res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAccounts, createAccount, getAccountById, updateAccount, deleteAccount };
