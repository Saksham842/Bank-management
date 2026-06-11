require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const app = require('./src/app');
const { startCronJobs } = require('./src/services/cron.service');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ledger_app';

const server = http.createServer(app);

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make Socket.io instance available globally in controllers
app.set('io', io);

// Handle WebSockets connection channels
io.on('connection', (socket) => {
  console.log(`[SOCKET] User connected: ${socket.id}`);

  socket.on('join-account', (accountId) => {
    if (accountId) {
      socket.join(accountId.toString());
      console.log(`[SOCKET] Socket ${socket.id} joined account room: ${accountId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET] User disconnected: ${socket.id}`);
  });
});

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB Database.');
    
    // Start Cron tasks
    startCronJobs(io);

    // Bootstrap Server
    server.listen(PORT, () => {
      console.log(`Server successfully started on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Mongoose initial connection failure:', err.message);
    console.warn('Bootstrapping server in OFFLINE MOCK mode (No Mongo connection).');
    
    // Fallback bootstrap to allow local frontend validation and dev server to run even if local mongo is off
    server.listen(PORT, () => {
      console.log(`Server successfully started on port ${PORT} (Mongo connection skipped)`);
    });
  });
