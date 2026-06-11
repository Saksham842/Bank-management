const cron = require('node-cron');
const Transaction = require('../models/Transaction.model');
const Account = require('../models/Account.model');

const startCronJobs = (io) => {
  // Run every day at midnight (0 0 * * *)
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running daily checks for recurring transactions...');
    try {
      const now = new Date();
      // Find all recurring transactions where nextDueDate is past or equal to now
      const recurringTxns = await Transaction.find({
        isRecurring: true,
        nextDueDate: { $lte: now }
      });

      console.log(`[CRON] Found ${recurringTxns.length} recurring transactions to process.`);

      for (const t of recurringTxns) {
        // Create cloned transaction (without existing ID)
        const newTxnData = t.toObject();
        delete newTxnData._id;
        delete newTxnData.createdAt;
        delete newTxnData.updatedAt;

        // Set date to current
        newTxnData.date = new Date();

        const newTxn = new Transaction(newTxnData);
        await newTxn.save();

        // Advance next due date on the parent template
        t.updateNextDueDate();
        await t.save();

        // Update balance on target account
        const account = await Account.findById(t.accountId);
        if (account) {
          const change = t.type === 'DEBIT' ? -t.amount : t.amount;
          account.balance += change;
          await account.save();

          // Emit real-time Socket.io notification
          if (io) {
            io.to(t.accountId.toString()).emit('balance-updated', {
              accountId: t.accountId,
              newBalance: account.balance,
              message: `Recurring ${t.type.toLowerCase()} of ₹${t.amount} applied.`
            });
          }
        }
      }
    } catch (err) {
      console.error('[CRON] Error processing recurring transactions:', err.message);
    }
  });
};

module.exports = { startCronJobs };
