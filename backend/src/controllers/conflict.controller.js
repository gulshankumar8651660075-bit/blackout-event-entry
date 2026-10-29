const DataStore = require('../models/store');

const getConflicts = async (req, res) => {
  try {
    const { eventId } = req.query;
    const conflicts = await DataStore.getConflicts(eventId);
    res.json({ success: true, count: conflicts.length, conflicts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const resolveConflict = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, notes } = req.body;

    if (!decision) {
      return res.status(400).json({ success: false, message: 'Resolution decision is required.' });
    }

    const resolved = await DataStore.resolveConflict(id, {
      decision,
      notes: notes || '',
      resolvedBy: req.user ? req.user.name : 'Organiser'
    });

    if (!resolved) {
      return res.status(404).json({ success: false, message: 'Conflict record not found.' });
    }

    res.json({
      success: true,
      message: 'Conflict resolved successfully.',
      conflict: resolved
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getConflicts,
  resolveConflict
};
