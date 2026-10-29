import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { ConflictResolutionModal } from '../components/ConflictResolutionModal';
import { AlertTriangle, CheckCircle, Clock, ShieldAlert, ArrowRight, RefreshCw, Filter } from 'lucide-react';

export const ConflictCenterPage = () => {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeConflict, setActiveConflict] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'resolved'

  const loadConflicts = async () => {
    try {
      const res = await api.getConflicts();
      setConflicts(res.conflicts || []);
    } catch (err) {
      console.warn('Failed to load conflicts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadConflicts();
    const interval = setInterval(loadConflicts, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (conflictId, payload) => {
    await api.resolveConflict(conflictId, payload);
    await loadConflicts();
  };

  const filtered = conflicts.filter(c => {
    if (filter === 'pending') return c.status === 'pending_review';
    if (filter === 'resolved') return c.status === 'resolved';
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-rose-400 font-bold tracking-wider uppercase mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Slide 08 &amp; 12: Reconciliation Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Duplicate Conflict Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Isolated offline devices cannot block each other in real time. When internet reconnects, the central server flags duplicate scans across different gates for human adjudication.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setRefreshing(true); loadConflicts(); }}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
            {['all', 'pending', 'resolved'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  filter === f
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conflicts List */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl border border-slate-800 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No Conflicts in this View</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            To trigger a live conflict for the hackathon demo, follow the <strong>Live Demo Script</strong>: cut internet, scan ticket <code>TKT-1042</code> at Gate A, then scan it at Gate B, reconnect, and click Sync!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((conf) => {
            const isPending = conf.status === 'pending_review';
            const entries = conf.conflictingEntries || [];
            const entry1 = entries[0];
            const entry2 = entries[1];

            return (
              <div
                key={conf.id}
                className={`glass-card p-6 rounded-2xl border transition-all ${
                  isPending
                    ? 'border-rose-500/50 bg-rose-950/10 shadow-lg shadow-rose-950/20'
                    : 'border-slate-800 bg-slate-900/40 opacity-80'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  
                  {/* Left Column: Conflict Overview */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-extrabold text-xl text-emerald-400">
                        {conf.ticketNumber}
                      </span>
                      <span className="text-sm font-bold text-white">
                        {conf.attendeeName}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-mono uppercase font-bold border ${
                          isPending
                            ? 'bg-rose-950/80 border-rose-500/40 text-rose-300 animate-pulse'
                            : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        {isPending ? 'Pending Review' : 'Resolved'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-4">
                      <span>Total Check-in Attempts: <strong className="text-white">{entries.length}</strong></span>
                      <span>Flagged: {new Date(conf.createdAt).toLocaleTimeString()}</span>
                    </div>

                    {/* Side-by-side entries breakdown */}
                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Entry 1 */}
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-blue-500/30">
                        <span className="text-[10px] font-mono text-blue-400 uppercase font-bold">1st Scan: {entry1?.gateId || 'Gate A'}</span>
                        <div className="text-white font-medium mt-1">
                          Scanned at: {entry1?.scannedAt ? new Date(entry1.scannedAt).toLocaleTimeString() : 'N/A'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Device: {entry1?.deviceId} • Volunteer: {entry1?.volunteerName}
                        </div>
                      </div>

                      {/* Entry 2 */}
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-rose-500/30">
                        <span className="text-[10px] font-mono text-rose-400 uppercase font-bold">2nd Scan: {entry2?.gateId || 'Gate B'}</span>
                        <div className="text-white font-medium mt-1">
                          Scanned at: {entry2?.scannedAt ? new Date(entry2.scannedAt).toLocaleTimeString() : 'N/A'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Device: {entry2?.deviceId} • Volunteer: {entry2?.volunteerName}
                        </div>
                      </div>
                    </div>

                    {/* Resolution details if resolved */}
                    {!isPending && conf.resolutionDecision && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                        <span className="font-semibold text-emerald-400">Decision Applied: </span>
                        <span className="text-slate-200 capitalize font-mono">{conf.resolutionDecision.replace('_', ' ')}</span>
                        {conf.resolutionNotes && (
                          <p className="text-slate-400 mt-1 italic">"{conf.resolutionNotes}"</p>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1">
                          Resolved by {conf.resolvedBy} on {new Date(conf.resolvedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Action Button */}
                  <div className="shrink-0 flex items-center">
                    {isPending ? (
                      <button
                        onClick={() => setActiveConflict(conf)}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-950 transition flex items-center justify-center gap-2"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        <span>Adjudicate Conflict</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveConflict(conf)}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                      >
                        Re-open / Update Decision
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {activeConflict && (
        <ConflictResolutionModal
          conflict={activeConflict}
          onClose={() => setActiveConflict(null)}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
};
