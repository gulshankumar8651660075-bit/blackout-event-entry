const DataStore = require('../models/store');

/**
 * SLIDE 07: Sync without losing track
 * POST /api/sync
 * Body: {
 *   deviceId: string,
 *   gateId: string,
 *   entries: Array<CheckInRecord>
 * }
 */
const syncBatch = async (req, res) => {
  try {
    const { deviceId, gateId, entries } = req.body;

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload: "entries" array is required.'
      });
    }

    if (entries.length === 0) {
      return res.json({
        success: true,
        message: 'No entries to sync.',
        results: { accepted: [], ignoredDuplicates: [], conflictsCreated: [], invalid: [] }
      });
    }

    const deviceMeta = {
      deviceId: deviceId || req.headers['x-device-id'] || 'Unknown Device',
      gateId: gateId || 'Gate A'
    };

    console.log(`[SyncEngine] Received sync batch from ${deviceMeta.deviceId} (${deviceMeta.gateId}): ${entries.length} entries.`);

    const results = await DataStore.processSyncBatch(entries, deviceMeta);

    res.json({
      success: true,
      message: `Sync processed: ${results.accepted.length} accepted, ${results.ignoredDuplicates.length} retries ignored, ${results.conflictsCreated.length} conflicts flagged.`,
      results
    });
  } catch (err) {
    console.error('[SyncEngine] Error processing sync:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getCheckIns = async (req, res) => {
  try {
    const { eventId } = req.query;
    const db = require('../config/db').readLocalDb();
    let checkIns = db.checkIns || [];
    if (eventId) {
      const filtered = checkIns.filter(c => c.eventId === eventId);
      if (filtered.length > 0) {
        checkIns = filtered;
      }
    }

    // Enrich check-in entries with attendee name and tier from tickets manifest
    const tickets = db.tickets || [];
    checkIns = checkIns.map(ci => {
      const t = tickets.find(ticket => ticket.ticketNumber === ci.ticketNumber || ticket.id === ci.ticketId);
      return {
        ...ci,
        attendeeName: ci.attendeeName || t?.attendeeName || 'Attendee',
        tier: ci.tier || t?.tier || 'General'
      };
    });

    res.json({ success: true, count: checkIns.length, checkIns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    const db = require('../config/db').readLocalDb();
    const idx = (db.checkIns || []).findIndex(c => c.entryId === id || c.id === id || c.ticketNumber === id);
    if (idx !== -1) {
      const removed = db.checkIns.splice(idx, 1)[0];
      // Reset ticket status if no more checkIns
      const ticket = (db.tickets || []).find(t => t.ticketNumber === removed.ticketNumber || t.id === removed.ticketId);
      if (ticket) {
        const remaining = (db.checkIns || []).filter(c => c.ticketNumber === ticket.ticketNumber);
        if (remaining.length === 0) {
          ticket.status = 'issued';
          ticket.firstCheckIn = null;
          ticket.checkInCount = 0;
        }
      }
      require('../config/db').writeLocalDb(db);
      return res.json({ success: true, message: 'Check-in entry removed successfully' });
    }
    res.status(404).json({ success: false, message: 'Check-in not found' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const clearCheckIns = async (req, res) => {
  try {
    const db = require('../config/db').readLocalDb();
    db.checkIns = [];
    db.conflicts = [];
    // Reset all tickets status
    (db.tickets || []).forEach(t => {
      t.status = 'issued';
      t.firstCheckIn = null;
      t.checkInCount = 0;
    });
    require('../config/db').writeLocalDb(db);
    res.json({ success: true, message: 'All check-in history cleared successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  syncBatch,
  getCheckIns,
  deleteCheckIn,
  clearCheckIns
};
