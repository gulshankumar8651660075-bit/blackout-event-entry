import React, { useState } from 'react';
import { AlertTriangle, Check, X, ShieldAlert, ArrowRight, Clock, MapPin, User, Smartphone } from 'lucide-react';

export const ConflictResolutionModal = ({ conflict, onClose, onResolve }) => {
  const [decision, setDecision] = useState('accepted_first');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!conflict) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onResolve(conflict.id, { decision, notes });
      onClose();
    } catch (err) {
      alert('Failed to resolve conflict: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const entries = conflict.conflictingEntries || [];
  const entryA = entries[0];
  const entryB = entries[1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-rose-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-rose-400 font-bold">
                Slide 08: Duplicate Offline Entry Conflict
              </span>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Ticket: <span className="font-mono text-amber-400">{conflict.ticketNumber}</span>
                <span className="text-slate-400 font-normal">({conflict.attendeeName})</span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Side-by-Side Comparison (Slide 08 Table) */}
        <div className="p-6 space-y-6">
          <p className="text-sm text-slate-300">
            This ticket was scanned at two isolated offline gates before either device could sync. Review the audit trails below:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gate A / Entry 1 */}
            <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/20 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase">First Recorded Check-in</span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">Entry #1</span>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-amber-400" /> Gate Location:</span>
                  <span className="font-bold text-white">{entryA?.gateId || 'Gate A'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-400" /> Scan Time:</span>
                  <span className="font-mono text-amber-300">
                    {entryA?.scannedAt ? new Date(entryA.scannedAt).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-amber-400" /> Device ID:</span>
                  <span className="font-mono text-slate-300">{entryA?.deviceId || 'DEV-ALPHA'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-amber-400" /> Volunteer:</span>
                  <span className="text-slate-200">{entryA?.volunteerName || 'Volunteer A'}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-amber-500/10 text-amber-400 font-semibold text-[11px]">
                  ✓ Offline Result: Locally Valid
                </div>
              </div>
            </div>

            {/* Gate B / Entry 2 */}
            <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/20 space-y-3">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                <span className="text-xs font-mono font-bold text-rose-400 uppercase">Conflicting Check-in</span>
                <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">Entry #2</span>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-rose-400" /> Gate Location:</span>
                  <span className="font-bold text-white">{entryB?.gateId || 'Gate B'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-rose-400" /> Scan Time:</span>
                  <span className="font-mono text-amber-300">
                    {entryB?.scannedAt ? new Date(entryB.scannedAt).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-rose-400" /> Device ID:</span>
                  <span className="font-mono text-slate-300">{entryB?.deviceId || 'DEV-BETA'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-rose-400" /> Volunteer:</span>
                  <span className="text-slate-200">{entryB?.volunteerName || 'Volunteer B'}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-rose-500/10 text-rose-400 font-semibold text-[11px]">
                  ⚠️ Flagged After Sync: Duplicate Scan
                </div>
              </div>
            </div>
          </div>

          {/* Decision Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-800">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Organiser Resolution Decision
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className={`p-3 rounded-xl border cursor-pointer text-xs transition flex flex-col justify-between ${
                decision === 'accepted_first' 
                  ? 'bg-purple-950/60 border-purple-500 text-white shadow-md shadow-purple-950' 
                  : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}>
                <input
                  type="radio"
                  name="decision"
                  value="accepted_first"
                  checked={decision === 'accepted_first'}
                  onChange={() => setDecision('accepted_first')}
                  className="sr-only"
                />
                <span className="font-bold text-purple-400 mb-1">Accept First Only</span>
                <span className="text-[11px] text-slate-300">Approve Entry #1, flag Entry #2 as unauthorized pass-back.</span>
              </label>

              <label className={`p-3 rounded-xl border cursor-pointer text-xs transition flex flex-col justify-between ${
                decision === 'accepted_both' 
                  ? 'bg-amber-950/60 border-amber-500 text-white shadow-md shadow-amber-950' 
                  : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}>
                <input
                  type="radio"
                  name="decision"
                  value="accepted_both"
                  checked={decision === 'accepted_both'}
                  onChange={() => setDecision('accepted_both')}
                  className="sr-only"
                />
                <span className="font-bold text-amber-400 mb-1">Accept Both (Pass)</span>
                <span className="text-[11px] text-slate-300">Allow both entries (e.g. VIP multi-entry or permitted re-entry).</span>
              </label>

              <label className={`p-3 rounded-xl border cursor-pointer text-xs transition flex flex-col justify-between ${
                decision === 'revoked_all' 
                  ? 'bg-rose-950/60 border-rose-500 text-white shadow-md shadow-rose-950' 
                  : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}>
                <input
                  type="radio"
                  name="decision"
                  value="revoked_all"
                  checked={decision === 'revoked_all'}
                  onChange={() => setDecision('revoked_all')}
                  className="sr-only"
                />
                <span className="font-bold text-rose-400 mb-1">Revoke & Blacklist</span>
                <span className="text-[11px] text-slate-300">Fraudulent ticket sharing detected. Cancel ticket entirely.</span>
              </label>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Audit Notes / Reason</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Verified attendee ID at Gate A; Gate B attendee was impersonator"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold shadow-lg shadow-amber-950 transition flex items-center gap-2"
              >
                {submitting ? 'Saving...' : 'Confirm Resolution'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
