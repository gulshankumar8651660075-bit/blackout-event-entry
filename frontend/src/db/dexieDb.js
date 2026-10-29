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
      // Clear previous local event data for clean sync
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
    const events = await db.eventMeta.toArray();
    return events.length > 0 ? events[0] : null;
  },

  // Check local ticket count
  async getCachedTicketsCount() {
    return await db.localTickets.count();
  },

  // Find ticket in local IndexedDB by ticketNumber or full QR payload
  async findLocalTicket(rawCode) {
    if (!rawCode) return null;
    const cleanCode = rawCode.trim();

    // Check if rawCode is JSON payload (Slide 05 & 06)
    let searchTicketNumber = cleanCode;
    try {
      if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
        const parsed = JSON.parse(cleanCode);
        if (parsed.tkt) searchTicketNumber = parsed.tkt;
      }
    } catch (e) {
      // Not JSON, search directly
    }

    // Direct search by ticketNumber
    let ticket = await db.localTickets
      .where('ticketNumber')
      .equalsIgnoreCase(searchTicketNumber)
      .first();

    if (!ticket) {
      // Search in full array if needed
      ticket = await db.localTickets
        .filter(t => t.ticketNumber.toLowerCase() === searchTicketNumber.toLowerCase() || 
                     (t.qrPayload && t.qrPayload.includes(searchTicketNumber)))
        .first();
    }

    return ticket;
  },

  // Record an offline scan entry into Dexie.js (Slide 06 & 07)
  async recordScan({
    ticket,
    deviceId,
    gateId,
    volunteerName,
    eventId
  }) {
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

    // If it's a valid or locally repeated ticket, queue it in pendingScans
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

      await db.pendingScans.add(scanEntry);

      // Update local ticket state in IndexedDB
      await db.localTickets.update(ticket.id, {
        locallyScanned: true,
        localScanCount: (ticket.localScanCount || 0) + 1,
        lastScannedAt: scannedAt
      });
    }

    // Add to local audit history for the UI feed
    const historyItem = {
      entryId,
      ticketNumber: ticket ? ticket.ticketNumber : 'UNKNOWN',
      attendeeName: ticket ? ticket.attendeeName : 'Unknown Attendee',
      tier: ticket ? ticket.tier : '-',
      status: scanResultStatus,
      scannedAt,
      gateId
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
    return await db.pendingScans.where('syncStatus').equals('pending').toArray();
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
    await db.pendingScans.where('syncStatus').equals('synced').delete();
  },

  // Get local scan history
  async getScanHistory(limit = 20) {
    return await db.scanHistory.reverse().limit(limit).toArray();
  },

  // Reset local database
  async resetAll() {
    await db.eventMeta.clear();
    await db.localTickets.clear();
    await db.pendingScans.clear();
    await db.scanHistory.clear();
  }
};
