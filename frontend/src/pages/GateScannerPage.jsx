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
  FileCheck
} from 'lucide-react';

export const GateScannerPage = () => {
  const { user, activeGate, updateGate, deviceId } = useAuth();
  
  // Offline State
  const [cachedEvent, setCachedEvent] = useState(null);
  const [cachedTicketsCount, setCachedTicketsCount] = useState(0);
  const [pendingScans, setPendingScans] = useState([]);
  const [scanHistory, setScanHistory] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);

  // Load offline state from Dexie.js
  const refreshLocalState = async () => {
    try {
      const ev = await offlineDbService.getCachedEvent();
      const count = await offlineDbService.getCachedTicketsCount();
      const pending = await offlineDbService.getPendingScans();
      const history = await offlineDbService.getScanHistory(15);

      setCachedEvent(ev);
      setCachedTicketsCount(count);
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

  // Slide 03 Step 01: Prepare device - Download event ticket list
  const handleDownloadEventData = async () => {
    setIsDownloading(true);
    try {
      // First fetch active event id
      const eventRes = await api.getEvents();
      if (!eventRes.events || eventRes.events.length === 0) {
        throw new Error('No active event found. Please seed or create an event in Dashboard.');
      }
      const eventId = eventRes.events[0].id;

      // Download full offline package
      const packageData = await api.downloadOfflinePackage(eventId);

      // Save to IndexedDB (Dexie.js)
      await offlineDbService.saveEventOfflinePackage(packageData.event, packageData.tickets);
      await refreshLocalState();

      alert(`✅ Device Prepared! Downloaded ${packageData.tickets.length} tickets for "${packageData.event.title}". You can now disconnect from the internet and scan tickets freely!`);
    } catch (err) {
      alert('Download failed: ' + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  // Slide 03 Step 02 & 03: Verify Locally & Save Entry
  const handleScanCode = async (rawCode) => {
    // 1. Look up in local Dexie IndexedDB
    const matchedTicket = await offlineDbService.findLocalTicket(rawCode);

    // 2. Record scan in local Dexie pending queue
    const result = await offlineDbService.recordScan({
      ticket: matchedTicket,
      deviceId,
      gateId: activeGate,
      volunteerName: user ? user.name : 'Gate Volunteer',
      eventId: cachedEvent ? cachedEvent.id : (matchedTicket ? matchedTicket.eventId : 'unknown')
    });

    await refreshLocalState();
    return result;
  };

  // Slide 03 Step 04 & Slide 07: Sync Pending Entries
  const handleSyncEntries = async () => {
    if (!isActuallyOnline()) {
      alert('⚠️ Cannot sync while offline. Reconnect or disable simulated blackout to upload pending entries.');
      return;
    }

    const pending = await offlineDbService.getPendingScans();
    if (pending.length === 0) {
      alert('ℹ️ No pending scans to sync.');
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

      // Slide 07: Mark entries as synced
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
      alert('Sync failed: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetLocalDb = async () => {
    if (window.confirm('Are you sure you want to clear all local offline data from this device?')) {
      await offlineDbService.resetAll();
      await refreshLocalState();
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold tracking-wider uppercase mb-1">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Slide 05 & 06: Gate Scanner Interface</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>{activeGate} Terminal</span>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              ID: {deviceId}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Validates QR codes in milliseconds completely offline using local browser IndexedDB storage.
          </p>
        </div>

        {/* Gate Switcher & Offline Download Action */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <select
              value={activeGate}
              onChange={(e) => updateGate(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="Gate A" className="bg-slate-900">Gate A (North VIP)</option>
              <option value="Gate B" className="bg-slate-900">Gate B (South General)</option>
              <option value="Gate C" className="bg-slate-900">Gate C (Fast Track)</option>
            </select>
          </div>

          <button
            onClick={handleDownloadEventData}
            disabled={isDownloading}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition flex items-center gap-2"
          >
            <DownloadCloud className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
            <span>{isDownloading ? 'Downloading...' : '1. Download Event Data'}</span>
          </button>

          <button
            onClick={handleSyncEntries}
            disabled={isSyncing || pendingScans.length === 0}
            className={`px-4 py-2.5 rounded-xl text-white text-xs font-bold transition flex items-center gap-2 ${
              pendingScans.length > 0
                ? 'bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-950 animate-pulse'
                : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
            }`}
          >
            <CloudUpload className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : `2. Sync Queue (${pendingScans.length})`}</span>
          </button>
        </div>
      </div>

      {/* Offline Readiness Indicators (Slide 05) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase">Local Database Status</span>
            <div className="text-sm font-bold text-white">
              {cachedEvent ? `${cachedTicketsCount} Tickets Cached` : 'No Data Cached Yet'}
            </div>
            <p className="text-[11px] text-slate-400">
              {cachedEvent ? cachedEvent.title : 'Click "Download Event Data" above'}
            </p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase">Pending Sync Queue</span>
            <div className="text-sm font-bold text-amber-300">
              {pendingScans.length} Scans Queued
            </div>
            <p className="text-[11px] text-slate-400">
              {pendingScans.length > 0 ? 'Will upload when internet returns' : 'All local scans synced'}
            </p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase">Volunteer Terminal</span>
            <div className="text-sm font-bold text-white">
              {user ? user.name : 'Volunteer Logged In'}
            </div>
            <p className="text-[11px] text-slate-400">Stationed at {activeGate}</p>
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
          {syncFeedback.details?.conflictsCreated?.length > 0 && (
            <div className="mt-2 text-xs font-mono text-amber-300 bg-black/40 p-2.5 rounded-lg border border-amber-500/20">
              ⚠️ Slide 08 Conflict Triggered! {syncFeedback.details.conflictsCreated.length} ticket was scanned across multiple gates. Head to the Conflict Center to review!
            </div>
          )}
        </div>
      )}

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: QR Camera & Manual Input */}
        <div className="lg:col-span-7">
          <QRScannerView
            onScanCode={handleScanCode}
            isOfflineReady={cachedTicketsCount > 0}
            activeGate={activeGate}
          />
        </div>

        {/* Right Column: Local Device Scan Stream */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Local Device Audit Feed</h3>
            </div>
            <button
              onClick={handleResetLocalDb}
              className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition"
              title="Clear device cache"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Local Cache</span>
            </button>
          </div>

          {scanHistory.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No scans recorded on this device yet.
              <br />
              Aim the camera or enter a ticket ID to begin.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {scanHistory.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    item.status === 'valid'
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                      : item.status === 'locally_repeated'
                      ? 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                      : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">{item.ticketNumber}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 font-mono">
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.attendeeName} ({item.tier})</p>
                  </div>

                  <div className="text-right font-mono text-[10px] text-slate-400">
                    <div>{new Date(item.scannedAt).toLocaleTimeString()}</div>
                    <div className="text-slate-500">{item.gateId}</div>
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
