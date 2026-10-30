const DataStore = require('../models/store');

const getEvents = async (req, res) => {
  try {
    let events = [];
    if (req.user && req.user.role === 'organizer') {
      events = await DataStore.getEvents(req.user.id);
      // If this organizer has no event yet, auto-create a clean, fresh event for them
      if (events.length === 0) {
        const newEvent = await DataStore.createEvent({
          title: `${req.user.name}'s Event`,
          venue: 'Main Arena',
          date: new Date().toISOString().split('T')[0],
          gates: ['Gate A - North VIP', 'Gate B - South General', 'Gate C - Fast Track']
        }, req.user.id);
        events = [newEvent];
      }
    } else {
      // Volunteers: show active events to scan
      events = await DataStore.getEvents();
    }
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

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, venue, gates } = req.body;

    const event = await DataStore.getEventById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (req.user && req.user.role === 'organizer' && event.organizerId && event.organizerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only edit your own events.' });
    }

    const updated = await DataStore.updateEvent(id, { title, description, date, venue, gates });
    res.json({ success: true, event: updated, message: 'Event details updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await DataStore.getEventById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (req.user && req.user.role === 'organizer' && event.organizerId && event.organizerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only delete your own events.' });
    }

    await DataStore.deleteEvent(id);
    res.json({ success: true, message: 'Event and associated data deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  downloadOfflinePackage
};
