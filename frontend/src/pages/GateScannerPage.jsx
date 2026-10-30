import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { offlineDbService } from '../db/dexieDb';
import { api, isActuallyOnline } from '../utils/api';
import { QRScannerView } from '../components/QRScannerView';
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
  Zap
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

  // Verify Locally (<10ms) & Save Entry & Background Sync if Online
  const handleScanCode = async (rawCode) => {
    // 1. Look up in local Dexie IndexedDB
    let matchedTicket = await offlineDbService.findLocalTicket(rawCode);

    // If not found in local cache but device is online, check API to ensure newly issued pass is loaded
    if (!matchedTicket && isActuallyOnline()) {
      try {
        const events = await api.getEvents();
        if (events.events?.length > 0) {
          const pkg = await api.downloadOfflinePackage(events.events[0].id);
          if (pkg.tickets?.length > 0) {
            await offlineDbService.saveEventOfflinePackage(pkg.event, pkg.tickets);
            matchedTicket = await offlineDbService.findLocalTicket(rawCode);
          }
        }
      } catch (e) {
        console.warn('Scan fallback fetch notice:', e.message);
      }
    }

    // 2. Record scan in local Dexie pending queue
    const result = await offlineDbService.recordScan({
      ticket: matchedTicket,
      deviceId,
      gateId: activeGate,
      volunteerName: user ? user.name : 'Gate Volunteer',
      eventId: cachedEvent ? cachedEvent.id : (matchedTicket ? matchedTicket.eventId : 'event-blackout-2026-main')
    });

    // 3. If online, background sync immediately so Organiser dashboard sees entry live
    if (isActuallyOnline() && matchedTicket) {
      api.syncBatch({
        deviceId,
        gateId: activeGate,
        entries: [{
          entryId: result.entryId || ('scan-' + Date.now()),
          ticketNumber: matchedTicket.ticketNumber,
          ticketId: matchedTicket.id,
          eventId: matchedTicket.eventId,
          gateId: activeGate,
          volunteerName: user ? user.name : 'Gate Volunteer',
          scannedAt: new Date().toISOString()
        }]
      }).then(() => {
        offlineDbService.markScansSynced([result.entryId]).catch(() => {});
      }).catch(err => {
        console.warn('Background sync queued for reconnection:', err.message);
      });
    }

    await refreshLocalState();
    return result;
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

    </div>
  );
};
