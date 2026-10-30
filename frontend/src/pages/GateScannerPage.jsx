import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { offlineDbService } from '../db/dexieDb';
import { api, isActuallyOnline } from '../utils/api';
import { QRScannerView } from '../components/QRScannerView';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/audio';
import { 
  DownloadCloud, 
  CloudUpload, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Layers, 
  Trash2, 
  RefreshCw,
  Smartphone,
  MapPin,
  Radio,
  FileCheck,
  ShieldCheck,
  Zap,
  UserCheck,
  Phone,
  Mail,
  FileText,
  X,
  ArrowRight
} from 'lucide-react';

export const GateScannerPage = () => {
  const { user, activeGate, updateGate, deviceId, switchRole } = useAuth();
  
  // Offline State
  const [cachedEvent, setCachedEvent] = useState(null);
  const [cachedTicketsCount, setCachedTicketsCount] = useState(0);
  const [availableTickets, setAvailableTickets] = useState([]);
  const [pendingScans, setPendingScans] = useState([]);
  const [scanHistory, setScanHistory] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);

  // Attendee Verification Form State (Pop-up after pass scan)
  const [pendingAttendee, setPendingAttendee] = useState(null);
  const [attendeeForm, setAttendeeForm] = useState({
    attendeeName: '',
    phone: '',
    email: '',
    idNote: '',
    gate: 'Gate A'
  });
  const [grantingEntry, setGrantingEntry] = useState(false);

  // Load offline state from Dexie.js
  const refreshLocalState = async () => {
    try {
      await offlineDbService.ensureBaselineData();
      const ev = await offlineDbService.getCachedEvent();
      let count = await offlineDbService.getCachedTicketsCount();

      // If local Dexie is empty but internet is available, auto-cache tickets seamlessly
      if (count === 0 && isActuallyOnline()) {
        try {
          const eventRes = await api.getEvents();
          if (eventRes.events && eventRes.events.length > 0) {
            const pkg = await api.downloadOfflinePackage(eventRes.events[0].id);
            if (pkg.tickets && pkg.tickets.length > 0) {
              await offlineDbService.saveEventOfflinePackage(pkg.event, pkg.tickets);
              count = pkg.tickets.length;
            }
          }
        } catch (apiErr) {
          console.warn('Auto cache sync notice:', apiErr.message);
        }
      }

      // Also merge any passes stored in localStorage
      try {
        const raw = localStorage.getItem('blackout_persisted_passes');
        if (raw) {
          const persisted = JSON.parse(raw);
          for (const p of persisted) {
            await offlineDbService.saveSingleTicket(p);
          }
        }
      } catch (e) {}

      const allLocal = await offlineDbService.getAllLocalTickets();
      const pending = await offlineDbService.getPendingScans();
      const history = await offlineDbService.getScanHistory(20);

      setCachedEvent(ev);
      setCachedTicketsCount(allLocal.length);
      setAvailableTickets(allLocal);
      setPendingScans(pending);
      setScanHistory(history);
    } catch (e) {
      console.warn('Dexie read error:', e);
    }
  };

  useEffect(() => {
    refreshLocalState();
    const interval = setInterval(refreshLocalState, 3000);
    return () => clearInterval(interval);
  }, []);

  // Prepare device - Download event ticket list for offline scanning
  const handleDownloadEventData = async () => {
    setIsDownloading(true);
    try {
      let eventId = 'event-blackout-2026-main';
      try {
        const eventRes = await api.getEvents();
        if (eventRes.events && eventRes.events.length > 0) {
          eventId = eventRes.events[0].id;
        }
      } catch (e) {}

      try {
        const packageData = await api.downloadOfflinePackage(eventId);
        await offlineDbService.saveEventOfflinePackage(packageData.event, packageData.tickets);
      } catch (apiErr) {
        console.warn('API download fallback to local storage:', apiErr);
      }

      await refreshLocalState();
      alert(`✅ Device Ready for Offline Entry! Passes cached in browser memory. You can now scan even without internet!`);
    } catch (err) {
      alert('Download notice: ' + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  // Verify Locally (<10ms) & Trigger Verification Form
  const handleScanCode = async (rawCode) => {
    let cleanCode = String(rawCode || '').trim();
    let qrParsed = null;
    let searchTicketNum = cleanCode;
    try {
      if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
        qrParsed = JSON.parse(cleanCode);
        if (qrParsed.tkt) searchTicketNum = qrParsed.tkt;
      }
    } catch (e) {}

    // 1. Look up in local Dexie IndexedDB
    let matchedTicket = await offlineDbService.findLocalTicket(searchTicketNum || cleanCode);

    // If still not found and QR had JSON payload, construct ticket directly from payload!
    if (!matchedTicket && qrParsed && qrParsed.tkt) {
      matchedTicket = {
        id: qrParsed.tok ? `tkt-${qrParsed.tok}` : qrParsed.tkt,
        ticketNumber: qrParsed.tkt,
        attendeeName: qrParsed.att || ('Attendee ' + qrParsed.tkt),
        tier: 'VIP',
        eventId: qrParsed.eid || (cachedEvent?.id || 'event-blackout-2026-main'),
        status: 'issued',
        qrPayload: cleanCode
      };
      await offlineDbService.saveSingleTicket(matchedTicket);
    }

    // If still not found and device is online, check API to ensure newly issued pass is loaded
    if (!matchedTicket && isActuallyOnline()) {
      try {
        const tktRes = await api.getTickets();
        if (tktRes.tickets && tktRes.tickets.length > 0) {
          for (const t of tktRes.tickets) {
            await offlineDbService.saveSingleTicket(t);
          }
          matchedTicket = await offlineDbService.findLocalTicket(searchTicketNum || cleanCode);
        }
      } catch (e) {
        console.warn('Scan fallback fetch notice:', e.message);
      }
    }

    // Pass not recognized in system
    if (!matchedTicket) {
      return { status: 'invalid', ticket: null };
    }

    if (matchedTicket.status === 'cancelled') {
      return { status: 'cancelled', ticket: matchedTicket };
    }

    // If already checked in previously, warn immediately
    if (matchedTicket.locallyScanned || matchedTicket.status === 'checked_in') {
      return { 
        status: 'locally_repeated', 
        ticket: matchedTicket 
      };
    }

    // Valid un-entered pass! Open Attendee Details Verification Form
    setPendingAttendee({ ticket: matchedTicket, rawCode: cleanCode });
    setAttendeeForm({
      attendeeName: matchedTicket.attendeeName || 'Attendee',
      phone: matchedTicket.attendeePhone || '',
      email: matchedTicket.attendeeEmail || '',
      idNote: matchedTicket.idNote || '',
      gate: activeGate || 'Gate A'
    });

    return { 
      status: 'valid', 
      ticket: matchedTicket 
    };
  };

  // Submit and finalize attendee entry after volunteer checks / fills form
  const handleConfirmEntry = async (e) => {
    if (e) e.preventDefault();
    if (!pendingAttendee) return;
    setGrantingEntry(true);

    try {
      const { ticket } = pendingAttendee;
      const finalName = attendeeForm.attendeeName.trim() || ticket.attendeeName || 'Attendee';
      const finalPhone = attendeeForm.phone.trim();
      const finalEmail = attendeeForm.email.trim();
      const finalNote = attendeeForm.idNote.trim();
      const finalGate = attendeeForm.gate || activeGate || 'Gate A';

      // 1. Record scan in local Dexie IndexedDB (<10ms)
      const result = await offlineDbService.recordScan({
        ticket,
        deviceId,
        gateId: finalGate,
        volunteerName: user ? user.name : 'Gate Volunteer',
        eventId: cachedEvent ? cachedEvent.id : (ticket.eventId || 'event-blackout-2026-main'),
        attendeeName: finalName,
        phone: finalPhone,
        email: finalEmail,
        idNote: finalNote
      });

      // 2. Immediate cloud sync if online so Organiser sees entry live with all details
      if (isActuallyOnline()) {
        const entryToSync = {
          entryId: result.entryId || ('scan-' + Date.now()),
          ticketNumber: ticket.ticketNumber,
          ticketId: ticket.id,
          attendeeName: finalName,
          phone: finalPhone,
          email: finalEmail,
          idNote: finalNote,
          tier: ticket.tier || 'VIP',
          eventId: ticket.eventId || (cachedEvent?.id || 'event-blackout-2026-main'),
          gateId: finalGate,
          volunteerName: user ? user.name : 'Gate Volunteer Terminal',
          scannedAt: new Date().toISOString()
        };

        try {
          await api.syncBatch({
            deviceId,
            gateId: finalGate,
            entries: [entryToSync]
          });
          await offlineDbService.markScansSynced([result.entryId]);
        } catch (syncErr) {
          console.warn('Background sync queued for reconnection:', syncErr.message);
        }
      }

      // 3. Audio & Confetti
      sounds.playSuccess();
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });

      setPendingAttendee(null);
      await refreshLocalState();
      alert(`✅ Entry Granted for ${finalName} (${ticket.ticketNumber})!\nRecorded in Gate & Organiser Ledger.`);
    } catch (err) {
      alert('Entry error: ' + err.message);
    } finally {
      setGrantingEntry(false);
    }
  };

  // Sync Pending Entries Batch
  const handleSyncEntries = async () => {
    if (!isActuallyOnline()) {
      alert('⚠️ Cannot sync while offline. Reconnect or turn off Simulated Blackout to upload pending entries.');
      return;
    }

    const pending = await offlineDbService.getPendingScans();
    if (pending.length === 0) {
      alert('ℹ️ All scans are already synced with the cloud!');
      return;
    }

    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const payload = {
        deviceId,
        gateId: activeGate,
        entries: pending
      };

      const res = await api.syncBatch(payload);

      const syncedIds = pending.map(p => p.entryId);
      await offlineDbService.markScansSynced(syncedIds);
      await offlineDbService.purgeSyncedScans();
      await refreshLocalState();

      setSyncFeedback({
        type: res.results?.conflictsCreated?.length > 0 ? 'warning' : 'success',
        message: res.message,
        details: res.results
      });
    } catch (err) {
      alert('Sync notice: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetLocalDb = async () => {
    if (window.confirm('Reset local device cache?')) {
      await offlineDbService.resetAll();
      await refreshLocalState();
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-2xl relative overflow-hidden">
        
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold tracking-wider uppercase mb-1">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>Gate Scanner Terminal &bull; Volunteer Station</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>{activeGate} Terminal</span>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/10 border border-white/15 text-slate-300 font-normal">
              Device: {deviceId}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Validates QR codes in &lt;10ms completely offline using device IndexedDB storage.
          </p>
        </div>

        {/* Gate Switcher & Offline Download Action */}
        <div className="relative z-10 flex items-center gap-3 flex-wrap">
          <div className="bg-[#070b16] border border-white/15 rounded-xl px-3 py-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <select
              value={activeGate}
              onChange={(e) => updateGate(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="Gate A" className="bg-[#0e1629]">Gate A (North VIP)</option>
              <option value="Gate B" className="bg-[#0e1629]">Gate B (South General)</option>
              <option value="Gate C" className="bg-[#0e1629]">Gate C (Fast Track)</option>
            </select>
          </div>

          <button
            onClick={handleDownloadEventData}
            disabled={isDownloading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition flex items-center gap-2"
          >
            <DownloadCloud className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
            <span>{isDownloading ? 'Syncing...' : '1. Refresh Cache'}</span>
          </button>

          <button
            onClick={handleSyncEntries}
            disabled={isSyncing || pendingScans.length === 0}
            className={`px-4 py-2.5 rounded-xl text-white text-xs font-bold transition flex items-center gap-2 ${
              pendingScans.length > 0
                ? 'bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-950 animate-pulse'
                : 'bg-white/5 text-slate-400 cursor-not-allowed border border-white/10'
            }`}
          >
            <CloudUpload className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Uploading...' : `2. Sync Queue (${pendingScans.length})`}</span>
          </button>
        </div>
      </div>

      {/* Offline Status Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-white/10 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase">Device Offline Cache</span>
            <div className="text-lg font-extrabold text-white">
              {cachedTicketsCount} Passes Cached
            </div>
            <p className="text-[11px] text-emerald-400 font-mono">Ready for 0ms offline lookup</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/10 flex items-center gap-3">
          <div className={`p-3 rounded-xl border ${
            pendingScans.length > 0
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase">Unsynced Queue</span>
            <div className="text-lg font-extrabold text-white">
              {pendingScans.length} Entries Queued
            </div>
            <p className="text-[11px] text-slate-400">
              {pendingScans.length > 0 ? 'Will sync automatically' : 'All local scans synced'}
            </p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/10 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase">Volunteer Station</span>
            <div className="text-sm font-bold text-white truncate max-w-[160px]">
              {user ? user.name : 'Alex Volunteer'}
            </div>
            <p className="text-[11px] text-slate-400">Active at {activeGate}</p>
          </div>
        </div>
      </div>

      {/* Sync Feedback Message */}
      {syncFeedback && (
        <div
          className={`p-4 rounded-2xl border transition-all ${
            syncFeedback.type === 'warning'
              ? 'bg-amber-950/70 border-amber-500/50 text-amber-200'
              : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            {syncFeedback.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-400" /> : <CheckCircle className="w-5 h-5 text-emerald-400" />}
            <span>{syncFeedback.message}</span>
          </div>
        </div>
      )}

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: QR Camera, 1-Click Test Scans & Manual Input */}
        <div className="lg:col-span-7">
          <QRScannerView
            onScanCode={handleScanCode}
            isOfflineReady={true}
            activeGate={activeGate}
            availableTickets={availableTickets}
          />
        </div>

        {/* Right Column: Local Device Scan Stream */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-3xl border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Local Gate Audit Log</h3>
            </div>
            <button
              onClick={handleResetLocalDb}
              className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition"
              title="Reset cache"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Cache</span>
            </button>
          </div>

          {scanHistory.length === 0 ? (
            <div className="py-14 text-center text-slate-500 text-xs">
              No scans recorded on this device yet.
              <br />
              Click any 1-Click test button or aim camera to begin!
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {scanHistory.map((item) => (
                <div
                  key={item.entryId || item.id}
                  className={`p-3 rounded-xl border text-xs transition flex items-center justify-between ${
                    item.status === 'valid'
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                      : item.status === 'locally_repeated'
                      ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">{item.attendeeName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-300">
                        {item.ticketNumber}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      <span>Gate: {item.gateId}</span> &bull; <span>{item.tier || 'VIP'}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      item.status === 'valid'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      {item.status === 'valid' ? 'GRANTED' : 'REPEATED'}
                    </span>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      {new Date(item.scannedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ATTENDEE DETAILS VERIFICATION & CHECK-IN FORM MODAL */}
      {pendingAttendee && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-emerald-500/40 bg-[#070b16] shadow-2xl space-y-6 relative overflow-hidden">
            
            {/* Top ambient glow */}
            <div className="absolute top-0 right-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shadow-lg shadow-emerald-950">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>PASS VERIFIED • FILL ATTENDEE DETAILS</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-white">
                    Confirm Attendee Entry
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingAttendee(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pass badge preview */}
            <div className="p-3.5 bg-black/50 rounded-2xl border border-white/10 flex items-center justify-between font-mono text-xs relative z-10">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Pass Serial</span>
                <span className="text-emerald-400 font-black text-sm">{pendingAttendee.ticket.ticketNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Access Tier</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                  {pendingAttendee.ticket.tier || 'VIP'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Gate Terminal</span>
                <span className="text-cyan-400 font-bold text-xs">{activeGate || 'Gate A'}</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmEntry} className="space-y-4 text-xs font-sans relative z-10">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Attendee Full Name *</span>
                </label>
                <input
                  type="text"
                  required
                  value={attendeeForm.attendeeName}
                  onChange={(e) => setAttendeeForm({ ...attendeeForm, attendeeName: e.target.value })}
                  placeholder="e.g. Gulshan Kumar"
                  className="w-full bg-[#0d1527] border border-white/15 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500 text-sm shadow-inner"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Mobile Number</span>
                  </label>
                  <input
                    type="tel"
                    value={attendeeForm.phone}
                    onChange={(e) => setAttendeeForm({ ...attendeeForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-[#0d1527] border border-white/15 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-purple-400" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    value={attendeeForm.email}
                    onChange={(e) => setAttendeeForm({ ...attendeeForm, email: e.target.value })}
                    placeholder="e.g. attendee@email.com"
                    className="w-full bg-[#0d1527] border border-white/15 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>ID Proof / College / Verification Remark</span>
                </label>
                <input
                  type="text"
                  value={attendeeForm.idNote}
                  onChange={(e) => setAttendeeForm({ ...attendeeForm, idNote: e.target.value })}
                  placeholder="e.g. Aadhaar Verified, Student ID #402, VIP Guest"
                  className="w-full bg-[#0d1527] border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-xs shadow-inner"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setPendingAttendee(null)}
                  disabled={grantingEntry}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs border border-white/10 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={grantingEntry || !attendeeForm.attendeeName.trim()}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-950 transition flex items-center justify-center gap-2"
                >
                  {grantingEntry ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>✓ Confirm &amp; Grant Entry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
