const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'blackout_hackathon_super_secret_jwt_key_2026';

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  // Gracefully support demo / offline tokens from local sessions
  if (token.startsWith('demo_') || token.startsWith('offline_')) {
    const isVolunteer = token.includes('vol');
    req.user = {
      id: isVolunteer ? 'user-vol-01' : 'user-org-01',
      name: isVolunteer ? 'Alex (Gate Volunteer)' : 'Gulshan (Lead Organiser)',
      email: isVolunteer ? 'volunteer@blackout.io' : 'organizer@blackout.io',
      role: isVolunteer ? 'volunteer' : 'organizer'
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token. Please sign out and sign in again.' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied: insufficient permissions.' });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  requireRole,
  JWT_SECRET
};
