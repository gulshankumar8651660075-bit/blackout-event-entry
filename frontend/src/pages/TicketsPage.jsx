import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { api } from '../utils/api';
import { offlineDbService } from '../db/dexieDb';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/audio';
import { 
  Ticket, 
  Plus, 
  Search, 
  Download, 
  Trash2, 
  Eye, 
  X, 
  CheckCircle, 
  Send, 
  Printer, 
  QrCode, 
  Sparkles,
  Users,
  Zap,
  ScanLine,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export const TicketsPage = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activePreviewTicket, setActivePreviewTicket] = useState(null);
  const [scanFeedback, setScanFeedback] = useState(null);
  
  // New ticket form state
  const [formData, setFormData] = useState({
    attendeeName: '',
    attendeeEmail: '',
    tier: 'VIP',
    customSerial: ''
  });

  const { activeGate, deviceId, user } = useAuth();
  const previewCanvasRef = useRef(null);

  const loadData = async () => {
    try {
      const evRes = await api.getEvents();
      if (evRes.events && evRes.events.length > 0) {
        setEvents(evRes.events);
        const eid = selectedEventId || evRes.events[0].id;
        setSelectedEventId(eid);

        const tktRes = await api.getTickets(eid);
        setTickets(tktRes.tickets || []);
      }
    } catch (err) {
      console.warn('Tickets load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedEventId]);

  // Render QR Canvas whenever activePreviewTicket changes
  useEffect(() => {
    if (activePreviewTicket && previewCanvasRef.current) {
      QRCode.toCanvas(
        previewCanvasRef.current,
        activePreviewTicket.qrPayload || activePreviewTicket.ticketNumber,
        {
          width: 240,
          margin: 1.5,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) console.error('QR canvas rendering error:', error);
        }
      );
    }
  }, [activePreviewTicket]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!formData.attendeeName.trim()) {
      alert('Please enter attendee name.');
      return;
    }

    setCreating(true);
    try {
      const res = await api.createTicket({
        eventId: selectedEventId,
        attendeeName: formData.attendeeName.trim(),
        attendeeEmail: formData.attendeeEmail.trim(),
        tier: formData.tier,
        ticketNumber: formData.customSerial.trim() || undefined
      });

      if (res.ticket) {
        // Also cache locally into IndexedDB immediately so it's scan-ready offline
        await offlineDbService.saveSingleTicket(res.ticket);
        
        setShowCreateModal(false);
        setFormData({ attendeeName: '', attendeeEmail: '', tier: 'VIP', customSerial: '' });
        setScanFeedback(null);
        await loadData();
        
        // Open preview modal immediately so user sees the newly generated QR pass
        setActivePreviewTicket(res.ticket);
      }
    } catch (err) {
      alert('Failed to generate ticket: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTicket = async (ticketId, ticketNumber) => {
    if (window.confirm(`Delete pass ${ticketNumber}?`)) {
      try {
        await api.deleteTicket(ticketId);
        await loadData();
        if (activePreviewTicket?.id === ticketId) {
          setActivePreviewTicket(null);
        }
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    }
  };

  const downloadQrImage = () => {
    if (!previewCanvasRef.current || !activePreviewTicket) return;
    const url = previewCanvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePreviewTicket.ticketNumber}-${activePreviewTicket.attendeeName.replace(/\s+/g, '_')}-Pass.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const printPass = () => {
    window.print();
  };

  const handleQuickScanTest = async (ticket) => {
    try {
      const res = await offlineDbService.recordScan({
        ticket,
        deviceId,
        gateId: activeGate,
        volunteerName: user ? user.name : 'Lead Organiser',
        eventId: ticket.eventId || selectedEventId
      });

      setScanFeedback(res);
      setActivePreviewTicket(ticket);

      if (res.status === 'valid') {
        sounds.playSuccess();
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      } else {
        sounds.playWarning();
      }
      await loadData();
    } catch (err) {
      alert('Scan simulation failed: ' + err.message);
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.attendeeName.toLowerCase().includes(search.toLowerCase()) ||
    t.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
    t.tier.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider mb-1">
            <Ticket className="w-3.5 h-3.5" />
            <span>Pass Management &amp; Generation</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Attendee Passes &amp; QR Codes
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Issue unique scannable QR passes for your event. All passes work 100% offline at the gate terminals.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Issue New QR Pass</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by attendee name or pass ID..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>Total Issued: <strong className="text-white font-mono">{filteredTickets.length}</strong></span>
          <span className="w-1 h-1 rounded-full bg-slate-600"></span>
          <span>Checked In: <strong className="text-emerald-400 font-mono">{filteredTickets.filter(t => t.status === 'checked_in').length}</strong></span>
        </div>
      </div>

      {/* Passes Grid */}
      {filteredTickets.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl border border-slate-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <Ticket className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No passes issued yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Your ticket list is clean. Click below to generate and issue your first attendee pass.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Issue First Pass</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map((t) => (
            <div
              key={t.id}
              className="glass-card rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition group"
            >
              {/* Header */}
              <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Serial</span>
                  <div className="font-mono font-bold text-emerald-400 text-base">{t.ticketNumber}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                    t.status === 'checked_in'
                      ? 'bg-blue-950/60 border-blue-500/40 text-blue-400'
                      : t.status === 'conflict'
                      ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                      : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                  }`}>
                    {t.status.toUpperCase()}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                    {t.tier}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 space-y-2">
                <div>
                  <span className="text-[11px] text-slate-400">Attendee</span>
                  <h4 className="font-bold text-white text-base truncate">{t.attendeeName}</h4>
                  {t.attendeeEmail && (
                    <p className="text-xs text-slate-400 truncate">{t.attendeeEmail}</p>
                  )}
                </div>

                {t.firstCheckIn && (
                  <div className="text-[11px] font-mono text-emerald-400/90 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                    ✓ Checked-in at {t.firstCheckIn.gateId}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => setActivePreviewTicket(t)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>View QR Pass</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleQuickScanTest(t)}
                    title="Simulate scan into active gate"
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Scan</span>
                  </button>
                  <button
                    onClick={() => handleDeleteTicket(t.id, t.ticketNumber)}
                    title="Delete pass"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Modal 1: Issue New Pass Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">Issue New Attendee Pass</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Attendee Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.attendeeName}
                  onChange={(e) => setFormData({ ...formData, attendeeName: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={formData.attendeeEmail}
                  onChange={(e) => setFormData({ ...formData, attendeeEmail: e.target.value })}
                  placeholder="e.g. rahul@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Pass Tier
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="VIP">VIP Access</option>
                    <option value="General">General Admission</option>
                    <option value="Early Bird">Early Bird</option>
                    <option value="Crew">Crew / Backstage</option>
                    <option value="Media">Media / Press</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Custom ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.customSerial}
                    onChange={(e) => setFormData({ ...formData, customSerial: e.target.value })}
                    placeholder="Auto: TKT-1001"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-950"
                >
                  {creating ? 'Generating QR...' : 'Generate & Issue Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: High-Resolution Printable QR Pass Preview */}
      {activePreviewTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl space-y-3 animate-in fade-in zoom-in-95">
            
            {/* Top Pass Brand */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span className="font-mono font-bold text-xs text-white uppercase tracking-wider">Official Event Pass</span>
              </div>
              <button
                onClick={() => {
                  setActivePreviewTicket(null);
                  setScanFeedback(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pass Body (Printable Card Area) */}
            <div className="px-6 py-4 text-center space-y-3">
              
              {/* QR Code Canvas */}
              <div className="inline-block p-3 bg-white rounded-2xl shadow-xl border border-slate-200">
                <canvas ref={previewCanvasRef} className="block w-48 h-48"></canvas>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Pass Serial</span>
                <h3 className="font-mono font-extrabold text-2xl text-emerald-400">
                  {activePreviewTicket.ticketNumber}
                </h3>
              </div>

              <div className="space-y-0.5">
                <h4 className="text-lg font-bold text-white">{activePreviewTicket.attendeeName}</h4>
                <p className="text-xs text-slate-400">{activePreviewTicket.attendeeEmail || 'Verified Attendee'}</p>
                <span className="inline-block mt-1 text-xs font-mono font-bold px-3 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                  {activePreviewTicket.tier} TIER
                </span>
              </div>

              {/* Instant Verification Verdict Banner if scanned */}
              {scanFeedback && (
                <div className={`p-3 rounded-2xl border text-left animate-in fade-in slide-in-from-bottom-2 ${
                  scanFeedback.status === 'valid'
                    ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
                    : 'bg-amber-950/90 border-amber-500/60 text-amber-200'
                }`}>
                  <div className="flex items-center gap-2 font-mono font-extrabold text-xs">
                    {scanFeedback.status === 'valid' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span>
                      {scanFeedback.status === 'valid' ? `✓ ENTRY GRANTED AT ${activeGate}` : '⚠️ ALREADY SCANNED AT GATE'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-300 mt-1 pl-6">
                    Speed: &lt;10ms &bull; Dexie.js Offline Queued
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons: Test Scan & Go to Terminal */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickScanTest(activePreviewTicket)}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ Test Scan Pass</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/scanner')}
                  className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-950"
                >
                  <ScanLine className="w-3.5 h-3.5" />
                  <span>Open Scanner →</span>
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={downloadQrImage}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Pass (PNG)</span>
                </button>

                <button
                  onClick={printPass}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
                  title="Print ticket pass"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
