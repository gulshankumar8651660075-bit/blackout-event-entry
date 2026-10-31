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
      checkIns = checkIns.filter(c => c.eventId === eventId);
    } else if (req.user?.role === 'organizer') {
      const myEvents = await DataStore.getEvents(req.user.id);
      const myEventIds = myEvents.map(e => e.id);
      checkIns = checkIns.filter(c => myEventIds.includes(c.eventId));
    }

    // Enrich check-in entries with attendee name, phone, email, and tier from tickets manifest
    const tickets = db.tickets || [];
    checkIns = checkIns.map(ci => {
      const t = tickets.find(ticket => 
        (ticket.ticketNumber && ci.ticketNumber && ticket.ticketNumber.toUpperCase() === ci.ticketNumber.toUpperCase()) ||
        (ticket.id && ci.ticketId && ticket.id === ci.ticketId)
      );
      const attendeeName = (ci.attendeeName && ci.attendeeName !== 'Attendee') ? ci.attendeeName : (t?.attendeeName || ci.attendeeName || 'Attendee');
      const phone = (ci.phone && ci.phone !== '-' && ci.phone.trim() !== '') ? ci.phone : (t?.attendeePhone || t?.phone || '');
      const email = (ci.email && ci.email !== '-' && ci.email.trim() !== '') ? ci.email : (t?.attendeeEmail || t?.email || '');
      const idNote = (ci.idNote && ci.idNote !== '-' && ci.idNote.trim() !== '') ? ci.idNote : (t?.idNote || t?.note || '');
      const tier = ci.tier || t?.tier || 'VIP Access';

      return {
        ...ci,
        attendeeName,
        phone,
        email,
        idNote,
        tier
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
    const searchKey = String(id || '').trim().toUpperCase();

    // 1. Remove all matching checkIns
    const beforeCount = (db.checkIns || []).length;
    db.checkIns = (db.checkIns || []).filter(c => {
      const matchesEntryId = c.entryId && c.entryId.toUpperCase() === searchKey;
      const matchesTicketNum = c.ticketNumber && c.ticketNumber.toUpperCase() === searchKey;
      const matchesId = c.id && c.id.toUpperCase() === searchKey;
      return !matchesEntryId && !matchesTicketNum && !matchesId;
    });

    // 2. Remove matching conflicts
    db.conflicts = (db.conflicts || []).filter(c => {
      const matchesTicket = c.ticketNumber && c.ticketNumber.toUpperCase() === searchKey;
      const matchesId = c.id && c.id.toUpperCase() === searchKey;
      return !matchesTicket && !matchesId;
    });

    // 3. Reset ticket status in db.tickets
    (db.tickets || []).forEach(t => {
      if (
        (t.ticketNumber && t.ticketNumber.toUpperCase() === searchKey) ||
        (t.id && t.id.toUpperCase() === searchKey)
      ) {
        t.status = 'issued';
        t.firstCheckIn = null;
        t.checkInCount = 0;
      }
    });

    require('../config/db').writeLocalDb(db);
    return res.json({ 
      success: true, 
      message: 'Check-in entry removed successfully',
      removedCount: beforeCount - db.checkIns.length 
    });
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
