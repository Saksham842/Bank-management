require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ledger_app';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const db = mongoose.connection.db;
    if (!db) {
      console.error('Failed to get database instance.');
      process.exit(1);
    }

    const usersCollection = db.collection('users');
    const transactionsCollection = db.collection('transactions');
    const goalsCollection = db.collection('goals');

    // Clean existing data
    await usersCollection.deleteMany({ email: 'test@ledgerpro.com' });
    await transactionsCollection.deleteMany({ userId: 'test-user-id' });
    await goalsCollection.deleteMany({ userId: 'test-user-id' });

    // Create test user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('test123', salt);
    const testUser = {
      email: 'test@ledgerpro.com',
      password: hashedPassword,
      name: 'Test User',
      income: 45000,
      currency: '₹',
      onboardingDone: true,
      twoFactorEnabled: false,
      twoFactorSecret: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const userResult = await usersCollection.insertOne(testUser);
    const userId = userResult.insertedId.toString();
    console.log(`Test user created with ID: ${userId}`);

    // Seed transactions (90 days of expense data + income)
    const today = new Date();
    const transactions = [];

    // Salary credits (3 months)
    for (let i = 0; i < 3; i++) {
      const salaryDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      transactions.push({
        userId,
        amount: 45000,
        merchant: 'HDFC Corporate Salary',
        category: 'Income',
        type: 'income',
        date: salaryDate.toISOString().split('T')[0],
        notes: 'Monthly payroll credit',
        version: 1,
        auditTrail: [],
        createdAt: new Date()
      });
    }

    // Regular expenses over last 90 days
    for (let i = 90; i >= 0; i--) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() - i);
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().split('T')[0];

      if (currentDate.getDate() === 1) continue;

      // Zomato: 3-4x per week
      if ([0, 3, 5, 6].includes(dayOfWeek) && Math.random() > 0.3) {
        transactions.push({
          userId, amount: Math.floor(Math.random() * 401) + 200,
          merchant: 'Zomato Food Delivery', category: 'Food', type: 'expense',
          date: dateStr, notes: 'Lunch delivery', version: 1, auditTrail: [], createdAt: new Date()
        });
      }

      // Uber: 2x per week
      if ([1, 4].includes(dayOfWeek) && Math.random() > 0.2) {
        transactions.push({
          userId, amount: Math.floor(Math.random() * 251) + 150,
          merchant: 'Uber Ride', category: 'Transport', type: 'expense',
          date: dateStr, notes: 'Commute to office', version: 1, auditTrail: [], createdAt: new Date()
        });
      }

      // Grocery: 4x per month (Saturdays)
      if (dayOfWeek === 6 && Math.random() > 0.1) {
        transactions.push({
          userId, amount: Math.floor(Math.random() * 3001) + 2000,
          merchant: 'Reliance Smart Supermarket', category: 'Food', type: 'expense',
          date: dateStr, notes: 'Monthly staples & groceries', version: 1, auditTrail: [], createdAt: new Date()
        });
      }

      // Petrol: 2x per month
      if (currentDate.getDate() === 7 || currentDate.getDate() === 21) {
        transactions.push({
          userId, amount: Math.floor(Math.random() * 1001) + 500,
          merchant: 'HP Fuel Station', category: 'Transport', type: 'expense',
          date: dateStr, notes: 'Car refuel', version: 1, auditTrail: [], createdAt: new Date()
        });
      }

      // Amazon: 2x per month
      if (currentDate.getDate() === 10 || currentDate.getDate() === 22) {
        transactions.push({
          userId, amount: Math.floor(Math.random() * 2501) + 500,
          merchant: 'Amazon Marketplace', category: 'Shopping', type: 'expense',
          date: dateStr, notes: 'Utility orders', version: 1, auditTrail: [], createdAt: new Date()
        });
      }

      // Netflix: 5th of each month
      if (currentDate.getDate() === 5) {
        transactions.push({
          userId, amount: 649,
          merchant: 'Netflix Subscription', category: 'Entertainment', type: 'expense',
          date: dateStr, notes: 'Premium plan', version: 1, auditTrail: [], createdAt: new Date()
        });
      }

      // Electricity: 15th each month
      if (currentDate.getDate() === 15) {
        transactions.push({
          userId, amount: 1200,
          merchant: 'State Electricity Board', category: 'Bills', type: 'expense',
          date: dateStr, notes: 'Power bill', version: 1, auditTrail: [], createdAt: new Date()
        });
      }

      // Jio Recharge: 18th each month
      if (currentDate.getDate() === 18) {
        transactions.push({
          userId, amount: 239,
          merchant: 'Jio Mobile Recharge', category: 'Bills', type: 'expense',
          date: dateStr, notes: 'Prepaid phone plan', version: 1, auditTrail: [], createdAt: new Date()
        });
      }

      // Apollo Pharmacy: 25th each month
      if (currentDate.getDate() === 25) {
        transactions.push({
          userId, amount: Math.floor(Math.random() * 601) + 200,
          merchant: 'Apollo Pharmacy', category: 'Health', type: 'expense',
          date: dateStr, notes: 'Monthly vitamins & meds', version: 1, auditTrail: [], createdAt: new Date()
        });
      }
    }

    // Anomaly transactions
    const date15DaysAgo = new Date(today);
    date15DaysAgo.setDate(today.getDate() - 15);
    const date45DaysAgo = new Date(today);
    date45DaysAgo.setDate(today.getDate() - 45);

    transactions.push({
      userId, amount: 8500,
      merchant: 'Grand Hyatt Luxury Dinner', category: 'Food', type: 'expense',
      date: date15DaysAgo.toISOString().split('T')[0],
      notes: 'Family dinner celebration',
      version: 1, auditTrail: [], createdAt: new Date()
    });

    transactions.push({
      userId, amount: 24999,
      merchant: 'Amazon Electronics Store', category: 'Shopping', type: 'expense',
      date: date45DaysAgo.toISOString().split('T')[0],
      notes: 'Office monitor upgrade',
      version: 1, auditTrail: [], createdAt: new Date()
    });

    if (transactions.length > 0) {
      await transactionsCollection.insertMany(transactions);
    }
    console.log(`Seeded ${transactions.length} transactions.`);

    // Seed goals
    const goals = [
      {
        userId,
        name: 'Emergency Fund',
        emoji: '🚨',
        targetAmount: 50000,
        savedAmount: 12000,
        targetDate: new Date(today.getFullYear(), today.getMonth() + 6, today.getDate()).toISOString().split('T')[0],
        monthlyContribution: 5000,
        monteCarloProbability: 78,
        contributions: [
          { amount: 6000, date: new Date(today.getTime() - 60 * 86400000).toISOString().split('T')[0] },
          { amount: 6000, date: new Date(today.getTime() - 30 * 86400000).toISOString().split('T')[0] }
        ],
        createdAt: new Date()
      },
      {
        userId,
        name: 'New Laptop',
        emoji: '💻',
        targetAmount: 80000,
        savedAmount: 5000,
        targetDate: new Date(today.getFullYear(), today.getMonth() + 8, today.getDate()).toISOString().split('T')[0],
        monthlyContribution: 8000,
        monteCarloProbability: 45,
        contributions: [
          { amount: 2500, date: new Date(today.getTime() - 40 * 86400000).toISOString().split('T')[0] },
          { amount: 2500, date: new Date(today.getTime() - 10 * 86400000).toISOString().split('T')[0] }
        ],
        createdAt: new Date()
      }
    ];

    if (goals.length > 0) {
      await goalsCollection.insertMany(goals);
    }
    console.log(`Seeded ${goals.length} goals.`);

    console.log('\n========================================');
    console.log('  TEST USER CREDENTIALS');
    console.log('========================================');
    console.log(`  Email:    test@ledgerpro.com`);
    console.log(`  Password: test123`);
    console.log('========================================\n');

    await mongoose.disconnect();
    console.log('Seed complete. Disconnected from MongoDB.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
