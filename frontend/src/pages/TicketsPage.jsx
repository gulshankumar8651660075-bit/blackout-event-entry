import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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
  Printer, 
  QrCode, 
  Sparkles,
  Users,
  Zap,
  CheckCircle,
  ScanLine,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

// Single Pass Card Component with Live Visible QR Code & 1-Click Test Scan
const PassCardItem = ({ ticket, onPreview, onDelete, onTestScan, activeGate }) => {
  const [qrUrl, setQrUrl] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(
      ticket.qrPayload || ticket.ticketNumber,
      {
        width: 160,
        margin: 1.5,
        color: {
          dark: '#050813',
          light: '#ffffff'
        }
      },
      (err, url) => {
        if (!err && url && isMounted) {
          setQrUrl(url);
        }
      }
    );
    return () => { isMounted = false; };
  }, [ticket]);

  const handleDownload = (e) => {
    e.stopPropagation();
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `${ticket.ticketNumber}-${ticket.attendeeName.replace(/\s+/g, '_')}-Pass.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleScanClick = async (e) => {
    e.stopPropagation();
    setScanning(true);
    try {
      await onTestScan(ticket);
    } finally {
      setTimeout(() => setScanning(false), 500);
    }
  };

  return (
    <div className="glass-card rounded-3xl border border-white/10 overflow-hidden flex flex-col justify-between hover:border-emerald-500/50 transition-all duration-300 group shadow-xl relative">
      
      {/* Top Holographic Banner */}
      <div className="p-3.5 bg-gradient-to-r from-indigo-950/80 via-purple-950/80 to-slate-950/90 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase tracking-widest">
            OFFICIAL EVENT PASS
          </span>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-extrabold uppercase">
          {ticket.tier || 'VIP'}
        </span>
      </div>

      {/* QR Code Centerpiece */}
      <div className="p-5 flex flex-col items-center justify-center text-center bg-black/25">
        <div 
          onClick={() => onPreview(ticket)} 
          className="p-3 bg-white rounded-2xl shadow-2xl border border-white/40 cursor-pointer hover:scale-105 transition-transform group-hover:glow-emerald"
          title="Click to view &amp; print full high-res pass"
        >
          {qrUrl ? (
            <img src={qrUrl} alt={ticket.ticketNumber} className="w-32 h-32 block rounded-lg" />
          ) : (
            <div className="w-32 h-32 bg-slate-100 flex items-center justify-center text-slate-400">
              <QrCode className="w-8 h-8" />
            </div>
          )}
        </div>

        <div className="mt-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Pass Serial</span>
          <div className="font-mono font-extrabold text-emerald-400 text-lg tracking-wider">
            {ticket.ticketNumber}
          </div>
        </div>
      </div>

      {/* Attendee Info */}
      <div className="px-5 pb-4 space-y-1">
        <h4 className="font-extrabold text-white text-base truncate">{ticket.attendeeName}</h4>
        <p className="text-xs text-slate-400 truncate">{ticket.attendeeEmail || 'Verified Event Attendee'}</p>
        
        {ticket.status === 'checked_in' ? (
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full mt-1">
            <CheckCircle className="w-3 h-3" />
            <span>Checked In at {ticket.firstCheckIn?.gateId || activeGate || 'Gate A'}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-2.5 py-0.5 rounded-full mt-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Ready for Gate Scan</span>
          </div>
        )}
      </div>

      {/* Footer Action Buttons */}
      <div className="p-3 bg-black/40 border-t border-white/10 flex items-center justify-between gap-2">
        <button
          onClick={handleScanClick}
          disabled={scanning}
          title="Simulate instant entry scan into gate"
          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950"
        >
          <Zap className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Verifying...' : '⚡ Test Scan'}</span>
        </button>

        <button
          onClick={handleDownload}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
          title="Download PNG QR pass"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
        </button>

        <button
          onClick={() => onPreview(ticket)}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
          title="Print official pass badge"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onDelete(ticket.id, ticket.ticketNumber)}
          className="p-2 rounded-xl bg-white/5 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-white/10 transition"
          title="Delete pass"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const TicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activePreviewTicket, setActivePreviewTicket] = useState(null);
  
  // New ticket form state
  const [formData, setFormData] = useState({
    attendeeName: '',
    attendeeEmail: '',
    tier: 'VIP Access',
    customSerial: ''
  });

  const { activeGate, deviceId, user } = useAuth();
  const previewCanvasRef = useRef(null);

  // Load passes with persistent local fallback (IndexedDB + localStorage)
  const loadData = async () => {
    try {
      // 1. Instantly load locally saved passes so they NEVER disappear
      const localDexie = await offlineDbService.getAllLocalTickets();
      let localBackup = [];
      try {
        const raw = localStorage.getItem('blackout_persisted_passes');
        if (raw) localBackup = JSON.parse(raw);
      } catch (e) {}

      const combinedMap = new Map();
      [...localDexie, ...localBackup].forEach(t => {
        if (t && (t.id || t.ticketNumber)) {
          const key = t.id || t.ticketNumber;
          combinedMap.set(key, t);
        }
      });

      if (combinedMap.size > 0) {
        setTickets(Array.from(combinedMap.values()));
      }

      // 2. Fetch fresh updates from API
      const evRes = await api.getEvents();
      if (evRes.events && evRes.events.length > 0) {
        setEvents(evRes.events);
        const eid = selectedEventId || evRes.events[0].id;
        setSelectedEventId(eid);

        const tktRes = await api.getTickets(eid);
        if (tktRes.tickets) {
          tktRes.tickets.forEach(t => {
            const key = t.id || t.ticketNumber;
            combinedMap.set(key, t);
          });
          const merged = Array.from(combinedMap.values());
          setTickets(merged);
          localStorage.setItem('blackout_persisted_passes', JSON.stringify(merged));
          for (const item of merged) {
            await offlineDbService.saveSingleTicket(item);
          }
        }
      }
    } catch (err) {
      console.warn('Passes background sync notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedEventId]);

  // Render high-res QR canvas in preview modal
  useEffect(() => {
    if (activePreviewTicket && previewCanvasRef.current) {
      QRCode.toCanvas(
        previewCanvasRef.current,
        activePreviewTicket.qrPayload || activePreviewTicket.ticketNumber,
        {
          width: 250,
          margin: 1.5,
          color: {
            dark: '#050813',
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
    if (e) e.preventDefault();
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
        // Cache immediately
        await offlineDbService.saveSingleTicket(res.ticket);
        
        let persisted = [];
        try {
          const raw = localStorage.getItem('blackout_persisted_passes');
          if (raw) persisted = JSON.parse(raw);
        } catch (e) {}
        persisted.push(res.ticket);
        localStorage.setItem('blackout_persisted_passes', JSON.stringify(persisted));

        setTickets(prev => [res.ticket, ...prev.filter(t => t.id !== res.ticket.id)]);
        setShowCreateModal(false);
        setFormData({ attendeeName: '', attendeeEmail: '', tier: 'VIP Access', customSerial: '' });
        
        // Show pass preview modal
        setActivePreviewTicket(res.ticket);
      }
    } catch (err) {
      alert('Failed to generate ticket: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  // Instant Preset Chip Click (e.g. "+ Gulu Gupta")
  const handleApplyPreset = (name, tier) => {
    setFormData({
      attendeeName: name,
      attendeeEmail: `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      tier: tier,
      customSerial: ''
    });
  };

  const handleDeleteTicket = async (ticketId, ticketNumber) => {
    if (window.confirm(`Delete pass ${ticketNumber}?`)) {
      try {
        await api.deleteTicket(ticketId);
        
        let persisted = [];
        try {
          const raw = localStorage.getItem('blackout_persisted_passes');
          if (raw) persisted = JSON.parse(raw);
        } catch (e) {}
        persisted = persisted.filter(t => t.id !== ticketId && t.ticketNumber !== ticketNumber);
        localStorage.setItem('blackout_persisted_passes', JSON.stringify(persisted));

        setTickets(prev => prev.filter(t => t.id !== ticketId && t.ticketNumber !== ticketNumber));
        if (activePreviewTicket?.id === ticketId) {
          setActivePreviewTicket(null);
        }
      } catch (err) {
        alert('Delete notice: ' + err.message);
      }
    }
  };

  // 1-Click Immediate Test Scan into Active Gate
  const handleTestScan = async (ticket) => {
    try {
      const res = await offlineDbService.recordScan({
        ticket,
        deviceId,
        gateId: activeGate || 'Gate A',
        volunteerName: user ? user.name : 'Lead Organiser',
        eventId: ticket.eventId || selectedEventId
      });

      // Also trigger cloud sync in background if online
      try {
        await api.syncBatch({
          deviceId,
          gateId: activeGate || 'Gate A',
          entries: [{
            entryId: 'scan-' + Date.now(),
            ticketNumber: ticket.ticketNumber,
            ticketId: ticket.id,
            eventId: ticket.eventId,
            gateId: activeGate || 'Gate A',
            volunteerName: user ? user.name : 'Lead Organiser',
            scannedAt: new Date().toISOString()
          }]
        });
      } catch (syncErr) {
        // Offline mode is fine
      }

      // Celebrate
      sounds.playSuccess();
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });

      // Update state locally
      setTickets(prev => prev.map(t => {
        if (t.ticketNumber === ticket.ticketNumber || t.id === ticket.id) {
          return {
            ...t,
            status: 'checked_in',
            firstCheckIn: { gateId: activeGate || 'Gate A', scannedAt: new Date().toISOString() }
          };
        }
        return t;
      }));

      alert(`✅ Pass ${ticket.ticketNumber} (${ticket.attendeeName}) scanned successfully into ${activeGate || 'Gate A'}!\nStatus: ENTRY GRANTED\n\nCheck the Overview Dashboard to see this entry in the live ledger!`);
    } catch (err) {
      alert('Scan error: ' + err.message);
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

  const filteredTickets = tickets.filter(t => 
    (t.attendeeName || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.ticketNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.tier || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider mb-1">
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Attendee Passes &amp; QR Manifest</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Attendee Passes &amp; QR Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create attendee passes, view live QR codes, download or print badges, and run 1-click test scans.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="relative z-10 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition flex items-center gap-2 self-start md:self-auto group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          <span>+ Create Attendee Pass</span>
        </button>
      </div>

      {/* Control Bar: Search & Count */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search attendee name or pass serial..."
            className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-xs font-mono text-slate-400 font-semibold">Total Passes:</span>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
            {tickets.length} Registered
          </span>
        </div>
      </div>

      {/* Passes Grid: Real Live QR Codes visible on every card! */}
      {loading && tickets.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-mono text-slate-400">Loading attendee passes...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <Ticket className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No passes found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {search ? 'No passes matched your search term.' : 'Click "+ Create Attendee Pass" above to issue your first real QR event pass.'}
            </p>
          </div>
          {!search && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition inline-flex items-center gap-2 shadow-lg shadow-emerald-950"
            >
              <Plus className="w-4 h-4" />
              <span>Issue First Pass</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map((ticket) => (
            <PassCardItem
              key={ticket.id || ticket.ticketNumber}
              ticket={ticket}
              onPreview={setActivePreviewTicket}
              onDelete={handleDeleteTicket}
              onTestScan={handleTestScan}
              activeGate={activeGate}
            />
          ))}
        </div>
      )}

      {/* Modal 1: Issue New Pass Modal with 1-Click Presets */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0e1629] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">Issue Attendee Pass</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick 1-Click Name Presets for testing */}
            <div className="space-y-1.5 bg-black/30 p-3 rounded-2xl border border-white/5">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                Quick Fill Preset:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('Gulu Gupta', 'VIP Access')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 text-[11px] font-semibold border border-white/10 transition"
                >
                  + Gulu Gupta (VIP)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('Rahul Verma', 'General')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 text-[11px] font-semibold border border-white/10 transition"
                >
                  + Rahul Verma (Gen)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('Priya Sharma', 'VIP Access')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-purple-500/20 text-slate-300 hover:text-purple-300 text-[11px] font-semibold border border-white/10 transition"
                >
                  + Priya Sharma (VIP)
                </button>
              </div>
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
                  placeholder="e.g. Gulu Gupta"
                  className="w-full bg-[#070b16] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
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
                  placeholder="e.g. gulugupta@gmail.com"
                  className="w-full bg-[#070b16] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
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
                    className="w-full bg-[#070b16] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="VIP Access">VIP Access</option>
                    <option value="General">General Admission</option>
                    <option value="Crew">Crew / Backstage</option>
                    <option value="Media">Media / Press</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Pass Serial (Auto)
                  </label>
                  <input
                    type="text"
                    value={formData.customSerial}
                    onChange={(e) => setFormData({ ...formData, customSerial: e.target.value })}
                    placeholder="Auto: TKT-1001"
                    className="w-full bg-[#070b16] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
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
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-950"
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
          <div className="w-full max-w-sm bg-[#0e1629] border border-white/15 rounded-3xl overflow-hidden shadow-2xl space-y-3 animate-in fade-in zoom-in-95">
            
            {/* Top Pass Brand */}
            <div className="p-4 bg-black/50 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span className="font-mono font-bold text-xs text-white uppercase tracking-wider">Official Event Pass</span>
              </div>
              <button
                onClick={() => setActivePreviewTicket(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pass Body (Printable Card Area) */}
            <div className="px-6 py-5 text-center space-y-3">
              
              {/* QR Code Canvas */}
              <div className="inline-block p-3.5 bg-white rounded-2xl shadow-xl border border-white/40">
                <canvas ref={previewCanvasRef} className="block w-52 h-52"></canvas>
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
                <span className="inline-block mt-1 text-xs font-mono font-bold px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activePreviewTicket.tier} TIER
                </span>
              </div>
            </div>

            {/* Action Buttons: Test Scan & Download & Print */}
            <div className="p-4 bg-black/50 border-t border-white/10 space-y-2">
              <button
                type="button"
                onClick={() => handleTestScan(activePreviewTicket)}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>⚡ Test Scan Pass Into Gate</span>
              </button>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={downloadQrImage}
                  className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-white/10"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download Pass (PNG)</span>
                </button>

                <button
                  onClick={printPass}
                  className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 border border-white/10"
                  title="Print ticket pass"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print Pass</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
