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

  const pendingCount = conflicts.filter(c => c.status === 'pending_review').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-2xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2 text-xs font-mono text-rose-400 font-bold tracking-wider uppercase mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Fraud &amp; Duplicate Protection</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Duplicate Check-In Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Detects screenshot sharing and duplicate passes scanned at multiple gates while offline. Review and approve genuine attendees or revoke fraudulent entries.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => { setRefreshing(true); loadConflicts(); }}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
            title="Refresh Conflicts"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-rose-400' : ''}`} />
          </button>

          <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-mono">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === 'all' ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({conflicts.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === 'pending' ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === 'resolved' ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Resolved
            </button>
          </div>
        </div>
      </div>

      {/* Main List */}
      {loading && conflicts.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-mono text-slate-400">Scanning for conflicts...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-16 rounded-3xl border border-white/10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Zero Duplicate Entries</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              {filter === 'all'
                ? 'All scanned attendee passes are clean and unique! If anyone shares a pass screenshot across gates during a blackout, it will be flagged here upon sync.'
                : 'No conflicts match the selected filter.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((conflict) => (
            <div
              key={conflict.id}
              className={`p-6 rounded-3xl border glass-panel transition-all shadow-xl ${
                conflict.status === 'pending_review'
                  ? 'border-rose-500/40 bg-gradient-to-r from-rose-950/20 to-transparent'
                  : 'border-white/10 bg-black/20 opacity-80'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-extrabold text-amber-400 text-lg">
                      {conflict.ticketNumber}
                    </span>
                    <span className="text-base font-bold text-white">
                      {conflict.attendeeName}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                      conflict.status === 'pending_review'
                        ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                        : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                    }`}>
                      {conflict.status === 'pending_review' ? 'FLAGGED FOR REVIEW' : 'RESOLVED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Scanned across {conflict.conflictingEntries.length} separate gate terminals while disconnected from cloud.
                  </p>
                </div>

                <button
                  onClick={() => setActiveConflict(conflict)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 self-start md:self-auto shadow-lg ${
                    conflict.status === 'pending_review'
                      ? 'bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white shadow-rose-950'
                      : 'bg-white/10 hover:bg-white/20 text-slate-200'
                  }`}
                >
                  <span>{conflict.status === 'pending_review' ? 'Adjudicate & Review' : 'View Decision'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Scanned Entries Details */}
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {conflict.conflictingEntries.map((entry, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-black/40 border border-white/5 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-amber-400">{entry.gateId}</span>
                      <span className="text-slate-400">{new Date(entry.scannedAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-[11px] text-slate-300">Volunteer: {entry.volunteerName}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conflict Resolution Modal */}
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
