const DataStore = require('../models/store');

const getTickets = async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) {
      return res.status(400).json({ success: false, message: 'eventId query parameter is required.' });
    }
    const tickets = await DataStore.getTicketsByEvent(eventId);
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createTicket = async (req, res) => {
  try {
    const { eventId, attendeeName, attendeeEmail, tier, ticketNumber } = req.body;
    if (!eventId || !attendeeName) {
      return res.status(400).json({ success: false, message: 'eventId and attendeeName are required.' });
    }

    const ticket = await DataStore.createTicket({
      eventId,
      attendeeName,
      attendeeEmail,
      tier,
      ticketNumber
    });

    res.status(201).json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const bulkCreateTickets = async (req, res) => {
  try {
    const { eventId, count = 5, attendees = [] } = req.body;
    if (!eventId) {
      return res.status(400).json({ success: false, message: 'eventId is required.' });
    }

    let ticketList = [];
    if (attendees.length > 0) {
      ticketList = attendees;
    } else {
      // Auto generate random sample tickets
      const sampleNames = ['Aman Verma', 'Ananya Gupta', 'Karan Malhotra', 'Sneha Kapoor', 'Vikram Joshi', 'Divya Iyer', 'Rahul Sengupta'];
      const tiers = ['VIP', 'General', 'Early Bird'];
      for (let i = 0; i < count; i++) {
        const name = sampleNames[i % sampleNames.length] + (i >= sampleNames.length ? ` #${i+1}` : '');
        ticketList.push({
          attendeeName: name,
          attendeeEmail: `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
          tier: tiers[i % tiers.length]
        });
      }
    }

    const created = await DataStore.createBatchTickets(eventId, ticketList);
    res.status(201).json({ success: true, count: created.length, tickets: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getTickets,
  createTicket,
  bulkCreateTickets
};
