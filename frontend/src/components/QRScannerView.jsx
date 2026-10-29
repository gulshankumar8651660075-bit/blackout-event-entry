import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { Camera, CameraOff, Keyboard, Volume2, VolumeX, CheckCircle, AlertTriangle, XCircle, RefreshCw, Zap, Sparkles } from 'lucide-react';
import { sounds } from '../utils/audio';

export const QRScannerView = ({ onScanCode, isOfflineReady = true, activeGate = 'Gate A' }) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [lastScanResult, setLastScanResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef(null);
  const scannerId = 'blackout-qr-reader';

  const stopCamera = async () => {
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
  };

  const startCamera = async () => {
    try {
      setLastScanResult(null);
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
          // If back camera found on phone, use it; otherwise use default available camera (laptop webcam)
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
          handleScanTrigger(decodedText);
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
          async (decodedText) => { handleScanTrigger(decodedText); },
          () => {}
        );
        setCameraActive(true);
      } catch (err2) {
        console.error('All camera attempts failed:', err2);
        alert('Webcam / Camera not accessible: ' + err2.message + '\n\nDon\'t worry! You can use the Quick Test Scan buttons below to test without a camera.');
        setCameraActive(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleScanTrigger = async (rawCode) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const result = await onScanCode(rawCode);
      setLastScanResult(result);

      if (audioEnabled) {
        if (result.status === 'valid') {
          sounds.playSuccess();
          // Trigger joyful confetti
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.7 }
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
      // Cooldown before next scan
      setTimeout(() => {
        setIsProcessing(false);
      }, 1000);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScanTrigger(manualCode.trim());
    setManualCode('');
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 z-10 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Camera Standby</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Click below to activate live webcam scanning, or use the 1-Click test buttons below.
                </p>
              </div>
              <button
                onClick={startCamera}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Start Camera Scanner</span>
              </button>
            </div>
          )}
        </div>

        {/* Scanner Control Bar */}
        {cameraActive && (
          <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">Aim reticle at QR code</span>
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

      {/* 1-Click Quick Scan Test Feeders (Slide 12: Instant testing without webcam) */}
      <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 space-y-2">
        <span className="text-[11px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" />
          <span>1-Click Test Scans (No Camera Needed)</span>
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleScanTrigger('TKT-1042')}
            disabled={isProcessing}
            className="p-2 rounded-xl bg-slate-900 hover:bg-emerald-950/60 border border-slate-700 hover:border-emerald-500/50 text-left transition"
          >
            <div className="text-[11px] font-mono font-bold text-emerald-400">TKT-1042</div>
            <div className="text-[10px] text-slate-400 truncate">Rohan (VIP)</div>
          </button>

          <button
            type="button"
            onClick={() => handleScanTrigger('TKT-1043')}
            disabled={isProcessing}
            className="p-2 rounded-xl bg-slate-900 hover:bg-blue-950/60 border border-slate-700 hover:border-blue-500/50 text-left transition"
          >
            <div className="text-[11px] font-mono font-bold text-blue-400">TKT-1043</div>
            <div className="text-[10px] text-slate-400 truncate">Priya (Gen)</div>
          </button>

          <button
            type="button"
            onClick={() => handleScanTrigger('TKT-1044')}
            disabled={isProcessing}
            className="p-2 rounded-xl bg-slate-900 hover:bg-purple-950/60 border border-slate-700 hover:border-purple-500/50 text-left transition"
          >
            <div className="text-[11px] font-mono font-bold text-purple-400">TKT-1044</div>
            <div className="text-[10px] text-slate-400 truncate">Aarav (VIP)</div>
          </button>
        </div>
      </div>

      {/* Manual Code Input Form (Slide 05: Enter ticket ID manually) */}
      <form onSubmit={handleManualSubmit} className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
          <span>Manual Ticket Check-in (Type e.g. 1042 or TKT-1042):</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Type 1042 or TKT-1042"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={!manualCode.trim() || isProcessing}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5"
          >
            {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Verify &amp; Enter</span>}
          </button>
        </div>
      </form>

      {/* RESULT FEEDBACK BANNER (Slide 05: Entry Status) */}
      {lastScanResult && (
        <div
          className={`p-5 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            lastScanResult.status === 'valid'
              ? 'bg-emerald-950/80 border-emerald-500/60 shadow-xl shadow-emerald-950/40 text-emerald-200'
              : lastScanResult.status === 'locally_repeated'
              ? 'bg-amber-950/80 border-amber-500/60 shadow-xl shadow-amber-950/40 text-amber-200'
              : lastScanResult.status === 'cancelled'
              ? 'bg-purple-950/80 border-purple-500/60 shadow-xl shadow-purple-950/40 text-purple-200'
              : 'bg-rose-950/80 border-rose-500/60 shadow-xl shadow-rose-950/40 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 shrink-0">
              {lastScanResult.status === 'valid' && <CheckCircle className="w-7 h-7 text-emerald-400" />}
              {lastScanResult.status === 'locally_repeated' && <AlertTriangle className="w-7 h-7 text-amber-400 animate-bounce" />}
              {lastScanResult.status === 'cancelled' && <XCircle className="w-7 h-7 text-purple-400" />}
              {lastScanResult.status === 'invalid' && <XCircle className="w-7 h-7 text-rose-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest font-extrabold">
                  {lastScanResult.status === 'valid' && '✓ ENTRY GRANTED (LOCAL OK)'}
                  {lastScanResult.status === 'locally_repeated' && '⚠️ ALREADY SCANNED ON THIS DEVICE'}
                  {lastScanResult.status === 'cancelled' && '⛔ TICKET CANCELLED'}
                  {lastScanResult.status === 'invalid' && '❌ UNRECOGNIZED TICKET'}
                </span>
                <span className="text-xs font-mono opacity-75">
                  {new Date(lastScanResult.scannedAt).toLocaleTimeString()}
                </span>
              </div>

              {lastScanResult.ticket ? (
                <div className="mt-2">
                  <div className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{lastScanResult.ticket.attendeeName}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/40 border border-white/20">
                      {lastScanResult.ticket.tier}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-300 mt-0.5">
                    Ticket ID: <span className="font-bold">{lastScanResult.ticket.ticketNumber}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-rose-300 mt-1">
                  Ticket code was not found in device cache.
                </p>
              )}

              <div className="mt-2 pt-2 border-t border-white/10 text-[11px] font-mono opacity-80 flex items-center justify-between">
                <span>Stored in Dexie.js (Pending Sync Queue)</span>
                <span>Gate: {activeGate}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
