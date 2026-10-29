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
  UserCheck,
  Filter
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

        // 1. Fetch cloud check-ins
        let serverCheckIns = [];
        try {
          const checkInRes = await api.getCheckIns(current.id);
          serverCheckIns = checkInRes.checkIns || [];
        } catch (e) {
          console.warn('Server check-ins fetch notice:', e.message);
        }

        // 2. Fetch local IndexedDB audit history & local tickets
        const localHistory = await offlineDbService.getScanHistory(100);
        const localTickets = await offlineDbService.getAllLocalTickets();

        // 3. Build comprehensive, unified check-in entries map
        const combinedMap = new Map();

        // Server check-ins
        serverCheckIns.forEach(ci => {
          const key = ci.entryId || ci.ticketNumber;
          combinedMap.set(key, ci);
        });

        // Local scans on this device
        localHistory.filter(h => h.status === 'valid' || h.status === 'locally_repeated').forEach(h => {
          const key = h.entryId || h.ticketNumber;
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
    const interval = setInterval(loadData, 5000);
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

        {/* Header Action Buttons (Organiser only: Refresh & Issue Passes) */}
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
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Issue Passes &amp; QR</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Issued Passes"
          value={totalPasses}
          subtitle="Registered attendees"
          icon={Ticket}
          color="blue"
        />
        <StatCard
          title="Checked-in Attendees"
          value={checkedInCount}
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

      {/* Operations Overview & Gate Breakdown */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Event Turnout &amp; Gate Breakdown</span>
          </h3>
          <Link to="/tickets" className="text-xs text-emerald-400 hover:underline flex items-center gap-1">
            <span>Passes &amp; QR Manifest</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Check-In Turnout</span>
            <span className="font-mono font-bold text-white">{checkedInCount} / {totalPasses} Attendees Entered ({attendancePercent}%)</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {(selectedEvent?.gates || ['Gate A', 'Gate B', 'Gate C']).map((gate) => {
              const countAtGate = checkIns.filter(c => (c.gateId || '').includes(gate.split(' ')[0] || gate)).length;
              return (
                <div key={gate} className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">{gate}</span>
                    <span className="text-[11px] text-slate-400">Terminal Active</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30">
                    {countAtGate} Scanned
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ATTENDEE ENTRY AUDIT HISTORY (Who Took Entry - Full Detailed List) */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Real-Time Gate Entries</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Attendee Entry History</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                {checkIns.length} Verified Entries
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Complete audit ledger of every attendee who entered through gate scanners with time and gate details.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={exportCheckInsCsv}
              disabled={checkIns.length === 0}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
              title="Download attendance list as CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
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
              placeholder="Search by attendee name or pass ID..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-400 font-mono">Filter Gate:</span>
            <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              {['ALL', 'Gate A', 'Gate B', 'Gate C'].map((g) => (
                <button
                  key={g}
                  onClick={() => setGateFilter(g)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    gateFilter === g
                      ? 'bg-emerald-600 text-white font-bold'
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
          <div className="py-14 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
            {checkIns.length === 0 ? (
              <div className="space-y-2">
                <p className="text-slate-300 font-semibold text-sm">No gate entries recorded yet.</p>
                <p className="text-slate-500 max-w-sm mx-auto">
                  When gate volunteers scan passes with their terminals, attendees will appear here live with timestamps and gate details.
                </p>
              </div>
            ) : (
              <p>No check-in entries match your search or gate filter.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Attendee Name</th>
                  <th className="py-3 px-4">Pass ID</th>
                  <th className="py-3 px-4">Pass Tier</th>
                  <th className="py-3 px-4">Gate</th>
                  <th className="py-3 px-4">Check-in Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Volunteer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
                {filteredCheckIns.slice().reverse().map((ci, index) => (
                  <tr key={ci.entryId || (ci.ticketNumber + '-' + index)} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{ci.attendeeName || 'Attendee'}</div>
                      <span className="text-[10px] text-slate-500 font-mono">Verified Attendee</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {ci.ticketNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[10px] font-semibold">
                        {ci.tier || 'VIP'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full bg-slate-950 text-slate-300 border border-slate-800 font-mono text-[11px] font-bold">
                        {ci.gateId || 'Gate A'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{ci.scannedAt ? new Date(ci.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{ci.scannedAt ? new Date(ci.scannedAt).toLocaleDateString() : ''}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        ci.status === 'valid'
                          ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-950/70 text-amber-400 border-amber-500/30'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{ci.status === 'valid' ? 'ENTRY GRANTED' : 'REPEATED'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px]">
                      {ci.volunteerName || 'Gate Volunteer'}
                    </td>
                  </tr>
                ))}
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
