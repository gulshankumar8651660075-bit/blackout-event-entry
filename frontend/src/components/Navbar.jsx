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
  ShieldCheck,
  Smartphone
} from 'lucide-react';

export const Navbar = ({ onSyncTrigger, isSyncing }) => {
  const { user, logout, activeGate, updateGate, isOrganizer, isVolunteer } = useAuth();
  const location = useLocation();

  // Organiser Navigation (Management & Operations)
  const organiserLinks = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/tickets', label: 'Passes & QR', icon: QrCode },
    { to: '/conflicts', label: 'Conflict Center', icon: AlertTriangle },
    { to: '/scanner', label: 'Gate Terminal', icon: ScanLine },
    { to: '/demo', label: 'Demo Guide', icon: PlayCircle }
  ];

  // Volunteer Navigation (Strictly Scanner & Terminal only)
  const volunteerLinks = [
    { to: '/scanner', label: 'Gate Scanner Terminal', icon: ScanLine }
  ];

  const currentLinks = isOrganizer ? organiserLinks : volunteerLinks;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Brand Logo & Role Pill */}
          <div className="flex items-center gap-6">
            <Link to={isOrganizer ? '/' : '/scanner'} className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                </div>
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-2 font-mono">
                  BLACKOUT
                  <span className={`text-[10px] font-sans px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${
                    isOrganizer 
                      ? 'bg-purple-950/60 text-purple-300 border-purple-500/30' 
                      : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {isOrganizer ? 'Organiser Portal' : 'Gate Terminal'}
                  </span>
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5">
              {currentLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-4">
            
            {/* Gate Selector (Shown for volunteers and when scanner is viewed) */}
            {(isVolunteer || location.pathname === '/scanner') && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gate:</span>
                <select
                  value={activeGate}
                  onChange={(e) => updateGate(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-emerald-400 focus:outline-none cursor-pointer"
                >
                  <option value="Gate A" className="bg-slate-900 text-white">Gate A (North VIP)</option>
                  <option value="Gate B" className="bg-slate-900 text-white">Gate B (South General)</option>
                  <option value="Gate C" className="bg-slate-900 text-white">Gate C (Fast Track)</option>
                </select>
              </div>
            )}

            {/* Network Offline Status Indicator */}
            <NetworkStatusBadge onSyncTrigger={onSyncTrigger} isSyncing={isSyncing} />

            {/* User Profile & Logout */}
            {user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
                <div className="hidden lg:block text-right">
                  <div className="text-xs font-bold text-white flex items-center gap-1 justify-end">
                    {isOrganizer ? <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> : <Smartphone className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{user.name}</span>
                  </div>
                  <div className="text-[10px] uppercase font-mono text-slate-400">{user.email}</div>
                </div>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 border border-slate-700/80 hover:border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center py-2 border-t border-slate-800/60 overflow-x-auto gap-2">
          {currentLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap ${
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
