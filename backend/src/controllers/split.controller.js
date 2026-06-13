const SplitGroup = require('../models/SplitGroup.model');
const SplitExpense = require('../models/SplitExpense.model');
const Settlement = require('../models/Settlement.model');

const getGroups = async (req, res) => {
  try {
    const groups = await SplitGroup.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json({ success: true, data: groups });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createGroup = async (req, res) => {
  try {
    const group = new SplitGroup({ ...req.body, userId: req.user.id });
    await group.save();
    res.status(201).json({ success: true, data: group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateGroup = async (req, res) => {
  try {
    const group = await SplitGroup.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    res.json({ success: true, data: group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    await SplitExpense.deleteMany({ groupId: req.params.id });
    await Settlement.deleteMany({ groupId: req.params.id });
    const group = await SplitGroup.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    res.json({ success: true, message: 'Group and all related data deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getExpenses = async (req, res) => {
  try {
    const expenses = await SplitExpense.find({ groupId: req.params.groupId }).sort({ date: -1 });
    res.json({ success: true, data: expenses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createExpense = async (req, res) => {
  try {
    const group = await SplitGroup.findOne({ _id: req.params.groupId, userId: req.user.id });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const { description, amount, paidBy, splitType, shares, date, category, notes } = req.body;
    const memberNames = group.members.map(m => m.name);

    if (!memberNames.includes(paidBy)) return res.status(400).json({ success: false, message: 'paidBy must be a group member' });

    let computedShares = [];
    if (splitType === 'equal' || !splitType) {
      const perPerson = amount / memberNames.length;
      computedShares = memberNames.map(name => ({ memberName: name, amount: parseFloat(perPerson.toFixed(2)), percentage: parseFloat((100 / memberNames.length).toFixed(1)) }));
    } else if (splitType === 'percentage') {
      computedShares = shares.map(s => ({ memberName: s.memberName, amount: parseFloat((amount * s.percentage / 100).toFixed(2)), percentage: s.percentage }));
    } else if (splitType === 'shares' || splitType === 'custom') {
      const totalShares = shares.reduce((sum, s) => sum + (s.shares || s.amount || 0), 0);
      computedShares = shares.map(s => {
        const shareVal = s.shares || s.amount || 0;
        return { memberName: s.memberName, amount: splitType === 'shares' ? parseFloat((amount * shareVal / totalShares).toFixed(2)) : parseFloat(shareVal.toFixed(2)), percentage: splitType === 'shares' ? parseFloat((shareVal / totalShares * 100).toFixed(1)) : parseFloat((shareVal / amount * 100).toFixed(1)) };
      });
    }

    const expense = new SplitExpense({
      groupId: req.params.groupId, userId: req.user.id,
      description, amount: parseFloat(amount), paidBy, splitType: splitType || 'equal',
      shares: computedShares, date: date || new Date(), category, notes
    });
    await expense.save();

    group.totalSpent += expense.amount;
    await group.save();

    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const expense = await SplitExpense.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    const group = await SplitGroup.findById(expense.groupId);
    if (group) { group.totalSpent = Math.max(0, group.totalSpent - expense.amount); await group.save(); }
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getBalances = async (req, res) => {
  try {
    const group = await SplitGroup.findOne({ _id: req.params.groupId, userId: req.user.id });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const expenses = await SplitExpense.find({ groupId: req.params.groupId });
    const settlements = await Settlement.find({ groupId: req.params.groupId });

    const balanceMap = {};
    group.members.forEach(m => { balanceMap[m.name] = 0; });

    for (const exp of expenses) {
      balanceMap[exp.paidBy] = (balanceMap[exp.paidBy] || 0) + exp.amount;
      for (const share of exp.shares) {
        balanceMap[share.memberName] = (balanceMap[share.memberName] || 0) - share.amount;
      }
    }

    for (const s of settlements) {
      balanceMap[s.fromMember] = (balanceMap[s.fromMember] || 0) + s.amount;
      balanceMap[s.toMember] = (balanceMap[s.toMember] || 0) - s.amount;
    }

    const balances = Object.entries(balanceMap).map(([name, net]) => ({
      name, net: Math.round(net * 100) / 100,
      owes: net < 0 ? Math.abs(net) : 0,
      owed: net > 0 ? net : 0
    }));

    const payouts = [];
    const debtors = balances.filter(b => b.net < 0).sort((a, b) => a.net - b.net);
    const creditors = balances.filter(b => b.net > 0).sort((a, b) => b.net - a.net);

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(Math.abs(debtors[i].net), creditors[j].net);
      if (pay > 0.01) payouts.push({ from: debtors[i].name, to: creditors[j].name, amount: Math.round(pay * 100) / 100 });
      debtors[i].net += pay;
      creditors[j].net -= pay;
      if (Math.abs(debtors[i].net) < 0.01) i++;
      if (Math.abs(creditors[j].net) < 0.01) j++;
    }

    res.json({ success: true, data: { balances, payouts, totalSpent: group.totalSpent, memberCount: group.members.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createSettlement = async (req, res) => {
  try {
    const { fromMember, toMember, amount, notes } = req.body;
    const group = await SplitGroup.findOne({ _id: req.params.groupId, userId: req.user.id });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const settlement = new Settlement({ groupId: req.params.groupId, userId: req.user.id, fromMember, toMember, amount: parseFloat(amount), notes });
    await settlement.save();

    const expenses = await SplitExpense.find({ groupId: req.params.groupId });
    for (const exp of expenses) {
      for (const share of exp.shares) {
        if (share.memberName === fromMember && exp.paidBy === toMember) share.settled = true;
      }
      await exp.save();
    }

    res.status(201).json({ success: true, data: settlement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getSettlements = async (req, res) => {
  try {
    const settlements = await Settlement.find({ groupId: req.params.groupId }).sort({ date: -1 });
    res.json({ success: true, data: settlements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getGroups, createGroup, updateGroup, deleteGroup, getExpenses, createExpense, deleteExpense, getBalances, createSettlement, getSettlements };
