const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Unified storage layer: Checks for MongoDB, falls back to resilient local file/memory store.
// Handles Vercel / serverless environment where root filesystem is read-only.
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const DATA_DIR = isServerless 
  ? path.join('/tmp', 'blackout_data')
  : path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'blackout_store.json');

// Ensure data dir exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create DATA_DIR:', e.message);
}

let dbMode = 'local'; // 'mongodb' or 'local'

// In-memory fallback if file IO fails
let memoryData = {
  users: [],
  events: [],
  tickets: [],
  checkIns: [],
  conflicts: []
};

function readLocalDb() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      writeLocalDb(memoryData);
      return { ...memoryData };
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    memoryData = parsed;
    return parsed;
  } catch (err) {
    return { ...memoryData };
  }
}

function writeLocalDb(data) {
  memoryData = data;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // If running in restricted serverless environment, memoryData stays valid in memory
  }
}

let isConnecting = false;
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  
  // If MongoDB URI is explicitly provided, try connecting to cloud MongoDB Atlas
  if (uri && uri.startsWith('mongodb')) {
    try {
      if (mongoose.connection.readyState >= 1) {
        dbMode = 'mongodb';
        return;
      }
      console.log(`[Database] Attempting connection to MongoDB Atlas...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
      });
      dbMode = 'mongodb';
      console.log('✅ [Database] Connected successfully to MongoDB Atlas (24/7 Persistent Storage)!');
      return;
    } catch (error) {
      console.log('⚠️ [Database] MongoDB Atlas connection error:', error.message);
    }
  }

  dbMode = 'local';
  console.log(`📁 [Database] Resilient Document Store active at: ${DATA_FILE}`);
  if (!fs.existsSync(DATA_FILE)) {
    writeLocalDb(memoryData);
  }
};

const getDbMode = () => dbMode;

module.exports = {
  connectDB,
  getDbMode,
  readLocalDb,
  writeLocalDb
};
