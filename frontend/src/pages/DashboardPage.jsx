import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { StatCard } from '../components/StatCard';
import { ConflictResolutionModal } from '../components/ConflictResolutionModal';
import { 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Ticket, 
  DownloadCloud, 
  Plus, 
  Radio, 
  RefreshCw, 
  Calendar, 
  MapPin, 
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const DashboardPage = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [activeConflict, setActiveConflict] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const loadData = async () => {
    try {
      const eventRes = await api.getEvents();
      if (eventRes.events && eventRes.events.length > 0) {
        setEvents(eventRes.events);
        const current = selectedEvent 
          ? eventRes.events.find(e => e.id === selectedEvent.id) || eventRes.events[0]
          : eventRes.events[0];
        setSelectedEvent(current);

        const conflictRes = await api.getConflicts(current.id);
        setConflicts(conflictRes.conflicts || []);
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      await api.seedDemo();
      await loadData();
      alert('🎉 Demo Event & Sample Tickets seeded successfully for the hackathon demo!');
    } catch (err) {
      alert('Failed to seed demo: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleResolveConflict = async (conflictId, payload) => {
    await api.resolveConflict(conflictId, payload);
    await loadData();
  };

  const pendingConflictsCount = conflicts.filter(c => c.status === 'pending_review').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold tracking-wider uppercase mb-1">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Mission Control • Slide 04: Organiser Central</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {selectedEvent ? selectedEvent.title : 'Event Operations Dashboard'}
          </h1>
          {selectedEvent && (
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-500" /> {selectedEvent.venue}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-500" /> {selectedEvent.date}</span>
              <span className="text-emerald-400 font-mono">Gates: {selectedEvent.gates?.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => { setRefreshing(true); loadData(); }}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleSeedDemo}
            disabled={seeding}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition flex items-center gap-2"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>{seeding ? 'Generating...' : 'Seed Slide 12 Demo Event'}</span>
          </button>

          <Link
            to="/tickets"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-2"
          >
            <Ticket className="w-4 h-4 text-emerald-400" />
            <span>Manage Tickets</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Issued Passes"
          value={selectedEvent ? selectedEvent.totalTickets : 0}
          subtitle="Tickets ready for scanning"
          icon={Ticket}
          color="blue"
        />
        <StatCard
          title="Checked-in Attendees"
          value={selectedEvent ? selectedEvent.checkedInCount : 0}
          subtitle={`${selectedEvent && selectedEvent.totalTickets ? Math.round((selectedEvent.checkedInCount / selectedEvent.totalTickets) * 100) : 0}% Attendance Rate`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Duplicate Conflicts"
          value={pendingConflictsCount}
          subtitle={pendingConflictsCount > 0 ? "Requires Organiser Review (Slide 08)" : "Zero conflicts detected"}
          icon={AlertTriangle}
          color={pendingConflictsCount > 0 ? "rose" : "emerald"}
          alert={pendingConflictsCount > 0}
        />
        <StatCard
          title="Offline Redundancy"
          value="100%"
          subtitle="Dexie.js + PWA Active"
          icon={ShieldCheck}
          color="amber"
        />
      </div>

      {/* Conflict Review Attention Callout (Slide 08 & 12) */}
      {pendingConflictsCount > 0 && (
        <div className="glass-panel p-6 rounded-3xl border border-rose-500/40 bg-rose-950/20 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <span className="text-xs font-mono uppercase text-rose-400 font-extrabold tracking-wider">
                  Attention Required: Slide 08 Conflict Triggered
                </span>
                <h3 className="text-xl font-bold text-white">
                  {pendingConflictsCount} Ticket(s) Checked In Across Multiple Offline Gates
                </h3>
              </div>
            </div>
            <Link
              to="/conflicts"
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-rose-950"
            >
              <span>Review All</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {conflicts.filter(c => c.status === 'pending_review').map((conf) => (
              <div
                key={conf.id}
                className="p-4 rounded-xl bg-slate-900/90 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-emerald-400">{conf.ticketNumber}</span>
                    <span className="text-xs text-white font-medium">— {conf.attendeeName}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Scanned at: {conf.conflictingEntries.map(e => `${e.gateId} (${new Date(e.scannedAt).toLocaleTimeString()})`).join(' vs ')}
                  </p>
                </div>
                <button
                  onClick={() => setActiveConflict(conf)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shrink-0"
                >
                  Review & Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Gate Scanner Readiness + Live Event Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Gate Preparation Center */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Slide 03: Gate Device Prep</h3>
              <p className="text-xs text-slate-400">Download ticket list before opening gate</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Volunteers cache the event ticket cryptographic payload onto their device IndexedDB (Dexie.js) so gate scanning never stops even during a complete network blackout.
          </p>

          <div className="pt-2 space-y-2">
            <Link
              to="/scanner"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition"
            >
              <span>Launch Gate Scanner Interface</span>
              <ChevronRight className="w-4 h-4" />
            </Link>

            <Link
              to="/demo"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 font-semibold text-xs flex items-center justify-center gap-2 border border-amber-500/20 transition"
            >
              <span>Open 6-Step Hackathon Demo Guide</span>
            </Link>
          </div>
        </div>

        {/* Right Columns: Event Architecture & System Specs (Slide 09 & 10) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>BLACKOUT System Architecture Overview (Slides 09 & 10)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <span className="font-mono text-emerald-400 font-bold">1. Device Cache</span>
              <h5 className="font-bold text-white">Browser & PWA</h5>
              <p className="text-slate-400 text-[11px]">
                Service Worker caches app bundle. Loads instantly without web connection.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <span className="font-mono text-blue-400 font-bold">2. Device IndexedDB</span>
              <h5 className="font-bold text-white">Dexie.js Database</h5>
              <p className="text-slate-400 text-[11px]">
                Validates tickets in &lt;10ms. Queues pending scans locally with device/gate stamp.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <span className="font-mono text-amber-400 font-bold">3. Central Server</span>
              <h5 className="font-bold text-white">Node + MongoDB</h5>
              <p className="text-slate-400 text-[11px]">
                Idempotent sync engine deduplicates retries &amp; flags cross-device duplicate conflicts.
              </p>
            </div>
          </div>

          {/* Quick Ticket Stats Preview */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Active Gates Configured: <strong className="text-white">{selectedEvent?.gates?.join(', ')}</strong></span>
            <Link to="/tickets" className="text-emerald-400 hover:underline font-semibold">View All Ticket Passes →</Link>
          </div>
        </div>
      </div>

      {/* Resolution Modal */}
      {activeConflict && (
        <ConflictResolutionModal
          conflict={activeConflict}
          onClose={() => setActiveConflict(null)}
          onResolve={handleResolveConflict}
        />
      )}
    </div>
  );
};
