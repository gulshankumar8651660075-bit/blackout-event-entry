import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NetworkStatusBadge } from './NetworkStatusBadge';
import { 
  QrCode, 
  LayoutDashboard, 
  ScanLine, 
  AlertTriangle, 
  PlayCircle, 
  LogOut, 
  Radio,
  Sparkles
} from 'lucide-react';

export const Navbar = ({ onSyncTrigger, isSyncing }) => {
  const { user, logout, activeGate, updateGate, isOrganizer } = useAuth();
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/scanner', label: 'Gate Scanner', icon: ScanLine },
    { to: '/tickets', label: 'Tickets & QR', icon: QrCode },
    { to: '/conflicts', label: 'Conflict Center', icon: AlertTriangle },
    { to: '/demo', label: 'Live Demo Script', icon: PlayCircle, highlight: true }
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                </div>
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5 font-mono">
                  BLACKOUT
                  <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    OFFLINE-FIRST
                  </span>
                </span>
              </div>
            </Link>

            {/* Navigation tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                        : link.highlight
                        ? 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${link.highlight ? 'text-amber-400' : ''}`} />
                    <span>{link.label}</span>
                    {link.highlight && (
                      <Sparkles className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-4">
            {/* Gate Selector (Very important for Slide 08 demo: Gate A vs Gate B!) */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/60 rounded-lg px-2.5 py-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Gate:</span>
              <select
                value={activeGate}
                onChange={(e) => updateGate(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-emerald-400 focus:outline-none cursor-pointer"
              >
                <option value="Gate A" className="bg-slate-900 text-slate-200">Gate A (North VIP)</option>
                <option value="Gate B" className="bg-slate-900 text-slate-200">Gate B (South General)</option>
                <option value="Gate C" className="bg-slate-900 text-slate-200">Gate C (Fast Track)</option>
              </select>
            </div>

            {/* Network Status Badge */}
            <NetworkStatusBadge onSyncTrigger={onSyncTrigger} isSyncing={isSyncing} />

            {/* User status & Logout */}
            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
                <div className="hidden lg:block text-right">
                  <div className="text-xs font-bold text-slate-200">{user.name}</div>
                  <div className="text-[10px] uppercase font-mono text-emerald-400">{user.role}</div>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700/60 transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-between py-2 border-t border-slate-800/60 overflow-x-auto gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
};
