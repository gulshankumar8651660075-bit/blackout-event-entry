import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { GateScannerPage } from './pages/GateScannerPage';
import { TicketsPage } from './pages/TicketsPage';
import { ConflictCenterPage } from './pages/ConflictCenterPage';
import { DemoGuidePage } from './pages/DemoGuidePage';
import { LoginPage } from './pages/LoginPage';
import { offlineDbService } from './db/dexieDb';
import { api, isActuallyOnline } from './utils/api';

const AppContent = () => {
  const { user, loading, activeGate, deviceId } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);

  // Global manual sync trigger accessible from Navbar
  const handleGlobalSync = async () => {
    if (!isActuallyOnline()) {
      alert('⚠️ Cannot sync while offline. Reconnect or turn off simulated blackout.');
      return;
    }

    const pending = await offlineDbService.getPendingScans();
    if (pending.length === 0) {
      alert('ℹ️ No pending offline scans to upload.');
      return;
    }

    setIsSyncing(true);
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
      alert(`✅ Synced ${pending.length} entries successfully!\n${res.message}`);
    } catch (err) {
      alert('Sync failed: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060911] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-emerald-400">Loading BLACKOUT System...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#060911] flex flex-col">
      <Navbar onSyncTrigger={handleGlobalSync} isSyncing={isSyncing} />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/scanner" element={<GateScannerPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/conflicts" element={<ConflictCenterPage />} />
          <Route path="/demo" element={<DemoGuidePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
