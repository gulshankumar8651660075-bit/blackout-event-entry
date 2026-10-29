import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudLightning, RefreshCw } from 'lucide-react';
import { getSimulatedOffline, setSimulatedOffline } from '../utils/api';
import { offlineDbService } from '../db/dexieDb';

export const NetworkStatusBadge = ({ onSyncTrigger, isSyncing = false }) => {
  const [isSimulated, setIsSimulated] = useState(getSimulatedOffline());
  const [isBrowserOnline, setIsBrowserOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  const effectiveOnline = isBrowserOnline && !isSimulated;

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);
    const handleCustomChange = (e) => setIsSimulated(e.detail.isOffline);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('blackout:network-change', handleCustomChange);

    // Poll pending count in IndexedDB
    const checkPending = async () => {
      try {
        const pending = await offlineDbService.getPendingScans();
        setPendingCount(pending.length);
      } catch (e) {
        // ignore
      }
    };
    checkPending();
    const interval = setInterval(checkPending, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('blackout:network-change', handleCustomChange);
      clearInterval(interval);
    };
  }, []);

  const toggleSimulatedOffline = () => {
    const nextState = !isSimulated;
    setIsSimulated(nextState);
    setSimulatedOffline(nextState);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Network Status Indicator */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 ${
          effectiveOnline
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
            : 'bg-rose-950/70 border-rose-500/50 text-rose-300 animate-pulse'
        }`}
      >
        {effectiveOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>ONLINE</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-rose-400" />
            <span>BLACKOUT (OFFLINE)</span>
          </>
        )}
      </div>

      {/* Pending Sync Count Badge */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/60 border border-amber-500/40 text-amber-300">
          <CloudLightning className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
          <span>{pendingCount} Pending Sync</span>
          {effectiveOnline && onSyncTrigger && (
            <button
              onClick={onSyncTrigger}
              disabled={isSyncing}
              className="ml-1 p-0.5 hover:text-white transition"
              title="Sync now"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      )}

      {/* Hackathon Live Simulator Button */}
      <button
        onClick={toggleSimulatedOffline}
        title="Toggle simulated connection failure for hackathon judging demo"
        className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-all flex items-center gap-1.5 ${
          isSimulated
            ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-400 shadow-lg shadow-rose-950'
            : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-current inline-block"></span>
        {isSimulated ? 'Reconnect Network' : 'Cut Internet (Simulate)'}
      </button>
    </div>
  );
};
