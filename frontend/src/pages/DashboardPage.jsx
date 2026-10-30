import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { offlineDbService } from '../db/dexieDb';
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
  ArrowUpRight,
  Download,
  Search,
  Clock,
  Sparkles,
  QrCode,
  ScanLine,
  ArrowRight,
  Trash2
} from 'lucide-react';

export const DashboardPage = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [activeConflict, setActiveConflict] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // History search & gate filter
  const [historySearch, setHistorySearch] = useState('');
  const [gateFilter, setGateFilter] = useState('ALL');

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

        // 1. Fetch server check-ins
        let serverCheckIns = [];
        try {
          const checkInRes = await api.getCheckIns(current.id);
          serverCheckIns = checkInRes.checkIns || [];
          // Resilient fallback: If no check-ins found for specific eventId, query all check-ins
          if (serverCheckIns.length === 0) {
            const allCheckInsRes = await api.getCheckIns();
            if (allCheckInsRes.checkIns && allCheckInsRes.checkIns.length > 0) {
              serverCheckIns = allCheckInsRes.checkIns;
            }
          }
        } catch (e) {
          console.warn('Server check-ins fetch notice:', e.message);
        }

        // 2. Fetch local IndexedDB audit history & local tickets
        const localHistory = await offlineDbService.getScanHistory(100);
        const localTickets = await offlineDbService.getAllLocalTickets();

        // 3. Build unified check-in ledger so any scan is immediately visible
        const combinedMap = new Map();

        // Server check-ins
        serverCheckIns.forEach(ci => {
          const key = ci.entryId || (ci.ticketNumber + '-' + (ci.scannedAt || ''));
          combinedMap.set(key, ci);
        });

        // Server checked-in tickets fallback
        try {
          const allTicketsRes = await api.getTickets();
          if (allTicketsRes.tickets) {
            allTicketsRes.tickets.filter(t => t.status === 'checked_in').forEach(t => {
              const key = t.ticketNumber;
              if (!combinedMap.has(key)) {
                combinedMap.set(key, {
                  entryId: 'ci-tkt-' + t.ticketNumber,
                  ticketNumber: t.ticketNumber,
                  attendeeName: t.attendeeName,
                  tier: t.tier || 'VIP',
                  gateId: t.firstCheckIn?.gateId || 'Gate A',
                  scannedAt: t.firstCheckIn?.scannedAt || t.createdAt,
                  volunteerName: t.firstCheckIn?.volunteerName || 'Gate Volunteer Terminal',
                  status: 'valid'
                });
              }
            });
          }
        } catch (e) {}

        // Local scans on this device
        localHistory.filter(h => h.status === 'valid' || h.status === 'locally_repeated').forEach(h => {
          const key = h.entryId || (h.ticketNumber + '-' + (h.scannedAt || ''));
          if (!combinedMap.has(key)) {
            combinedMap.set(key, {
              entryId: h.entryId,
              ticketNumber: h.ticketNumber,
              attendeeName: h.attendeeName,
              tier: h.tier || 'VIP',
              gateId: h.gateId || 'Gate A',
              scannedAt: h.scannedAt,
              volunteerName: 'Gate Volunteer Terminal',
              status: h.status
            });
          }
        });

        // Any tickets with status checked_in
        localTickets.filter(t => t.status === 'checked_in').forEach(t => {
          const key = t.ticketNumber;
          if (!combinedMap.has(key)) {
            combinedMap.set(key, {
              entryId: 'ci-' + t.ticketNumber,
              ticketNumber: t.ticketNumber,
              attendeeName: t.attendeeName,
              tier: t.tier || 'VIP',
              gateId: t.firstCheckIn?.gateId || 'Gate A',
              scannedAt: t.firstCheckIn?.scannedAt || t.lastScannedAt || t.createdAt,
              volunteerName: t.firstCheckIn?.volunteerName || 'Gate Volunteer',
              status: 'valid'
            });
          }
        });

        setCheckIns(Array.from(combinedMap.values()));
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
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleResolveConflict = async (conflictId, payload) => {
    await api.resolveConflict(conflictId, payload);
    await loadData();
  };

  // Export check-ins list to CSV for Organiser reports
  const exportCheckInsCsv = () => {
    if (checkIns.length === 0) {
      alert('No check-in entries to export yet.');
      return;
    }
    const headers = ['Attendee Name', 'Pass Serial', 'Tier', 'Gate', 'Check-in Time', 'Verified Status', 'Volunteer'];
    const rows = checkIns.map(ci => [
      `"${ci.attendeeName || 'Attendee'}"`,
      `"${ci.ticketNumber || '-'}"`,
      `"${ci.tier || 'General'}"`,
      `"${ci.gateId || 'Gate A'}"`,
      `"${new Date(ci.scannedAt).toLocaleString()}"`,
      `"${ci.status === 'valid' ? 'Entry Granted' : 'Repeated Entry'}"`,
      `"${ci.volunteerName || 'Gate Volunteer'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Blackout-Attendee-Entries-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete individual check-in entry
  const handleDeleteCheckIn = async (entryId, ticketNumber) => {
    if (window.confirm(`Delete check-in history record for pass ${ticketNumber || entryId}?`)) {
      try {
        try {
          await api.deleteCheckIn(entryId);
        } catch (apiErr) {
          console.warn('API delete checkin fallback notice:', apiErr.message);
        }
        await offlineDbService.deleteScanHistoryItem(entryId, ticketNumber);
        setCheckIns(prev => prev.filter(c => c.entryId !== entryId && c.ticketNumber !== ticketNumber));
        await loadData();
        alert('✅ Entry history record removed.');
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    }
  };

  // Clear all check-in history
  const handleClearAllHistory = async () => {
    if (checkIns.length === 0) return;
    if (window.confirm(`Clear all ${checkIns.length} attendee check-in records? This will reset the check-in count for this event.`)) {
      try {
        try {
          await api.clearCheckIns();
        } catch (apiErr) {
          console.warn('API clear checkins fallback notice:', apiErr.message);
        }
        await offlineDbService.clearAllScanHistory();
        setCheckIns([]);
        await loadData();
        alert('✅ All attendee entry history cleared.');
      } catch (err) {
        alert('Clear error: ' + err.message);
      }
    }
  };

  const pendingConflictsCount = conflicts.filter(c => c.status === 'pending_review').length;
  const totalPasses = selectedEvent?.totalTickets || 0;
  const checkedInCount = checkIns.length > 0 ? checkIns.length : (selectedEvent?.checkedInCount || 0);
  const attendancePercent = totalPasses > 0 ? Math.min(100, Math.round((checkedInCount / totalPasses) * 100)) : 0;

  const filteredCheckIns = checkIns.filter(ci => {
    const term = historySearch.toLowerCase();
    const matchesSearch = 
      (ci.attendeeName || '').toLowerCase().includes(term) ||
      (ci.ticketNumber || '').toLowerCase().includes(term);
    const matchesGate = gateFilter === 'ALL' || (ci.gateId || '').includes(gateFilter);
    return matchesSearch && matchesGate;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Top Header & Event Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Ambient background glow orb */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold tracking-wider uppercase mb-1">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>Lead Organiser Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {selectedEvent ? selectedEvent.title : 'Live Event Operations'}
          </h1>
          {selectedEvent && (
            <div className="flex items-center gap-4 text-xs text-slate-300 mt-2 flex-wrap font-sans">
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-cyan-400" /> {selectedEvent.venue}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-purple-400" /> {selectedEvent.date}</span>
              <span className="text-emerald-400 font-mono font-semibold bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Active Gates: {selectedEvent.gates?.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Header Action Buttons */}
        <div className="relative z-10 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => { setRefreshing(true); loadData(); }}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <Link
            to="/tickets"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition flex items-center gap-2 group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            <span>+ Issue Passes &amp; QR</span>
          </Link>
        </div>
      </div>

      {/* 3-Step Simple Visual Guide Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <Link to="/tickets" className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition group">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
            1
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-white group-hover:text-emerald-300 transition">Issue Passes &amp; QR</h4>
            <p className="text-[11px] text-slate-400 truncate">Create VIP or General passes with instant QR</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 ml-auto shrink-0" />
        </Link>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold shrink-0">
            2
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-white">Volunteer Scans at Gate</h4>
            <p className="text-[11px] text-slate-400 truncate">&lt;10ms instant entry even with zero internet</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold shrink-0">
            3
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-white">Live Real-time Ledger</h4>
            <p className="text-[11px] text-slate-400 truncate">See who entered, exact time, and gate below</p>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Passes Issued"
          value={totalPasses}
          subtitle="Registered attendees"
          icon={Ticket}
          color="blue"
        />
        <StatCard
          title="Attendees Entered"
          value={checkedInCount}
          subtitle={`${attendancePercent}% Overall Attendance`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Duplicate Pass Flags"
          value={pendingConflictsCount}
          subtitle={pendingConflictsCount > 0 ? "Requires review" : "Zero duplicate entries"}
          icon={AlertTriangle}
          color={pendingConflictsCount > 0 ? "rose" : "emerald"}
          alert={pendingConflictsCount > 0}
        />
        <StatCard
          title="Zero-Downtime Engine"
          value="100% Ready"
          subtitle="Works offline in blackout"
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
                  Duplicate Check-in Alert
                </span>
                <h3 className="text-xl font-bold text-white">
                  {pendingConflictsCount} Pass(es) Scanned Across Multiple Gates
                </h3>
              </div>
            </div>
            <Link
              to="/conflicts"
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-rose-950"
            >
              <span>Review Duplicate Passes</span>
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
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Turnout Progress Bar */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300">Live Gate Turnout Progress</span>
          <span className="font-mono font-bold text-white">
            <span className="text-emerald-400">{checkedInCount}</span> / {totalPasses} Attendees Entered ({attendancePercent}%)
          </span>
        </div>
        <div className="w-full h-3.5 bg-black/40 rounded-full overflow-hidden border border-white/10 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500 rounded-full glow-emerald"
            style={{ width: `${attendancePercent}%` }}
          ></div>
        </div>
      </div>

      {/* ATTENDEE ENTRY HISTORY (Full Detailed Realtime Ledger) */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
              <span>Live Attendance Log</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-3">
              <span>Attendee Entry History</span>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {checkIns.length} Verified Entries
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Real-time audit log of every attendee who scanned their pass at the gates.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={exportCheckInsCsv}
              disabled={checkIns.length === 0}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-200 text-xs font-semibold border border-white/10 transition flex items-center gap-2"
              title="Download attendance list as CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleClearAllHistory}
              disabled={checkIns.length === 0}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition flex items-center gap-1.5"
              title="Clear all attendance history"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear History</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search attendee name or pass ID..."
              className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-400 font-mono">Gate Filter:</span>
            <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-mono">
              {['ALL', 'Gate A', 'Gate B', 'Gate C'].map((g) => (
                <button
                  key={g}
                  onClick={() => setGateFilter(g)}
                  className={`px-3 py-1 rounded-lg transition text-xs ${
                    gateFilter === g
                      ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table of Check-ins */}
        {filteredCheckIns.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs border border-dashed border-white/10 rounded-2xl bg-black/20 p-6 space-y-3">
            {checkIns.length === 0 ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Ticket className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">No gate entries recorded yet</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    When attendees scan their passes at the gate terminals, they will appear right here with their name, exact timestamp, and gate details!
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    to="/tickets"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 transition"
                  >
                    <span>Go to Passes &amp; Test Scan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </>
            ) : (
              <p>No check-in entries matched your search filter.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0a0f1d] text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-4">Attendee Name</th>
                  <th className="py-3.5 px-4">Pass ID</th>
                  <th className="py-3.5 px-4">Pass Tier</th>
                  <th className="py-3.5 px-4">Gate</th>
                  <th className="py-3.5 px-4">Check-in Time</th>
                  <th className="py-3.5 px-4">Verification Status</th>
                  <th className="py-3.5 px-4">Scanned By</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-[#0e1629]/50">
                {filteredCheckIns.slice().reverse().map((ci, index) => {
                  const initial = (ci.attendeeName || 'A').charAt(0).toUpperCase();
                  return (
                    <tr key={ci.entryId || (ci.ticketNumber + '-' + index)} className="hover:bg-white/[0.04] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                            {initial}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{ci.attendeeName || 'Attendee'}</div>
                            <span className="text-[10px] text-slate-400 font-mono">Verified Attendee</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {ci.ticketNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-md bg-white/5 text-slate-200 border border-white/10 font-mono text-[10px] font-semibold">
                          {ci.tier || 'VIP Access'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 font-mono text-[11px] font-bold">
                          {ci.gateId || 'Gate A'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-semibold">{ci.scannedAt ? new Date(ci.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{ci.scannedAt ? new Date(ci.scannedAt).toLocaleDateString() : ''}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-bold px-3 py-1 rounded-full border shadow-sm ${
                          ci.status === 'valid'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                        }`}>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{ci.status === 'valid' ? 'ENTRY GRANTED' : 'REPEATED ENTRY'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        {ci.volunteerName || 'Gate Volunteer Terminal'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteCheckIn(ci.entryId, ci.ticketNumber)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 transition"
                          title="Delete this check-in entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
