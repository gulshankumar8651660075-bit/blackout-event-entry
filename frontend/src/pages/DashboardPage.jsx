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
  Plus, 
  Radio, 
  RefreshCw, 
  Calendar, 
  MapPin, 
  ChevronRight,
  ShieldCheck,
  ScanLine,
  ArrowUpRight
} from 'lucide-react';

export const DashboardPage = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [activeConflict, setActiveConflict] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

        const checkInRes = await api.getCheckIns(current.id);
        setCheckIns(checkInRes.checkIns || []);
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

  const handleResolveConflict = async (conflictId, payload) => {
    await api.resolveConflict(conflictId, payload);
    await loadData();
  };

  const pendingConflictsCount = conflicts.filter(c => c.status === 'pending_review').length;
  const attendancePercent = selectedEvent?.totalTickets 
    ? Math.round((selectedEvent.checkedInCount / selectedEvent.totalTickets) * 100) 
    : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Top Header & Event Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-purple-400 font-bold tracking-wider uppercase mb-1">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Executive Command Center</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {selectedEvent ? selectedEvent.title : 'Event Operations Dashboard'}
          </h1>
          {selectedEvent && (
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-500" /> {selectedEvent.venue}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-500" /> {selectedEvent.date}</span>
              <span className="text-emerald-400 font-mono">Gates: {selectedEvent.gates?.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => { setRefreshing(true); loadData(); }}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/tickets"
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Passes</span>
          </Link>

          <Link
            to="/scanner"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-2"
          >
            <ScanLine className="w-4 h-4 text-emerald-400" />
            <span>Open Terminal</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Issued Passes"
          value={selectedEvent ? selectedEvent.totalTickets : 0}
          subtitle="Real attendee tickets"
          icon={Ticket}
          color="blue"
        />
        <StatCard
          title="Checked-in Attendees"
          value={selectedEvent ? selectedEvent.checkedInCount : 0}
          subtitle={`${attendancePercent}% Overall Attendance`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Duplicate Conflicts"
          value={pendingConflictsCount}
          subtitle={pendingConflictsCount > 0 ? "Requires Organiser Adjudication" : "Zero conflicts detected"}
          icon={AlertTriangle}
          color={pendingConflictsCount > 0 ? "rose" : "emerald"}
          alert={pendingConflictsCount > 0}
        />
        <StatCard
          title="Offline Engine"
          value="Active"
          subtitle="Dexie.js + PWA Redundancy"
          icon={ShieldCheck}
          color="amber"
        />
      </div>

      {/* Duplicate Conflict Attention Callout */}
      {pendingConflictsCount > 0 && (
        <div className="glass-panel p-6 rounded-3xl border border-rose-500/40 bg-rose-950/20 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <span className="text-xs font-mono uppercase text-rose-400 font-extrabold tracking-wider">
                  Post-Sync Duplicate Check-in Detected
                </span>
                <h3 className="text-xl font-bold text-white">
                  {pendingConflictsCount} Pass(es) Checked In Across Multiple Gates
                </h3>
              </div>
            </div>
            <Link
              to="/conflicts"
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-rose-950"
            >
              <span>Review In Conflict Center</span>
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
                  Review &amp; Adjudicate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Columns: Gate Breakdown & Live Check-in Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Quick Actions & Overview */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Event Operations Overview</span>
            </h3>
            <Link to="/tickets" className="text-xs text-emerald-400 hover:underline flex items-center gap-1">
              <span>View All Passes</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Gate Check-in Progress</span>
              <span className="font-mono font-bold text-white">{selectedEvent?.checkedInCount || 0} / {selectedEvent?.totalTickets || 0} Checked In</span>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                style={{ width: `${attendancePercent}%` }}
              ></div>
            </div>
          </div>

          {/* Gate List */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">Active Entry Gates</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {(selectedEvent?.gates || ['Gate A', 'Gate B']).map((gate) => {
                const countAtGate = checkIns.filter(c => c.gateId?.includes(gate.split(' ')[1] || gate)).length;
                return (
                  <div key={gate} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="font-semibold text-white truncate block">{gate}</span>
                    <span className="text-[11px] text-emerald-400 font-mono mt-1 block">{countAtGate} Scans Recorded</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Link to Passes */}
          <div className="pt-2">
            <Link
              to="/tickets"
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-700"
            >
              <span>Manage Passes &amp; Generate QR</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Right Column: Live Check-in Activity Stream */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Live Gate Entry Stream</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">Auto-Updating</span>
          </div>

          {checkIns.length === 0 ? (
            <div className="py-14 text-center text-slate-500 text-xs">
              No check-ins recorded yet.
              <br />
              Volunteers will scan passes at the gates.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {checkIns.slice().reverse().map((ci) => (
                <div
                  key={ci.entryId}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400">{ci.ticketNumber}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-slate-300 font-mono">
                        {ci.gateId}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">Scanned by: {ci.volunteerName}</span>
                  </div>

                  <div className="text-right font-mono text-[10px] text-slate-400">
                    <div>{new Date(ci.scannedAt).toLocaleTimeString()}</div>
                    <span className="text-emerald-400">Verified</span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
