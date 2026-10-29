const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const DataStore = require('../models/store');
const { JWT_SECRET } = require('../middleware/auth');

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const existing = await DataStore.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await DataStore.createUser({
      name,
      email,
      password: hashedPassword,
      role: role || 'volunteer'
    });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await DataStore.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await DataStore.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const seedDemoAccounts = async (req, res) => {
  try {
    // Check or create Organizer
    let org = await DataStore.findUserByEmail('organizer@blackout.io');
    if (!org) {
      const hash = await bcrypt.hash('password123', 10);
      org = await DataStore.createUser({
        name: 'Gulshan (Lead Organiser)',
        email: 'organizer@blackout.io',
        password: hash,
        role: 'organizer'
      });
    }

    // Check or create Volunteer
    let vol = await DataStore.findUserByEmail('volunteer@blackout.io');
    if (!vol) {
      const hash = await bcrypt.hash('password123', 10);
      vol = await DataStore.createUser({
        name: 'Alex (Gate Volunteer)',
        email: 'volunteer@blackout.io',
        password: hash,
        role: 'volunteer'
      });
    }

    // Seed demo event and sample tickets (Slide 12)
    const demoData = await DataStore.seedDemoEvent(org.id);

    res.json({
      success: true,
      message: 'Demo accounts and demo festival event seeded successfully!',
      accounts: [
        { email: 'organizer@blackout.io', password: 'password123', role: 'organizer' },
        { email: 'volunteer@blackout.io', password: 'password123', role: 'volunteer' }
      ],
      event: demoData.event,
      ticketsCount: demoData.ticketsCount
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  seedDemoAccounts
};
