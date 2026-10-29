const { v4: uuidv4 } = require('uuid');
const { getDbMode, readLocalDb, writeLocalDb } = require('../config/db');

// In-memory / file-backed resilient model layer with full MongoDB compatibility
class DataStore {
  // === USERS ===
  static async findUserByEmail(email) {
    const db = readLocalDb();
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  static async findUserById(id) {
    const db = readLocalDb();
    return db.users.find(u => u.id === id) || null;
  }

  static async createUser(userData) {
    const db = readLocalDb();
    const newUser = {
      id: uuidv4(),
      name: userData.name,
      email: userData.email.toLowerCase(),
      password: userData.password,
      role: userData.role || 'volunteer', // 'organizer' or 'volunteer'
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    writeLocalDb(db);
    return newUser;
  }

  // === EVENTS ===
  static async getEvents(organizerId = null) {
    const db = readLocalDb();
    let events = db.events;
    if (organizerId) {
      events = events.filter(e => e.organizerId === organizerId);
    }
    // Enrich with live counts
    return events.map(ev => {
      const tickets = db.tickets.filter(t => t.eventId === ev.id);
      const checkedIns = tickets.filter(t => t.status === 'checked_in').length;
      const conflicts = db.conflicts.filter(c => c.eventId === ev.id && c.status === 'pending_review').length;
      return {
        ...ev,
        totalTickets: tickets.length,
        checkedInCount: checkedIns,
        pendingConflicts: conflicts
      };
    });
  }

  static async getEventById(id) {
    const db = readLocalDb();
    const ev = db.events.find(e => e.id === id);
    if (!ev) return null;

    const tickets = db.tickets.filter(t => t.eventId === id);
    const checkedIns = tickets.filter(t => t.status === 'checked_in').length;
    const conflicts = db.conflicts.filter(c => c.eventId === id && c.status === 'pending_review').length;

    return {
      ...ev,
      totalTickets: tickets.length,
      checkedInCount: checkedIns,
      pendingConflicts: conflicts
    };
  }

  static async createEvent(eventData, organizerId) {
    const db = readLocalDb();
    const newEvent = {
      id: eventData.id || uuidv4(),
      title: eventData.title,
      description: eventData.description || '',
      date: eventData.date || new Date().toISOString().split('T')[0],
      venue: eventData.venue || 'Main Arena',
      organizerId,
      gates: eventData.gates && eventData.gates.length > 0 ? eventData.gates : ['Gate A - North VIP', 'Gate B - South General'],
      status: 'active',
      createdAt: new Date().toISOString()
    };
    db.events.push(newEvent);
    writeLocalDb(db);
    return newEvent;
  }

  // === TICKETS ===
  static async getTicketsByEvent(eventId) {
    const db = readLocalDb();
    return db.tickets.filter(t => t.eventId === eventId);
  }

  static async getTicketById(id) {
    const db = readLocalDb();
    return db.tickets.find(t => t.id === id || t.ticketNumber === id || t.qrPayload === id) || null;
  }

  static async createTicket(ticketData) {
    const db = readLocalDb();
    const count = db.tickets.filter(t => t.eventId === ticketData.eventId).length + 1;
    const ticketNumber = ticketData.ticketNumber || `TKT-${1000 + count}`;
    
    // Generate secure QR payload containing identification
    const qrPayload = JSON.stringify({
      tkt: ticketNumber,
      eid: ticketData.eventId,
      att: ticketData.attendeeName,
      tok: uuidv4().substring(0, 8)
    });

    const newTicket = {
      id: uuidv4(),
      ticketNumber,
      eventId: ticketData.eventId,
      attendeeName: ticketData.attendeeName,
      attendeeEmail: ticketData.attendeeEmail || '',
      tier: ticketData.tier || 'General',
      qrPayload,
      status: 'issued', // 'issued', 'checked_in', 'cancelled', 'conflict'
      firstCheckIn: null,
      checkInCount: 0,
      createdAt: new Date().toISOString()
    };

    db.tickets.push(newTicket);
    writeLocalDb(db);
    return newTicket;
  }

  static async createBatchTickets(eventId, ticketList) {
    const results = [];
    for (const item of ticketList) {
      const t = await this.createTicket({ ...item, eventId });
      results.push(t);
    }
    return results;
  }

  // === CHECK-INS & SYNC ENGINE (Slide 07 & Slide 08) ===
  /**
   * Process a batch of entries uploaded from an offline scanner device
   * Implements Idempotency (same entryId ignored) and Conflict Detection (same ticket checked in twice)
   */
  static async processSyncBatch(entries, deviceMeta = {}) {
    const db = readLocalDb();
    const results = {
      accepted: [],
      ignoredDuplicates: [],
      conflictsCreated: [],
      invalid: []
    };

    for (const entry of entries) {
      const {
        entryId, // Client-generated UUID for idempotency
        ticketNumber,
        ticketId,
        eventId,
        deviceId,
        gateId,
        volunteerName,
        volunteerId,
        scannedAt
      } = entry;

      if (!entryId || (!ticketNumber && !ticketId)) {
        results.invalid.push({ entry, reason: 'Missing entryId or ticket details' });
        continue;
      }

      // Check 1: Idempotency check (Has this exact entryId already been synced?)
      const existingEntry = db.checkIns.find(c => c.entryId === entryId);
      if (existingEntry) {
        // Idempotent: Ignore retry safely (Slide 07)
        results.ignoredDuplicates.push({
          entryId,
          ticketNumber: existingEntry.ticketNumber,
          message: 'Entry already recorded previously (idempotent ignore)'
        });
        continue;
      }

      // Find the associated ticket in database
      const ticket = db.tickets.find(t => 
        t.ticketNumber === ticketNumber || 
        t.id === ticketId || 
        t.qrPayload.includes(ticketNumber)
      );

      if (!ticket) {
        results.invalid.push({ entry, reason: 'Ticket not found in event database' });
        continue;
      }

      // Check 2: Has this ticket already been checked in by ANY gate/device?
      const priorCheckInsForTicket = db.checkIns.filter(c => c.ticketNumber === ticket.ticketNumber);

      const newCheckIn = {
        entryId,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        attendeeName: ticket.attendeeName,
        tier: ticket.tier || 'General',
        eventId: ticket.eventId,
        deviceId: deviceId || deviceMeta.deviceId || 'Unknown Device',
        gateId: gateId || 'Gate A',
        volunteerName: volunteerName || 'Gate Volunteer',
        volunteerId: volunteerId || null,
        scannedAt: scannedAt || new Date().toISOString(),
        syncedAt: new Date().toISOString(),
        offlineSync: true,
        status: priorCheckInsForTicket.length > 0 ? 'duplicate_conflict' : 'valid'
      };

      db.checkIns.push(newCheckIn);

      if (priorCheckInsForTicket.length > 0) {
        // CONFLICT DETECTED! (Slide 08: One ticket, two offline gates)
        // Two gates scanned the same ticket while isolated offline
        ticket.status = 'conflict';
        ticket.checkInCount = (ticket.checkInCount || 1) + 1;

        // Check if an open conflict already exists for this ticket
        let conflict = db.conflicts.find(c => c.ticketId === ticket.id && c.status === 'pending_review');

        if (!conflict) {
          conflict = {
            id: uuidv4(),
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            eventId: ticket.eventId,
            attendeeName: ticket.attendeeName,
            status: 'pending_review', // 'pending_review', 'resolved'
            conflictingEntries: [
              ...priorCheckInsForTicket,
              newCheckIn
            ],
            createdAt: new Date().toISOString(),
            resolutionDecision: null,
            resolutionNotes: '',
            resolvedBy: null,
            resolvedAt: null
          };
          db.conflicts.push(conflict);
        } else {
          conflict.conflictingEntries.push(newCheckIn);
        }

        results.conflictsCreated.push({
          ticketNumber: ticket.ticketNumber,
          conflictId: conflict.id,
          gate: newCheckIn.gateId,
          scannedAt: newCheckIn.scannedAt
        });
      } else {
        // Valid first-time check-in
        ticket.status = 'checked_in';
        ticket.firstCheckIn = {
          gateId: newCheckIn.gateId,
          scannedAt: newCheckIn.scannedAt,
          volunteerName: newCheckIn.volunteerName,
          deviceId: newCheckIn.deviceId
        };
        ticket.checkInCount = 1;

        results.accepted.push({
          entryId,
          ticketNumber: ticket.ticketNumber,
          attendeeName: ticket.attendeeName,
          gateId: newCheckIn.gateId
        });
      }
    }

    writeLocalDb(db);
    return results;
  }

  // === CONFLICTS MANAGEMENT (Slide 08 & Slide 12) ===
  static async getConflicts(eventId = null) {
    const db = readLocalDb();
    let list = db.conflicts;
    if (eventId) {
      list = list.filter(c => c.eventId === eventId);
    }
    // Return sorted newest first
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async resolveConflict(conflictId, { decision, notes, resolvedBy }) {
    const db = readLocalDb();
    const conflict = db.conflicts.find(c => c.id === conflictId);
    if (!conflict) return null;

    conflict.status = 'resolved';
    conflict.resolutionDecision = decision; // 'accepted_first', 'accepted_both', 'revoked_all'
    conflict.resolutionNotes = notes || '';
    conflict.resolvedBy = resolvedBy || 'Organiser';
    conflict.resolvedAt = new Date().toISOString();

    const ticket = db.tickets.find(t => t.id === conflict.ticketId);
    if (ticket) {
      if (decision === 'revoked_all') {
        ticket.status = 'cancelled';
      } else {
        ticket.status = 'checked_in';
      }
    }

    writeLocalDb(db);
    return conflict;
  }

  // === DEMO SEED DATA (Slide 12: Live Hackathon Demo) ===
  static async seedDemoEvent(organizerId) {
    const db = readLocalDb();

    // Check if demo event already exists
    let demoEvent = db.events.find(e => e.title.includes('Electric Horizon') || e.title.includes('Demo'));
    if (!demoEvent) {
      demoEvent = {
        id: 'demo-event-blackout-2026',
        title: 'Electric Horizon Music Festival 2026',
        description: 'Official 3-Day Music & Arts Festival - Blackout Offline Entry Trial',
        date: new Date().toISOString().split('T')[0],
        venue: 'Grand Arena, North Complex',
        organizerId: organizerId || 'demo-organizer',
        gates: ['Gate A - North VIP', 'Gate B - South General', 'Gate C - Fast Track'],
        status: 'active',
        createdAt: new Date().toISOString()
      };
      db.events.push(demoEvent);
    }

    // Seed 5 sample tickets as requested in Slide 12: "01 Create one event. Generate five sample QR tickets."
    const demoTickets = [
      { ticketNumber: 'TKT-1042', attendeeName: 'Rohan Sharma', attendeeEmail: 'rohan@example.com', tier: 'VIP' },
      { ticketNumber: 'TKT-1043', attendeeName: 'Priya Verma', attendeeEmail: 'priya@example.com', tier: 'General' },
      { ticketNumber: 'TKT-1044', attendeeName: 'Aarav Patel', attendeeEmail: 'aarav@example.com', tier: 'VIP' },
      { ticketNumber: 'TKT-1045', attendeeName: 'Neha Singh', attendeeEmail: 'neha@example.com', tier: 'General' },
      { ticketNumber: 'TKT-1046', attendeeName: 'Kabir Mehta', attendeeEmail: 'kabir@example.com', tier: 'Early Bird' }
    ];

    for (const dt of demoTickets) {
      if (!db.tickets.some(t => t.ticketNumber === dt.ticketNumber && t.eventId === demoEvent.id)) {
        const qrPayload = JSON.stringify({
          tkt: dt.ticketNumber,
          eid: demoEvent.id,
          att: dt.attendeeName,
          tok: `demo-token-${dt.ticketNumber}`
        });

        db.tickets.push({
          id: `tkt-id-${dt.ticketNumber}`,
          ticketNumber: dt.ticketNumber,
          eventId: demoEvent.id,
          attendeeName: dt.attendeeName,
          attendeeEmail: dt.attendeeEmail,
          tier: dt.tier,
          qrPayload,
          status: 'issued',
          firstCheckIn: null,
          checkInCount: 0,
          createdAt: new Date().toISOString()
        });
      }
    }

    writeLocalDb(db);
    return { event: demoEvent, ticketsCount: 5 };
  }
}

module.exports = DataStore;
