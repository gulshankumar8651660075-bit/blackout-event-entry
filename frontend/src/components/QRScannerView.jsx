import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { 
  Camera, 
  CameraOff, 
  Keyboard, 
  Volume2, 
  VolumeX, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Zap, 
  Upload, 
  X,
  UserCheck,
  ArrowRight
} from 'lucide-react';
import { sounds } from '../utils/audio';

export const QRScannerView = ({ 
  onScanCode, 
  isOfflineReady = true, 
  activeGate = 'Gate A',
  availableTickets = []
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [lastScanResult, setLastScanResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Camera & Debounce Guard Refs
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isLockedRef = useRef(false);
  const lastScannedCodeRef = useRef('');
  const lastScannedTimeRef = useRef(0);
  const resumeTimeoutRef = useRef(null);
  const scannerId = 'blackout-qr-reader';

  const stopCamera = async () => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Camera stop error:', err);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
    isLockedRef.current = false;
  };

  // Safe frame handler with synchronous debouncing & pause
  const onQrFrameDetected = async (decodedText) => {
    const clean = String(decodedText || '').trim();
    if (!clean) return;

    const now = Date.now();
    // 1. Synchronous Guard: Lock if another scan is in flight
    if (isLockedRef.current) return;

    // 2. Debounce: If the same code was scanned in the last 4 seconds, ignore repeated frames!
    if (clean === lastScannedCodeRef.current && (now - lastScannedTimeRef.current < 4000)) {
      return;
    }

    // Set locks immediately
    isLockedRef.current = true;
    lastScannedCodeRef.current = clean;
    lastScannedTimeRef.current = now;

    // 3. Pause video frame processing so camera doesn't keep hammering at 10fps
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.pause(true);
      }
    } catch (e) {
      console.warn('Camera pause notice:', e);
    }

    try {
      await handleScanTrigger(clean);
    } finally {
      // Clear any prior resume timeout
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);

      // Auto-unlock camera analysis after 3 seconds so volunteer can scan next attendee
      resumeTimeoutRef.current = setTimeout(() => {
        isLockedRef.current = false;
        try {
          if (scannerRef.current) {
            scannerRef.current.resume();
          }
        } catch (e) {}
      }, 3000);
    }
  };

  const startCamera = async () => {
    try {
      setLastScanResult(null);
      isLockedRef.current = false;
      lastScannedCodeRef.current = '';
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          await scannerRef.current.clear();
        } catch (e) {}
      }

      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;

      // Smart camera selection: check available cameras or fallback to user camera
      let cameraConfig = { facingMode: 'user' };
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const backCam = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear'));
          cameraConfig = backCam ? backCam.id : cameras[0].id;
        }
      } catch (camErr) {
        console.warn('Camera enumeration fallback:', camErr);
      }

      await scanner.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          onQrFrameDetected(decodedText);
        },
        () => {}
      );
      setCameraActive(true);
    } catch (err) {
      console.warn('Primary camera start failed, retrying with basic constraints:', err);
      try {
        const fallbackScanner = new Html5Qrcode(scannerId);
        scannerRef.current = fallbackScanner;
        await fallbackScanner.start(
          { facingMode: 'user' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => { onQrFrameDetected(decodedText); },
          () => {}
        );
        setCameraActive(true);
      } catch (err2) {
        console.error('All camera attempts failed:', err2);
        alert('Webcam / Camera not accessible: ' + err2.message + '\n\nDon\'t worry! You can use the 1-Click Test Scan buttons below or Upload QR Image to test.');
        setCameraActive(false);
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const fileScanner = new Html5Qrcode('blackout-file-scanner-temp');
      const decodedText = await fileScanner.scanFile(file, true);
      await handleScanTrigger(decodedText);
      try { await fileScanner.clear(); } catch(e) {}
    } catch (err) {
      alert('Could not detect a clear QR code in this image. You can enter the ticket number manually below.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleScanTrigger = async (rawCode) => {
    setIsProcessing(true);

    try {
      const result = await onScanCode(rawCode);
      setLastScanResult(result);

      if (audioEnabled && result) {
        if (result.status === 'valid') {
          sounds.playSuccess();
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.6 }
          });
        } else if (result.status === 'locally_repeated') {
          sounds.playWarning();
        } else {
          sounds.playError();
        }
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScanTrigger(manualCode.trim());
    setManualCode('');
  };

  const handleNextScan = () => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    setLastScanResult(null);
    isLockedRef.current = false;
    lastScannedCodeRef.current = '';
    try {
      if (scannerRef.current) {
        scannerRef.current.resume();
      }
    } catch (e) {}
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Hidden container for file scanner */}
      <div id="blackout-file-scanner-temp" className="hidden"></div>
      
      {/* Scanner Visual Container */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl">
        
        {/* Top Scanner HUD */}
        <div className="absolute top-0 left-0 right-0 z-20 p-3 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-white tracking-wide">{activeGate} SCANNER</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="p-1.5 rounded-lg bg-black/60 text-slate-300 hover:text-white border border-slate-700/50"
              title={audioEnabled ? 'Mute Sound' : 'Enable Sound'}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>

        {/* Video / Camera Render element */}
        <div className="relative min-h-[320px] bg-slate-900 flex items-center justify-center scanner-frame">
          <div id={scannerId} className="w-full h-full min-h-[320px]"></div>

          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 z-10 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Gate Camera Ready</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Activate webcam, upload a pass image, or use 1-Click test scans below.
                </p>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Live Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-2"
                >
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Upload QR Image</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scanner Control Bar */}
        {cameraActive && (
          <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">Aim reticle at attendee QR code</span>
            <button
              onClick={stopCamera}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <CameraOff className="w-3.5 h-3.5" />
              <span>Pause Camera</span>
            </button>
          </div>
        )}
      </div>

      {/* 1-Click Quick Scan Test Buttons for REAL Passes */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>1-Click Test Scans ({availableTickets.length} Passes Ready)</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Offline verify &lt;10ms</span>
        </div>

        {availableTickets.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableTickets.slice(0, 6).map((tkt) => (
              <button
                key={tkt.id || tkt.ticketNumber}
                type="button"
                onClick={() => handleScanTrigger(tkt.ticketNumber)}
                disabled={isProcessing}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-emerald-950/60 border border-slate-700 hover:border-emerald-500/50 text-left transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-emerald-400 group-hover:text-emerald-300">
                    {tkt.ticketNumber}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {tkt.tier || 'VIP'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 truncate font-semibold mt-1">
                  {tkt.attendeeName}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              No passes cached locally yet. Click <span className="text-emerald-400 font-semibold">1. Refresh Cache</span> above or issue passes in the Organiser Portal.
            </p>
          </div>
        )}
      </div>

      {/* Manual Code Input Form */}
      <form onSubmit={handleManualSubmit} className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
          <span>Manual Ticket Check-in (Type e.g. 1001 or TKT-1001):</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Type pass serial number (e.g. TKT-1001)"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={!manualCode.trim() || isProcessing}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950"
          >
            {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Verify &amp; Enter</span>}
          </button>
        </div>
      </form>

      {/* PROMINENT ATTENDEE ENTRY VERIFICATION CARD (Slide 05: Entry Status) */}
      {lastScanResult && (
        <div
          className={`p-5 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            lastScanResult.status === 'valid'
              ? 'bg-emerald-950/90 border-emerald-500/80 shadow-2xl shadow-emerald-950/50 text-emerald-200'
              : lastScanResult.status === 'locally_repeated'
              ? 'bg-amber-950/90 border-amber-500/80 shadow-2xl shadow-amber-950/50 text-amber-200'
              : lastScanResult.status === 'cancelled'
              ? 'bg-purple-950/90 border-purple-500/80 shadow-2xl shadow-purple-950/50 text-purple-200'
              : 'bg-rose-950/90 border-rose-500/80 shadow-2xl shadow-rose-950/50 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 shrink-0">
              {lastScanResult.status === 'valid' && <CheckCircle className="w-8 h-8 text-emerald-400" />}
              {lastScanResult.status === 'locally_repeated' && <AlertTriangle className="w-8 h-8 text-amber-400 animate-bounce" />}
              {lastScanResult.status === 'cancelled' && <XCircle className="w-8 h-8 text-purple-400" />}
              {lastScanResult.status === 'invalid' && <XCircle className="w-8 h-8 text-rose-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono uppercase tracking-widest font-black">
                  {lastScanResult.status === 'valid' && '✓ ENTRY GRANTED (VERIFIED OFFLINE)'}
                  {lastScanResult.status === 'locally_repeated' && '⚠️ REPEATED SCAN: ALREADY ENTERED'}
                  {lastScanResult.status === 'cancelled' && '⛔ TICKET CANCELLED'}
                  {lastScanResult.status === 'invalid' && '❌ UNRECOGNIZED / INVALID PASS'}
                </span>
                <button
                  onClick={handleNextScan}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                  title="Dismiss & Scan Next"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {lastScanResult.ticket ? (
                <div className="mt-3 bg-black/30 p-3.5 rounded-xl border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-extrabold text-white">
                      {lastScanResult.ticket.attendeeName}
                    </span>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                      {lastScanResult.ticket.tier || 'VIP'} TIER
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-300 flex items-center justify-between">
                    <span>Pass ID: <strong className="text-white font-bold">{lastScanResult.ticket.ticketNumber}</strong></span>
                    <span>Gate: <strong className="text-emerald-400 font-bold">{activeGate}</strong></span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {lastScanResult.ticket.attendeeEmail || 'Verified Attendee'}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-rose-300 mt-2 font-mono">
                  Ticket code was not found in device cache. Please check pass ID or re-sync tickets.
                </p>
              )}

              <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] font-mono opacity-80">
                  Speed: &lt;10ms (IndexedDB Instant Verify)
                </span>
                <button
                  onClick={handleNextScan}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition font-mono flex items-center gap-1.5 shadow-md shadow-emerald-950"
                >
                  <span>Ready for Next Scan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
