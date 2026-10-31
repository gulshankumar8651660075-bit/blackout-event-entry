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
    <div className="glass-card rounded-3xl border border-white/10 overflow-hidden flex flex-col justify-between hover:border-amber-500/50 transition-all duration-300 group shadow-xl relative">
      
      {/* Top Holographic Banner */}
      <div className="p-3.5 bg-gradient-to-r from-purple-950/80 via-rose-950/80 to-slate-950/90 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-mono text-amber-300 font-bold uppercase tracking-widest">
            OFFICIAL EVENT PASS
          </span>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-extrabold uppercase">
          {ticket.tier || 'VIP'}
        </span>
      </div>

      {/* QR Code Centerpiece */}
      <div className="p-5 flex flex-col items-center justify-center text-center bg-black/25">
        <div 
          onClick={() => onPreview(ticket)} 
          className="p-3 bg-white rounded-2xl shadow-2xl border border-white/40 cursor-pointer hover:scale-105 transition-transform group-hover:glow-gold"
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
          <div className="font-mono font-extrabold text-amber-400 text-lg tracking-wider">
            {ticket.ticketNumber}
          </div>
        </div>
      </div>

      {/* Attendee Info */}
      <div className="px-5 pb-4 space-y-1">
        <h4 className="font-extrabold text-white text-base truncate">{ticket.attendeeName}</h4>
        <div className="flex items-center gap-2 text-xs text-slate-400 truncate flex-wrap">
          {(ticket.attendeePhone || ticket.phone) && (
            <span className="text-amber-300 font-mono font-medium">{ticket.attendeePhone || ticket.phone}</span>
          )}
          {ticket.attendeeEmail && <span>&bull; {ticket.attendeeEmail}</span>}
        </div>
        {(ticket.idNote || ticket.note) && (
          <p className="text-[10px] text-amber-400/80 truncate font-mono bg-amber-950/30 px-2 py-0.5 rounded border border-amber-500/20 w-fit">
            {ticket.idNote || ticket.note}
          </p>
        )}
        
        {ticket.status === 'checked_in' ? (
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2.5 py-0.5 rounded-full mt-1">
            <CheckCircle className="w-3 h-3" />
            <span>Checked In at {ticket.firstCheckIn?.gateId || activeGate || 'Gate A'}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-purple-400 bg-purple-950/40 border border-purple-500/20 px-2.5 py-0.5 rounded-full mt-1">
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
          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/60"
        >
          <Zap className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Verifying...' : '⚡ Test Scan'}</span>
        </button>

        <button
          onClick={handleDownload}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
          title="Download PNG QR pass"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
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
  const [showMasterEventQr, setShowMasterEventQr] = useState(false);
  const [masterQrUrl, setMasterQrUrl] = useState('');
  
  // New ticket form state
  const [formData, setFormData] = useState({
    attendeeName: '',
    attendeePhone: '',
    attendeeEmail: '',
    idNote: '',
    tier: 'VIP Access',
    customSerial: ''
  });

  const { activeGate, deviceId, user } = useAuth();
  const previewCanvasRef = useRef(null);

  const handleOpenMasterQr = async () => {
    const currentEv = events.find(e => e.id === selectedEventId) || events[0];
    if (!currentEv) return;
    const payload = JSON.stringify({
      type: 'event_entry',
      eid: currentEv.id,
      title: currentEv.title,
      venue: currentEv.venue,
      date: currentEv.date
    });
    try {
      const url = await QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: { dark: '#050813', light: '#ffffff' }
      });
      setMasterQrUrl(url);
      setShowMasterEventQr(true);
    } catch (e) {}
  };

  // Load passes with persistent local fallback (IndexedDB + localStorage scoped to current user)
  const loadData = async () => {
    try {
      // 1. Fetch events for this organizer
      const evRes = await api.getEvents();
      const eventList = evRes.events || [];
      setEvents(eventList);

      if (eventList.length === 0) {
        setTickets([]);
        setLoading(false);
        return;
      }

      const activeEid = selectedEventId && eventList.some(e => e.id === selectedEventId)
        ? selectedEventId
        : eventList[0].id;

      if (activeEid !== selectedEventId) {
        setSelectedEventId(activeEid);
      }

      const userKey = user ? `blackout_passes_${user.id}_${activeEid}` : `blackout_persisted_${activeEid}`;

      // 2. Fetch fresh updates from API strictly for activeEid
      const combinedMap = new Map();
      let serverTickets = [];
      try {
        const tktRes = await api.getTickets(activeEid);
        serverTickets = (tktRes.tickets || []).filter(t => t.eventId === activeEid);
      } catch (e) {}

      serverTickets.forEach(t => {
        const key = t.id || t.ticketNumber;
        combinedMap.set(key, t);
      });

      // 3. Fallback to local Dexie tickets strictly for this event
      const localDexie = await offlineDbService.getAllLocalTickets();
      localDexie
        .filter(t => t.eventId === activeEid)
        .forEach(t => {
          const key = t.id || t.ticketNumber;
          if (!combinedMap.has(key)) combinedMap.set(key, t);
        });

      // 4. LocalStorage backup strictly for this event
      try {
        const raw = localStorage.getItem(userKey);
        if (raw) {
          const localBackup = JSON.parse(raw);
          localBackup
            .filter(t => t.eventId === activeEid)
            .forEach(t => {
              const key = t.id || t.ticketNumber;
              if (!combinedMap.has(key)) combinedMap.set(key, t);
            });
        }
      } catch (e) {}

      const merged = Array.from(combinedMap.values());
      setTickets(merged);
      localStorage.setItem(userKey, JSON.stringify(merged));
      for (const item of merged) {
        await offlineDbService.saveSingleTicket(item);
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
        attendeePhone: formData.attendeePhone.trim(),
        attendeeEmail: formData.attendeeEmail.trim(),
        idNote: formData.idNote.trim(),
        tier: formData.tier,
        ticketNumber: formData.customSerial.trim() || undefined
      });

      if (res.ticket) {
        // Cache immediately
        await offlineDbService.saveSingleTicket(res.ticket);
        
        let persisted = [];
        const storageKey = user ? `blackout_passes_${user.id}` : 'blackout_persisted_passes';
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) persisted = JSON.parse(raw);
        } catch (e) {}
        persisted.push(res.ticket);
        localStorage.setItem(storageKey, JSON.stringify(persisted));

        setTickets(prev => [res.ticket, ...prev.filter(t => t.id !== res.ticket.id)]);
        setShowCreateModal(false);
        setFormData({ attendeeName: '', attendeePhone: '', attendeeEmail: '', idNote: '', tier: 'VIP Access', customSerial: '' });
        
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
  const handleApplyPreset = (name, tier, phone = '9876543210', idNote = 'Govt ID Verified') => {
    setFormData({
      attendeeName: name,
      attendeePhone: phone,
      attendeeEmail: `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      idNote: idNote,
      tier: tier,
      customSerial: ''
    });
  };

  const handleDeleteTicket = async (ticketId, ticketNumber) => {
    if (window.confirm(`Delete pass ${ticketNumber}?`)) {
      try {
        // 1. Delete from Server
        try {
          await api.deleteTicket(ticketId);
        } catch (apiErr) {
          console.warn('Server ticket delete notice:', apiErr.message);
        }
        
        // 2. Delete from local IndexedDB
        await offlineDbService.deleteSingleTicket(ticketId, ticketNumber);

        // 3. Delete from localStorage
        const storageKey = user ? `blackout_passes_${user.id}` : 'blackout_persisted_passes';
        let persisted = [];
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) persisted = JSON.parse(raw);
        } catch (e) {}
        persisted = persisted.filter(t => t.id !== ticketId && t.ticketNumber !== ticketNumber);
        localStorage.setItem(storageKey, JSON.stringify(persisted));

        // 4. Update UI State immediately
        setTickets(prev => prev.filter(t => t.id !== ticketId && t.ticketNumber !== ticketNumber));
        if (activePreviewTicket?.id === ticketId || activePreviewTicket?.ticketNumber === ticketNumber) {
          setActivePreviewTicket(null);
        }

        alert(`✅ Pass ${ticketNumber} deleted successfully!`);
      } catch (err) {
        alert('Delete notice: ' + err.message);
      }
    }
  };

  // Clear all passes for fresh start
  const handleClearAllTickets = async () => {
    if (tickets.length === 0) return;
    if (window.confirm(`Delete all ${tickets.length} passes and clear the manifest?`)) {
      try {
        for (const t of tickets) {
          try { await api.deleteTicket(t.id); } catch(e) {}
          await offlineDbService.deleteSingleTicket(t.id, t.ticketNumber);
        }
        const storageKey = user ? `blackout_passes_${user.id}` : 'blackout_persisted_passes';
        localStorage.removeItem(storageKey);
        localStorage.removeItem('blackout_persisted_passes');
        setTickets([]);
        setActivePreviewTicket(null);
        alert('✅ All passes cleared successfully.');
      } catch (err) {
        alert('Clear error: ' + err.message);
      }
    }
  };

  // 1-Click Immediate Test Scan into Active Gate
  const handleTestScan = async (ticket) => {
    try {
      const attName = ticket.attendeeName || 'Attendee';
      const attPhone = ticket.attendeePhone || ticket.phone || '';
      const attEmail = ticket.attendeeEmail || ticket.email || '';
      const attNote = ticket.idNote || ticket.note || '';
      const attTier = ticket.tier || 'VIP Access';
      const evId = ticket.eventId || selectedEventId;

      const res = await offlineDbService.recordScan({
        ticket,
        deviceId,
        gateId: activeGate || 'Gate A',
        volunteerName: user ? user.name : 'Lead Organiser',
        eventId: evId,
        attendeeName: attName,
        phone: attPhone,
        email: attEmail,
        idNote: attNote
      });

      // Also trigger cloud sync in background if online
      try {
        await api.syncBatch({
          deviceId,
          gateId: activeGate || 'Gate A',
          entries: [{
            entryId: res.entryId || ('scan-' + Date.now()),
            ticketNumber: ticket.ticketNumber,
            ticketId: ticket.id,
            attendeeName: attName,
            phone: attPhone,
            email: attEmail,
            idNote: attNote,
            tier: attTier,
            eventId: evId,
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

      alert(`✅ Pass ${ticket.ticketNumber} (${attName}) scanned successfully into ${activeGate || 'Gate A'}!\nStatus: ENTRY GRANTED\n\nCheck the Overview Dashboard to see this entry in the live ledger!`);
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
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold uppercase tracking-wider mb-1">
            <QrCode className="w-3.5 h-3.5 text-amber-400" />
            <span>Attendee Passes &amp; QR Manifest</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Attendee Passes &amp; QR Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create attendee passes, view live QR codes, download or print badges, and run 1-click test scans.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 flex-wrap">
          <button
            onClick={handleOpenMasterQr}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 hover:from-amber-500 hover:to-rose-400 text-white text-xs font-bold shadow-lg shadow-amber-950/60 transition flex items-center gap-2 ring-2 ring-amber-500/40"
            title="Show Master Event QR for Volunteers to scan with phone"
          >
            <QrCode className="w-4 h-4 text-white" />
            <span>📱 Show Event Entry QR</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            <span>+ Create Pass</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Search, Event Switcher & Count */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search attendee name or pass serial..."
              className="w-full bg-[#110e1a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>

          {events.length > 0 && (
            <div className="hidden md:flex items-center gap-2 bg-[#110e1a] border border-white/10 rounded-xl px-3 py-2 shrink-0">
              <span className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider">Event:</span>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer max-w-[220px] truncate"
              >
                {events.map(ev => (
                  <option key={ev.id} value={ev.id} className="bg-[#110e1a] text-white">
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {tickets.length > 0 && (
            <button
              onClick={handleClearAllTickets}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-white/10 transition flex items-center gap-1.5"
              title="Delete all passes"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Passes</span>
            </button>
          )}

          <span className="text-xs font-mono text-slate-400 font-semibold">Total Passes:</span>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300">
            {tickets.length} Registered
          </span>
        </div>
      </div>

      {/* Passes Grid: Real Live QR Codes visible on every card! */}
      {loading && tickets.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-mono text-slate-400">Loading attendee passes...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
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
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition inline-flex items-center gap-2 shadow-lg shadow-amber-950"
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
          <div className="w-full max-w-md bg-[#110e1a] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-amber-400" />
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
                  onClick={() => handleApplyPreset('Gulu Gupta', 'VIP Access', '9876543210', 'Aadhaar Verified')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 text-[11px] font-semibold border border-white/10 transition"
                >
                  + Gulu Gupta (VIP)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('Rahul Verma', 'General', '9812345678', 'Student ID #1042')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-[11px] font-semibold border border-white/10 transition"
                >
                  + Rahul Verma (Gen)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('Priya Sharma', 'VIP Access', '9988776655', 'VIP Guest Pass')}
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
                  className="w-full bg-[#171322] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.attendeePhone}
                    onChange={(e) => setFormData({ ...formData, attendeePhone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-[#171322] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
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
                    className="w-full bg-[#171322] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ID Remark / Verification Proof (Optional)
                </label>
                <input
                  type="text"
                  value={formData.idNote}
                  onChange={(e) => setFormData({ ...formData, idNote: e.target.value })}
                  placeholder="e.g. Aadhaar Verified, Student ID #204, VIP Delegate"
                  className="w-full bg-[#171322] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
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
                    className="w-full bg-[#171322] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
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
                    className="w-full bg-[#171322] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
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
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-amber-950/60"
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
          <div className="w-full max-w-sm bg-[#110e1a] border border-white/15 rounded-3xl overflow-hidden shadow-2xl space-y-3 animate-in fade-in zoom-in-95">
            
            {/* Top Pass Brand */}
            <div className="p-4 bg-black/50 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-400" />
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
                <h3 className="font-mono font-extrabold text-2xl text-amber-400">
                  {activePreviewTicket.ticketNumber}
                </h3>
              </div>

              <div className="space-y-0.5">
                <h4 className="text-lg font-bold text-white">{activePreviewTicket.attendeeName}</h4>
                <p className="text-xs text-slate-400">{activePreviewTicket.attendeeEmail || 'Verified Attendee'}</p>
                <span className="inline-block mt-1 text-xs font-mono font-bold px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {activePreviewTicket.tier} TIER
                </span>
              </div>
            </div>

            {/* Action Buttons: Test Scan & Download & Print */}
            <div className="p-4 bg-black/50 border-t border-white/10 space-y-2">
              <button
                type="button"
                onClick={() => handleTestScan(activePreviewTicket)}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/60"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>⚡ Test Scan Pass Into Gate</span>
              </button>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={downloadQrImage}
                  className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-white/10"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
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

      {/* Master Event Entry QR Modal */}
      {showMasterEventQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#110e1a] border border-amber-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-5 text-center">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Master Event Entry QR</h3>
                  <p className="text-xs text-slate-400">Scan to register attendee entry</p>
                </div>
              </div>
              <button
                onClick={() => setShowMasterEventQr(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-5 bg-white rounded-3xl shadow-2xl mx-auto w-fit border-4 border-amber-500/30">
              {masterQrUrl ? (
                <img src={masterQrUrl} alt="Event Entry QR" className="w-56 h-56 block rounded-xl" />
              ) : (
                <div className="w-56 h-56 bg-slate-100 flex items-center justify-center text-slate-400">
                  <QrCode className="w-12 h-12" />
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-slate-300 text-left space-y-1">
              <span className="font-bold text-amber-400">⚡ Single Master QR for Event:</span>
              <p className="text-[11px] leading-relaxed text-slate-300">
                Any volunteer or attendee can scan this QR code. Each scan opens the entry form, allows the volunteer to enter their details, and adds them to the live entry ledger.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <a
                href={masterQrUrl}
                download="Blackout-Master-Event-QR.png"
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-amber-950/60 transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download QR PNG</span>
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold border border-white/10 transition flex items-center gap-2"
              >
                <Printer className="w-4 h-4 text-slate-300" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
