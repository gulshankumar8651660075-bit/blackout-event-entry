const DataStore = require('../models/store');

const getEvents = async (req, res) => {
  try {
    const events = await DataStore.getEvents();
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await DataStore.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    const tickets = await DataStore.getTicketsByEvent(req.params.id);
    res.json({ success: true, event, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createEvent = async (req, res) => {
  try {
    const { title, description, date, venue, gates } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Event title is required.' });
    }

    const newEvent = await DataStore.createEvent(
      { title, description, date, venue, gates },
      req.user.id
    );

    res.status(201).json({ success: true, event: newEvent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// SLIDE 03 & 06: Device Offline Preparation Endpoint
// Downloads full event manifest and encrypted/signed ticket records for local IndexedDB caching
const downloadOfflinePackage = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await DataStore.getEventById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const tickets = await DataStore.getTicketsByEvent(eventId);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      event: {
        id: event.id,
        title: event.title,
        venue: event.venue,
        date: event.date,
        gates: event.gates
      },
      totalTickets: tickets.length,
      // Minimal payload needed by the gate scanner for instantaneous local verification
      tickets: tickets.map(t => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        attendeeName: t.attendeeName,
        tier: t.tier,
        status: t.status,
        qrPayload: t.qrPayload,
        eventId: t.eventId
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  downloadOfflinePackage
};
