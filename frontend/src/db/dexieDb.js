import Dexie from 'dexie';

// Initialize Blackout Offline IndexedDB
export const db = new Dexie('BlackoutOfflineDB');

db.version(1).stores({
  // Active event metadata downloaded to device
  eventMeta: 'id, title, downloadedAt',
  
  // Local tickets list used for offline instant lookup (Slide 03, 06)
  localTickets: 'id, ticketNumber, eventId, attendeeName, status, locallyScanned',
  
  // Scans queued locally while offline waiting for reconnection sync (Slide 03, 07)
  pendingScans: 'entryId, ticketNumber, eventId, deviceId, gateId, scannedAt, syncStatus',

  // Local log of all scans on this device for the volunteer's display
  scanHistory: '++id, entryId, ticketNumber, attendeeName, status, scannedAt, gateId'
});

export const DEFAULT_DEMO_EVENT = {
  id: 'demo-event-blackout-2026',
  title: 'Electric Horizon Music Festival 2026',
  venue: 'Grand Arena, North Complex',
  date: new Date().toISOString().split('T')[0],
  gates: ['Gate A', 'Gate B', 'Gate C']
};

export const DEFAULT_DEMO_TICKETS = [
  { id: 'tkt-id-TKT-1042', ticketNumber: 'TKT-1042', eventId: 'demo-event-blackout-2026', attendeeName: 'Rohan Sharma', attendeeEmail: 'rohan@example.com', tier: 'VIP', status: 'issued', locallyScanned: false, localScanCount: 0 },
  { id: 'tkt-id-TKT-1043', ticketNumber: 'TKT-1043', eventId: 'demo-event-blackout-2026', attendeeName: 'Priya Verma', attendeeEmail: 'priya@example.com', tier: 'General', status: 'issued', locallyScanned: false, localScanCount: 0 },
  { id: 'tkt-id-TKT-1044', ticketNumber: 'TKT-1044', eventId: 'demo-event-blackout-2026', attendeeName: 'Aarav Patel', attendeeEmail: 'aarav@example.com', tier: 'VIP', status: 'issued', locallyScanned: false, localScanCount: 0 },
  { id: 'tkt-id-TKT-1045', ticketNumber: 'TKT-1045', eventId: 'demo-event-blackout-2026', attendeeName: 'Neha Singh', attendeeEmail: 'neha@example.com', tier: 'General', status: 'issued', locallyScanned: false, localScanCount: 0 },
  { id: 'tkt-id-TKT-1046', ticketNumber: 'TKT-1046', eventId: 'demo-event-blackout-2026', attendeeName: 'Kabir Mehta', attendeeEmail: 'kabir@example.com', tier: 'Early Bird', status: 'issued', locallyScanned: false, localScanCount: 0 }
];

