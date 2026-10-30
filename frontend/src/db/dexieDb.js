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
        locallyScanned: ticket.status === 'checked_in',
        localScanCount: ticket.checkInCount || 0
      });
      console.log(`🎫 [Dexie.js] Cached new pass locally: ${ticket.ticketNumber}`);
    } catch (e) {
      console.warn('Error saving single ticket to Dexie:', e);
    }
  },

  // Delete single ticket from local IndexedDB
  async deleteSingleTicket(ticketId, ticketNumber) {
    try {
      if (ticketId) {
        await db.localTickets.where('id').equals(ticketId).delete();
      }
      if (ticketNumber) {
        await db.localTickets.where('ticketNumber').equals(ticketNumber).delete();
      }
      // Clean scan history for this ticket too
      const allHistory = await db.scanHistory.toArray();
      for (const h of allHistory) {
        if (h.ticketNumber === ticketNumber || h.ticketId === ticketId) {
          await db.scanHistory.delete(h.id);
        }
      }
    } catch (e) {
      console.warn('Dexie ticket delete fallback:', e);
      try {
        const all = await db.localTickets.toArray();
        for (const t of all) {
          if (t.id === ticketId || t.ticketNumber === ticketNumber) {
            await db.localTickets.delete(t.id);
          }
        }
      } catch (err) {}
    }
  },

  // Delete individual scan history item & reset pass status
  async deleteScanHistoryItem(entryId, ticketNumber) {
    try {
      const all = await db.scanHistory.toArray();
      for (const item of all) {
        if (item.entryId === entryId || (ticketNumber && item.ticketNumber === ticketNumber)) {
          await db.scanHistory.delete(item.id);
        }
      }

      // Also remove from pendingScans
      const allPending = await db.pendingScans.toArray();
      for (const p of allPending) {
        if (p.entryId === entryId || (ticketNumber && p.ticketNumber === ticketNumber)) {
          await db.pendingScans.delete(p.entryId);
        }
      }

      // ALSO reset ticket status in localTickets back to issued!
      const allTickets = await db.localTickets.toArray();
      for (const t of allTickets) {
        if (t.ticketNumber === ticketNumber || t.id === ticketNumber) {
          await db.localTickets.update(t.id, {
            status: 'issued',
            locallyScanned: false,
            localScanCount: 0,
            firstCheckIn: null
          });
        }
      }
    } catch (e) {
      console.warn('Dexie scan history item delete error:', e);
    }
  },

  // Clear all scan history locally & reset all ticket statuses
  async clearAllScanHistory() {
    try {
      await db.scanHistory.clear();
      await db.pendingScans.clear();
      // Reset locallyScanned flags and status on tickets
      const allTickets = await db.localTickets.toArray();
      for (const t of allTickets) {
        await db.localTickets.update(t.id, {
          locallyScanned: false,
          localScanCount: 0,
          status: 'issued',
          firstCheckIn: null
        });
      }
    } catch (e) {
      console.warn('Dexie clear scan history error:', e);
    }
  },

  // Completely wipe local device database on account logout or user switch
  async clearAllData() {
    try {
      await db.eventMeta.clear();
      await db.localTickets.clear();
      await db.pendingScans.clear();
      await db.scanHistory.clear();
      console.log('🧹 [Dexie] Local offline database cleared for user isolation.');
    } catch (e) {
      console.warn('Dexie clearAllData notice:', e);
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
    eventId,
    attendeeName,
    phone,
    email,
    idNote
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

    const finalName = attendeeName || (ticket ? ticket.attendeeName : 'Attendee');
    const finalPhone = phone || (ticket ? ticket.attendeePhone : '');
    const finalEmail = email || (ticket ? ticket.attendeeEmail : '');
    const finalNote = idNote || (ticket ? ticket.idNote : '');

    // Queue valid and locally repeated tickets into pendingScans
    if (ticket) {
      const scanEntry = {
        entryId,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        attendeeName: finalName,
        phone: finalPhone,
        email: finalEmail,
        idNote: finalNote,
        tier: ticket.tier || 'VIP',
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
          lastScannedAt: scannedAt,
          attendeeName: finalName,
          attendeePhone: finalPhone,
          attendeeEmail: finalEmail,
          idNote: finalNote,
          status: 'checked_in',
          firstCheckIn: { gateId, scannedAt, volunteerName }
        });
      } catch (err) {
        await db.localTickets.put({
          ...ticket,
          attendeeName: finalName,
          attendeePhone: finalPhone,
          attendeeEmail: finalEmail,
          idNote: finalNote,
          status: 'checked_in',
          locallyScanned: true,
          localScanCount: 1,
          lastScannedAt: scannedAt,
          firstCheckIn: { gateId, scannedAt, volunteerName }
        });
      }
    }

    // Add to local audit history for the UI feed
    const historyItem = {
      entryId,
      ticketNumber: ticket ? ticket.ticketNumber : 'UNKNOWN',
      eventId: eventId || ticket?.eventId,
      attendeeName: finalName,
      phone: finalPhone,
      email: finalEmail,
      idNote: finalNote,
      tier: ticket ? ticket.tier : 'VIP',
      status: scanResultStatus,
      scannedAt,
      gateId: gateId || 'Gate A',
      volunteerName: volunteerName || 'Gate Volunteer Terminal'
    };
    await db.scanHistory.add(historyItem);

    return {
      entryId,
      status: scanResultStatus,
      ticket: {
        ...(ticket || {}),
        attendeeName: finalName,
        phone: finalPhone,
        email: finalEmail,
        idNote: finalNote
      },
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
