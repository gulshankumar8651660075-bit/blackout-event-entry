import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, CheckCircle, Copy, Send, Download } from 'lucide-react';

export const TicketCard = ({ ticket, onQuickScan }) => {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current && ticket) {
      QRCode.toCanvas(
        canvasRef.current,
        ticket.qrPayload || ticket.ticketNumber,
        {
          width: 140,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) console.error('QR code generation failed:', error);
        }
      );
    }
  }, [ticket]);

  const copyCode = () => {
    navigator.clipboard.writeText(ticket.ticketNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColors = {
    issued: 'bg-amber-950/60 border-amber-500/40 text-amber-400',
    checked_in: 'bg-purple-950/60 border-purple-500/40 text-purple-300',
    conflict: 'bg-rose-950/60 border-rose-500/40 text-rose-300 animate-pulse',
    cancelled: 'bg-slate-900 border-slate-700 text-slate-400'
  };

  return (
    <div className="relative rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl hover:border-slate-700 transition group flex flex-col justify-between">
      {/* Top Header / Tier Banner */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Pass</span>
          <h4 className="font-mono font-bold text-lg text-amber-400">{ticket.ticketNumber}</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusColors[ticket.status] || 'bg-slate-800 text-slate-300'}`}>
            {ticket.status.replace('_', ' ').toUpperCase()}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-slate-800 text-slate-300 border border-slate-700">
            {ticket.tier}
          </span>
        </div>
      </div>

      {/* Middle QR + Attendee Details */}
      <div className="p-4 flex items-center gap-4">
        {/* QR Code Canvas */}
        <div className="bg-white p-2 rounded-xl shadow-md border border-slate-200 shrink-0">
          <canvas ref={canvasRef} className="block w-28 h-28"></canvas>
        </div>

        {/* Attendee details */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400">Attendee</p>
          <p className="text-base font-bold text-slate-100 truncate">{ticket.attendeeName}</p>
          {ticket.attendeeEmail && (
            <p className="text-xs text-slate-400 truncate mt-0.5">{ticket.attendeeEmail}</p>
          )}

          {ticket.firstCheckIn && (
            <div className="mt-2 text-[11px] font-mono text-amber-400/90 bg-amber-950/40 border border-amber-500/20 px-2 py-1 rounded">
              Entry: {ticket.firstCheckIn.gateId} ({new Date(ticket.firstCheckIn.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
            </div>
          )}

          {ticket.status === 'conflict' && (
            <div className="mt-2 text-[11px] font-mono text-rose-400 bg-rose-950/40 border border-rose-500/30 px-2 py-1 rounded">
              ⚠️ Multiple gate check-ins!
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <button
          onClick={copyCode}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition"
        >
          {copied ? <CheckCircle className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy ID'}</span>
        </button>

        {onQuickScan && (
          <button
            onClick={() => onQuickScan(ticket)}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/30 transition shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Simulate Scan</span>
          </button>
        )}
      </div>
    </div>
  );
};
