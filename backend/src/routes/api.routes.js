const express = require('express');
const router = express.Router();

const { register, login, getMe, seedDemoAccounts } = require('../controllers/auth.controller');
const { getEvents, getEventById, createEvent, downloadOfflinePackage } = require('../controllers/event.controller');
const { getTickets, createTicket, deleteTicket, bulkCreateTickets } = require('../controllers/ticket.controller');
const { syncBatch, getCheckIns } = require('../controllers/sync.controller');
const { getConflicts, resolveConflict } = require('../controllers/conflict.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

// === AUTH & DEMO SEED ===
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', verifyToken, getMe);
router.post('/auth/seed-demo', seedDemoAccounts);

// === EVENTS ===
router.get('/events', verifyToken, getEvents);
router.get('/events/:id', verifyToken, getEventById);
router.post('/events', verifyToken, requireRole('organizer'), createEvent);

// Offline Preparation: Download full ticket manifest for local IndexedDB caching
router.get('/events/:eventId/download-offline', verifyToken, downloadOfflinePackage);

// === TICKETS ===
router.get('/tickets', verifyToken, getTickets);
router.post('/tickets', verifyToken, requireRole('organizer'), createTicket);
router.delete('/tickets/:id', verifyToken, requireRole('organizer'), deleteTicket);
router.post('/tickets/bulk', verifyToken, requireRole('organizer'), bulkCreateTickets);

// === OFFLINE SYNC (Slide 07) ===
// Volunteers sync scanned check-ins batch after reconnection
router.post('/sync', verifyToken, syncBatch);
router.get('/check-ins', verifyToken, getCheckIns);

// === CONFLICT RECONCILIATION (Slide 08) ===
router.get('/conflicts', verifyToken, getConflicts);
router.post('/conflicts/:id/resolve', verifyToken, requireRole('organizer'), resolveConflict);

module.exports = router;
