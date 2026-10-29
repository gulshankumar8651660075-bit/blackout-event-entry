import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { TicketCard } from '../components/TicketCard';
import { Ticket, Plus, Users, Search, RefreshCw, Send, Sparkles } from 'lucide-react';
import { offlineDbService } from '../db/dexieDb';
import { useAuth } from '../context/AuthContext';

export const TicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAttendee, setNewAttendee] = useState({ name: '', email: '', tier: 'VIP' });

  const { activeGate, deviceId, user } = useAuth();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      const evRes = await api.getEvents();
      if (evRes.events && evRes.events.length > 0) {
        setEvents(evRes.events);
        const eid = selectedEventId || evRes.events[0].id;
        setSelectedEventId(eid);

        const tktRes = await api.getTickets(eid);
        setTickets(tktRes.tickets || []);
      }
    } catch (err) {
      console.warn('Tickets load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedEventId]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newAttendee.name.trim()) return;

    setCreating(true);
    try {
      await api.createTicket({
        eventId: selectedEventId,
        attendeeName: newAttendee.name,
        attendeeEmail: newAttendee.email,
        tier: newAttendee.tier
      });
      setShowAddModal(false);
      setNewAttendee({ name: '', email: '', tier: 'VIP' });
      await loadData();
    } catch (err) {
      alert('Error creating ticket: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleBulkGenerate = async () => {
    setCreating(true);
    try {
      await api.bulkCreateTickets({ eventId: selectedEventId, count: 5 });
      await loadData();
      alert('✅ 5 sample tickets generated successfully!');
    } catch (err) {
      alert('Bulk generate failed: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  // Quick simulate scan directly into Dexie.js for testing
  const handleQuickScan = async (ticket) => {
    try {
      const res = await offlineDbService.recordScan({
        ticket,
        deviceId,
        gateId: activeGate,
        volunteerName: user ? user.name : 'Gate Volunteer',
        eventId: selectedEventId
      });

      alert(`🎫 Scanned ${ticket.ticketNumber} locally at ${activeGate}!\nStatus: ${res.status.toUpperCase()}\nHead to the Gate Scanner or Dashboard to view!`);
    } catch (err) {
      alert('Scan simulation failed: ' + err.message);
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.attendeeName.toLowerCase().includes(search.toLowerCase()) ||
    t.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
    t.tier.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold tracking-wider uppercase mb-1">
            <Ticket className="w-3.5 h-3.5" />
            <span>Slide 05: Ticket Passes &amp; QR Manifest</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Event Tickets &amp; QR Passes
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Display QR codes for attendees or use "Simulate Scan" to test multi-gate offline flow.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleBulkGenerate}
            disabled={creating}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>+ Generate 5 Sample Passes</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Single Attendee</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-card p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ticket ID, tier..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>Active Scanner Gate: <strong className="text-emerald-400 font-mono">{activeGate}</strong></span>
          <span className="w-1 h-1 rounded-full bg-slate-600"></span>
          <span>Total: <strong className="text-white">{filteredTickets.length}</strong></span>
        </div>
      </div>

      {/* Tickets Grid */}
      {filteredTickets.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-sm glass-panel rounded-3xl">
          No tickets found matching your filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onQuickScan={handleQuickScan}
            />
          ))}
        </div>
      )}

      {/* Add Attendee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create New Attendee Pass</h3>
            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Attendee Name *</label>
                <input
                  type="text"
                  required
                  value={newAttendee.name}
                  onChange={(e) => setNewAttendee({ ...newAttendee, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newAttendee.email}
                  onChange={(e) => setNewAttendee({ ...newAttendee, email: e.target.value })}
                  placeholder="e.g. rahul@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Ticket Tier</label>
                <select
                  value={newAttendee.tier}
                  onChange={(e) => setNewAttendee({ ...newAttendee, tier: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="VIP">VIP</option>
                  <option value="General">General Admission</option>
                  <option value="Early Bird">Early Bird</option>
                  <option value="Staff">Staff / Media</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                >
                  {creating ? 'Creating...' : 'Issue Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
