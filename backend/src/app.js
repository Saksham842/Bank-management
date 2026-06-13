const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth.routes');
const accountRoutes = require('./routes/accounts.routes');
const txnRoutes = require('./routes/transactions.routes');
const budgetRoutes = require('./routes/budgets.routes');
const recurringRoutes = require('./routes/recurring.routes');
const aiRoutes = require('./routes/ai.routes');
const nlpRoutes = require('./routes/nlp.routes');
const reportRoutes = require('./routes/reports.routes');
const retirementRoutes = require('./routes/retirement.routes');

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    // Allow any local development origin (localhost or 127.0.0.1 with any port)
    const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (isLocal || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Request logger middleware for debugging
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} - IP: ${req.ip} - Body:`, req.body);
  const oldSend = res.send;
  res.send = function(data) {
    console.log(`[RESPONSE] ${req.method} ${req.url} - Status: ${res.statusCode}`);
    return oldSend.apply(res, arguments);
  };
  next();
});

// Wire standard API routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', txnRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/nlp', nlpRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/retirement', retirementRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date() });
});

module.exports = app;
