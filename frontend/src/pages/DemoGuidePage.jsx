import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, setSimulatedOffline, getSimulatedOffline } from '../utils/api';
import { offlineDbService } from '../db/dexieDb';
import { useAuth } from '../context/AuthContext';
import { 
  PlayCircle, 
  CheckCircle2, 
  WifiOff, 
  Wifi, 
  QrCode, 
  DownloadCloud, 
  CloudUpload, 
  ShieldAlert, 
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';

export const DemoGuidePage = () => {
  const { activeGate, updateGate, deviceId, user } = useAuth();
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const markStepDone = (stepNum) => {
    if (!completedSteps.includes(stepNum)) {
      setCompletedSteps([...completedSteps, stepNum]);
    }
  };

  // STEP 1: Create demo event & 5 tickets
  const runStep1 = async () => {
    setBusy(true);
    setStatusMsg('Seeding demo event and 5 tickets...');
    try {
      await api.seedDemo();
      markStepDone(1);
      setActiveStep(2);
      setStatusMsg('✅ Step 1 Complete: Demo event created with 5 sample tickets (including TKT-1042).');
    } catch (err) {
      setStatusMsg('❌ Step 1 Failed: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  // STEP 2: Download data for gate
  const runStep2 = async () => {
    setBusy(true);
    setStatusMsg(`Downloading offline event package for ${activeGate}...`);
    try {
      const evRes = await api.getEvents();
      if (!evRes.events?.length) throw new Error('No events found. Run Step 1 first.');
      const eventId = evRes.events[0].id;

      const pkg = await api.downloadOfflinePackage(eventId);
      await offlineDbService.saveEventOfflinePackage(pkg.event, pkg.tickets);

      markStepDone(2);
      setActiveStep(3);
      setStatusMsg(`✅ Step 2 Complete: Downloaded ${pkg.tickets.length} tickets to device IndexedDB.`);
    } catch (err) {
      setStatusMsg('❌ Step 2 Failed: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  // STEP 3: Disconnect phone (Simulate Blackout)
  const runStep3 = () => {
    setSimulatedOffline(true);
    markStepDone(3);
    setActiveStep(4);
    setStatusMsg('✅ Step 3 Complete: Internet cut! BLACKOUT mode active. Device is completely offline.');
  };

  // STEP 4: Scan TKT-1042 at Gate A & Gate B
  const runStep4 = async (gateName) => {
    setBusy(true);
    setStatusMsg(`Scanning TKT-1042 at ${gateName} while offline...`);
    try {
      updateGate(gateName);
      const ticket = await offlineDbService.findLocalTicket('TKT-1042');
      if (!ticket) throw new Error('TKT-1042 not found in cache. Did you run Step 2?');

      const res = await offlineDbService.recordScan({
        ticket,
        deviceId: `DEV-${gateName.replace(/\s+/g, '').toUpperCase()}`,
        gateId: gateName,
        volunteerName: user ? user.name : `Volunteer (${gateName})`,
        eventId: ticket.eventId
      });

      setStatusMsg(`✅ Scanned TKT-1042 at ${gateName}! Local verdict: ${res.status.toUpperCase()}`);
      if (gateName === 'Gate B') {
        markStepDone(4);
        setActiveStep(5);
      }
    } catch (err) {
      setStatusMsg('❌ Step 4 Error: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  // STEP 5: Restore connection and sync
  const runStep5 = async () => {
    setBusy(true);
    setStatusMsg('Restoring internet connection and uploading pending scans...');
    try {
      setSimulatedOffline(false);
      const pending = await offlineDbService.getPendingScans();
      
      const payload = {
        deviceId,
        gateId: activeGate,
        entries: pending
      };

      const res = await api.syncBatch(payload);
      const syncedIds = pending.map(p => p.entryId);
      await offlineDbService.markScansSynced(syncedIds);
      await offlineDbService.purgeSyncedScans();

      markStepDone(5);
      setActiveStep(6);
      setStatusMsg(`✅ Step 5 Complete: Synced! Server detected ${res.results?.conflictsCreated?.length || 1} duplicate conflict.`);
    } catch (err) {
      setStatusMsg('❌ Step 5 Error: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Slide 12: Live Hackathon Demo Walkthrough</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Interactive Live Demonstration
        </h1>
        <p className="text-xs text-slate-400 max-w-2xl">
          Follow the exact 6-step script from Slide 12 to demonstrate offline gate entry, network blackout resilience, and post-sync conflict reconciliation to the judges.
        </p>

        {statusMsg && (
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-amber-300">
            {statusMsg}
          </div>
        )}
      </div>

      {/* Step Cards List */}
      <div className="space-y-4">
        
        {/* Step 1 */}
        <div className={`glass-card p-6 rounded-2xl border transition-all ${
          activeStep === 1 ? 'border-emerald-500/60 bg-emerald-950/20 shadow-xl shadow-emerald-950/30' : 'border-slate-800'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl font-mono font-bold text-sm shrink-0 ${
                completedSteps.includes(1)
                  ? 'bg-emerald-500 text-black'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                01
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Create One Event &amp; Generate 5 Tickets</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Generates "Electric Horizon Festival" and sample tickets (including <code>TKT-1042</code> for Rohan Sharma).
                </p>
              </div>
            </div>
            <button
              onClick={runStep1}
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <span>{completedSteps.includes(1) ? 'Re-run Step 1' : 'Execute Step 1'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step 2 */}
        <div className={`glass-card p-6 rounded-2xl border transition-all ${
          activeStep === 2 ? 'border-emerald-500/60 bg-emerald-950/20 shadow-xl shadow-emerald-950/30' : 'border-slate-800'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl font-mono font-bold text-sm shrink-0 ${
                completedSteps.includes(2)
                  ? 'bg-emerald-500 text-black'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                02
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Prepare Gate Device (Download Offline Data)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Populates browser IndexedDB (Dexie.js) with the cryptographic ticket verification table.
                </p>
              </div>
            </div>
            <button
              onClick={runStep2}
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>{completedSteps.includes(2) ? 'Re-download' : 'Execute Step 2'}</span>
            </button>
          </div>
        </div>

        {/* Step 3 */}
        <div className={`glass-card p-6 rounded-2xl border transition-all ${
          activeStep === 3 ? 'border-rose-500/60 bg-rose-950/20 shadow-xl shadow-rose-950/30' : 'border-slate-800'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl font-mono font-bold text-sm shrink-0 ${
                completedSteps.includes(3)
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                03
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Cut Network (Simulate Cell Tower Blackout)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Switches the app into simulated connection failure so all internet requests fail.
                </p>
              </div>
            </div>
            <button
              onClick={runStep3}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <WifiOff className="w-4 h-4" />
              <span>Simulate Blackout</span>
            </button>
          </div>
        </div>

        {/* Step 4 */}
        <div className={`glass-card p-6 rounded-2xl border transition-all ${
          activeStep === 4 ? 'border-amber-500/60 bg-amber-950/20 shadow-xl shadow-amber-950/30' : 'border-slate-800'
        }`}>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl font-mono font-bold text-sm shrink-0 ${
                completedSteps.includes(4)
                  ? 'bg-amber-500 text-black'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                04
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Use One Ticket Twice at Two Offline Gates</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Scan <code>TKT-1042</code> once at Gate A, then scan the same ticket at Gate B. Both devices report "Locally Valid" because neither has internet!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => runStep4('Gate A')}
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-2"
              >
                <span>4A. Scan at Gate A (Offline)</span>
              </button>

              <button
                onClick={() => runStep4('Gate B')}
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-2"
              >
                <span>4B. Scan at Gate B (Offline)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div className={`glass-card p-6 rounded-2xl border transition-all ${
          activeStep === 5 ? 'border-blue-500/60 bg-blue-950/20 shadow-xl shadow-blue-950/30' : 'border-slate-800'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl font-mono font-bold text-sm shrink-0 ${
                completedSteps.includes(5)
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                05
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Restore Connection &amp; Upload Pending Entries</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Re-enables connection and uploads pending scan batches. Central server flags duplicate conflict!
                </p>
              </div>
            </div>
            <button
              onClick={runStep5}
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <CloudUpload className="w-4 h-4" />
              <span>Restore &amp; Sync</span>
            </button>
          </div>
        </div>

        {/* Step 6 */}
        <div className={`glass-card p-6 rounded-2xl border transition-all ${
          activeStep === 6 ? 'border-rose-500/60 bg-rose-950/20 shadow-xl shadow-rose-950/30' : 'border-slate-800'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl font-mono font-bold text-sm shrink-0 ${
                completedSteps.includes(6)
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                06
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Review Conflict in Organiser Center</h3>
                <p className="text-xs text-slate-400 mt-1">
                  View the side-by-side audit trail (Gate A vs Gate B) and record an adjudication decision.
                </p>
              </div>
            </div>
            <Link
              to="/conflicts"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-rose-950"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Open Conflict Center</span>
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
};