// Helper functions for IndexedDB operations
export const offlineDbService = {
  // Ensure local DB has baseline data so scanning NEVER fails out-of-the-box
  async ensureBaselineData() {
    try {
      const count = await db.localTickets.count();
      if (count === 0) {
        console.log('⚡ [Dexie.js] Pre-populating baseline offline tickets...');
        await this.saveEventOfflinePackage(DEFAULT_DEMO_EVENT, DEFAULT_DEMO_TICKETS);
      }
    } catch (e) {
      console.warn('Baseline init error:', e);
    }
  },

  // Save downloaded event & tickets into IndexedDB
  async saveEventOfflinePackage(eventData, tickets) {
    await db.transaction('rw', db.eventMeta, db.localTickets, async () => {
      await db.eventMeta.clear();
      await db.localTickets.clear();

      await db.eventMeta.put({
        ...eventData,
        downloadedAt: new Date().toISOString(),
        totalTickets: tickets.length
      });

      const formattedTickets = tickets.map(t => ({
        ...t,
        locallyScanned: false,
        localScanCount: 0
      }));

      await db.localTickets.bulkPut(formattedTickets);
    });
  },

  // Get active cached event
  async getCachedEvent() {
    await this.ensureBaselineData();
    const events = await db.eventMeta.toArray();
    return events.length > 0 ? events[0] : DEFAULT_DEMO_EVENT;
  },

  // Check local ticket count
  async getCachedTicketsCount() {
    await this.ensureBaselineData();
    return await db.localTickets.count();
  },

  // Find ticket in local IndexedDB by ticketNumber or full QR payload
  async findLocalTicket(rawCode) {
    if (!rawCode) return null;
    await this.ensureBaselineData();

    const cleanCode = rawCode.trim();

    // Check if rawCode is JSON payload (Slide 05 & 06)
    let searchTicketNumber = cleanCode;
    try {
      if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
        const parsed = JSON.parse(cleanCode);
        if (parsed.tkt) searchTicketNumber = parsed.tkt;
      }
    } catch (e) {
      // Not JSON
    }

    // Smart normalization: if user typed '1042', convert to 'TKT-1042'
    let normalized = searchTicketNumber.toUpperCase().replace(/\s+/g, '');
    if (/^\d+$/.test(normalized)) {
      normalized = `TKT-${normalized}`;
    }

    // 1. Direct match by exact or normalized ticketNumber
    const all = await db.localTickets.toArray();
    let ticket = all.find(t => 
      t.ticketNumber.toUpperCase() === normalized ||
      t.ticketNumber.toUpperCase() === searchTicketNumber.toUpperCase() ||
      t.ticketNumber.replace('-', '').toUpperCase() === normalized.replace('-', '') ||
      (t.qrPayload && t.qrPayload.includes(searchTicketNumber)) ||
      t.id === searchTicketNumber
    );

    return ticket || null;
  },

  // Record an offline scan entry into Dexie.js (Slide 06 & 07)
  async recordScan({
    ticket,
    deviceId,
    gateId,
    volunteerName,
    eventId
  }) {
    await this.ensureBaselineData();

    const entryId = crypto.randomUUID();
    const scannedAt = new Date().toISOString();

    let scanResultStatus = 'valid'; // 'valid' | 'locally_repeated' | 'invalid' | 'cancelled'

    if (!ticket) {
      scanResultStatus = 'invalid';
    } else if (ticket.status === 'cancelled') {
      scanResultStatus = 'cancelled';
    } else if (ticket.locallyScanned) {
      // Slide 05 & 07: Locally repeated ticket on the same device!
      scanResultStatus = 'locally_repeated';
    } else {
      scanResultStatus = 'valid';
    }

    // Always queue valid and locally repeated tickets into pendingScans
    if (ticket) {
      const scanEntry = {
        entryId,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        eventId: eventId || ticket.eventId || DEFAULT_DEMO_EVENT.id,
        deviceId: deviceId || 'Gate-Device-1',
        gateId: gateId || 'Gate A',
        volunteerName: volunteerName || 'Volunteer',
        scannedAt,
        syncStatus: 'pending',
        localVerdict: scanResultStatus
      };

      await db.pendingScans.put(scanEntry);

      // Update local ticket state in IndexedDB
      try {
        await db.localTickets.update(ticket.id, {
          locallyScanned: true,
          localScanCount: (ticket.localScanCount || 0) + 1,
          lastScannedAt: scannedAt
        });
      } catch (err) {
        // If not in table, add it
        await db.localTickets.put({
          ...ticket,
          locallyScanned: true,
          localScanCount: 1,
          lastScannedAt: scannedAt
        });
      }
    }

    // Add to local audit history for the UI feed
    const historyItem = {
      entryId,
      ticketNumber: ticket ? ticket.ticketNumber : (rawCode || 'UNKNOWN'),
      attendeeName: ticket ? ticket.attendeeName : 'Unknown Attendee',
      tier: ticket ? ticket.tier : '-',
      status: scanResultStatus,
      scannedAt,
      gateId: gateId || 'Gate A'
    };
    await db.scanHistory.add(historyItem);

    return {
      entryId,
      status: scanResultStatus,
      ticket: ticket || null,
      scannedAt
    };
  },

  // Get all pending unsynced scans
  async getPendingScans() {
    try {
      return await db.pendingScans.where('syncStatus').equals('pending').toArray();
    } catch (e) {
      return [];
    }
  },

  // Mark scans as synced after server acknowledgment
  async markScansSynced(entryIds) {
    await db.transaction('rw', db.pendingScans, async () => {
      for (const id of entryIds) {
        await db.pendingScans.update(id, { syncStatus: 'synced' });
      }
    });
  },

  // Clear all synced entries from the queue
  async purgeSyncedScans() {
    try {
      await db.pendingScans.where('syncStatus').equals('synced').delete();
    } catch (e) {}
  },

  // Get local scan history
  async getScanHistory(limit = 20) {
    try {
      return await db.scanHistory.reverse().limit(limit).toArray();
    } catch (e) {
      return [];
    }
  },

  // Reset local database
  async resetAll() {
    await db.eventMeta.clear();
    await db.localTickets.clear();
    await db.pendingScans.clear();
    await db.scanHistory.clear();
    await this.ensureBaselineData();
  }
};
