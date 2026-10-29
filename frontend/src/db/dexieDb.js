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

// Helper functions for IndexedDB operations
export const offlineDbService = {
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
        locallyScanned: t.status === 'checked_in',
        localScanCount: t.checkInCount || 0
      }));

      await db.localTickets.bulkPut(formattedTickets);
    });
  },

  // Save single ticket directly into local IndexedDB (for instantaneous local availability)
  async saveSingleTicket(ticket) {
    try {
      await db.localTickets.put({
        ...ticket,
        locallyScanned: false,
        localScanCount: 0
      });
      console.log(`🎫 [Dexie.js] Cached new pass locally: ${ticket.ticketNumber}`);
    } catch (e) {
      console.warn('Error saving single ticket to Dexie:', e);
    }
  },

  // Get active cached event
  async getCachedEvent() {
    const events = await db.eventMeta.toArray();
    return events.length > 0 ? events[0] : null;
  },

  // Check local ticket count
  async getCachedTicketsCount() {
    return await db.localTickets.count();
  },

  // Ensure baseline tickets data is ready in local IndexedDB
  async ensureBaselineData() {
    try {
      return await db.localTickets.count();
    } catch (e) {
      return 0;
    }
  },

  // Get all locally cached tickets
  async getAllLocalTickets() {
    try {
      return await db.localTickets.toArray();
    } catch (e) {
      return [];
    }
  },

  // Find ticket in local IndexedDB by ticketNumber or full QR payload
  async findLocalTicket(rawCode) {
    if (!rawCode) return null;
    const cleanCode = String(rawCode).trim();

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

    // Smart normalization: if user typed '1001', convert to 'TKT-1001'
    let normalized = searchTicketNumber.toUpperCase().replace(/\s+/g, '');
    if (/^\d+$/.test(normalized)) {
      normalized = `TKT-${normalized}`;
    }

    // Direct match by exact or normalized ticketNumber
    const all = await db.localTickets.toArray();
    let ticket = all.find(t => {
      const num = (t.ticketNumber || '').toUpperCase();
      const norm = (normalized || '').toUpperCase();
      const raw = (searchTicketNumber || '').toUpperCase();
      return (
        num === norm ||
        num === raw ||
        num.replace(/[^A-Z0-9]/g, '') === norm.replace(/[^A-Z0-9]/g, '') ||
        (t.qrPayload && t.qrPayload.includes(searchTicketNumber)) ||
        t.id === searchTicketNumber ||
        (t.attendeeName && t.attendeeName.toLowerCase() === cleanCode.toLowerCase())
      );
    });

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
    const entryId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : 'entry-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
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

    // Queue valid and locally repeated tickets into pendingScans
    if (ticket) {
      const scanEntry = {
        entryId,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        eventId: eventId || ticket.eventId,
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
      ticketNumber: ticket ? ticket.ticketNumber : 'UNKNOWN',
      attendeeName: ticket ? ticket.attendeeName : 'Unregistered Ticket',
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
  }
};
