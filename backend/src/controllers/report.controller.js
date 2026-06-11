const Transaction = require('../models/Transaction.model');
const Account = require('../models/Account.model');
const User = require('../models/User.model');
const { exportToCSV, exportToPDF } = require('../services/export.service');

const exportReport = async (req, res) => {
  try {
    const { format, accountId } = req.query;
    const userId = req.user.id;

    const filter = { userId };
    if (accountId) filter.accountId = accountId;

    const transactions = await Transaction.find(filter).sort({ date: 1 });
    if (!transactions || transactions.length === 0) {
      return res.status(400).json({ success: false, message: 'No transactions found to export.' });
    }

    if (format === 'csv') {
      const buffer = exportToCSV(transactions);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=transactions.xlsx');
      return res.send(buffer);
    } else if (format === 'pdf') {
      const user = await User.findById(userId);
      const userName = user ? user.email.split('@')[0] : 'User';
      const buffer = await exportToPDF(transactions, userName);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=financial_statement.pdf');
      return res.send(buffer);
    } else {
      res.status(400).json({ success: false, message: 'Invalid format requested. Use csv or pdf.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMonthlyReport = async (req, res) => {
  try {
    const userId = req.user.id;

    // Last 6 months aggregated income vs expense
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const data = await Transaction.aggregate([
      {
        $match: {
          userId: new require('mongoose').Types.ObjectId(userId),
          date: { $gte: sixMonthsAgo }
        }
      },
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
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format results into a chronological array: [{ month: 'Jan', income: 5000, expense: 2000, balance: 3000 }]
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const map = {};

    data.forEach(item => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!map[key]) {
        map[key] = {
          month: `${MONTHS[item._id.month - 1]} ${String(item._id.year).substring(2)}`,
          income: 0,
          expense: 0,
          balance: 0
        };
      }
      if (item._id.type === 'CREDIT') {
        map[key].income += item.total;
      } else {
        map[key].expense += item.total;
      }
      map[key].balance = map[key].income - map[key].expense;
    });

    const formattedReport = Object.keys(map)
      .sort()
      .map(k => map[k]);

    res.json({ success: true, data: formattedReport });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { exportReport, getMonthlyReport };
