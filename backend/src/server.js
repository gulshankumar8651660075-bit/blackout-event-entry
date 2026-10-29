const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { connectDB, getDbMode } = require('./config/db');
const apiRoutes = require('./routes/api.routes');
const DataStore = require('./models/store');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database (MongoDB or embedded fallback)
connectDB().then(async () => {
  // Auto-seed initial demo accounts and event if not present
  try {
    let org = await DataStore.findUserByEmail('organizer@blackout.io');
    if (!org) {
      const hash = await bcrypt.hash('password123', 10);
      org = await DataStore.createUser({
        name: 'Gulshan (Lead Organiser)',
        email: 'organizer@blackout.io',
        password: hash,
        role: 'organizer'
      });
      console.log('👤 [AutoSeed] Created Lead Organiser account: organizer@blackout.io');
    }

    let vol = await DataStore.findUserByEmail('volunteer@blackout.io');
    if (!vol) {
      const hash = await bcrypt.hash('password123', 10);
      vol = await DataStore.createUser({
        name: 'Alex (Gate Volunteer)',
        email: 'volunteer@blackout.io',
        password: hash,
        role: 'volunteer'
      });
      console.log('👤 [AutoSeed] Created Gate Volunteer account: volunteer@blackout.io');
    }

    await DataStore.seedDemoEvent(org.id);
    console.log('🎫 [AutoSeed] Seeded Electric Horizon Festival with Slide 12 sample tickets.');
  } catch (err) {
    console.warn('Auto-seed warning:', err.message);
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// API Routes
app.use('/api', apiRoutes);

// Health check & status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'BLACKOUT Event Entry Offline-First Core',
    databaseMode: getDbMode(),
    timestamp: new Date().toISOString()
  });
});

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to BLACKOUT API - Event entry that keeps working when the internet stops',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      events: '/api/events',
      tickets: '/api/tickets',
      sync: '/api/sync',
      conflicts: '/api/conflicts'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[BLACKOUT Server Error]:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// If not running in Vercel serverless environment, start standalone HTTP server
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 BLACKOUT Backend Engine listening on http://localhost:${PORT}`);
    console.log(`📡 Storage Engine: ${getDbMode()}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
