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
  User
} from 'lucide-react';

export const Navbar = ({ onSyncTrigger, isSyncing }) => {
  const { user, logout, activeGate, updateGate, isOrganizer, isVolunteer } = useAuth();
  const location = useLocation();

  // Organiser Navigation (Management & Operations only)
  const organiserLinks = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/tickets', label: 'Passes & QR', icon: QrCode },
    { to: '/conflicts', label: 'Duplicate Alerts', icon: AlertTriangle },
    { to: '/demo', label: 'Guide', icon: PlayCircle }
  ];

  // Volunteer Navigation (Gate Terminal only)
  const volunteerLinks = [
    { to: '/scanner', label: 'Gate Terminal', icon: ScanLine }
  ];

  const currentLinks = isOrganizer ? organiserLinks : volunteerLinks;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Left: Brand Logo & Role Pill */}
          <div className="flex items-center gap-5">
            <Link to={isOrganizer ? '/' : '/scanner'} className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#070b16] rounded-[10px] flex items-center justify-center">
                  <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white font-mono flex items-center">
                  BLACKOUT
                </span>
                <span className={`text-[10px] font-sans px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border shadow-sm ${
                  isOrganizer 
                    ? 'bg-gradient-to-r from-purple-900/60 to-indigo-900/60 text-purple-300 border-purple-500/40' 
                    : 'bg-gradient-to-r from-emerald-900/60 to-teal-900/60 text-emerald-300 border-emerald-500/40'
                }`}>
                  {isOrganizer ? 'Lead Organiser' : 'Gate Volunteer'}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5 ml-2">
              {currentLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950'
                        : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            
            {/* Gate Selector (Shown for volunteers stationed at gates) */}
            {isVolunteer && (
              <div className="flex items-center gap-1.5 bg-[#0a0f1e] border border-emerald-500/30 rounded-xl px-2.5 py-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Gate:</span>
                <select
                  value={activeGate}
                  onChange={(e) => updateGate(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-emerald-400 focus:outline-none cursor-pointer"
                >
                  <option value="Gate A" className="bg-[#0a0f1e] text-white">Gate A (North VIP)</option>
                  <option value="Gate B" className="bg-[#0a0f1e] text-white">Gate B (South General)</option>
                  <option value="Gate C" className="bg-[#0a0f1e] text-white">Gate C (Fast Track)</option>
                </select>
              </div>
            )}

            {/* Offline Blackout Network Badge */}
            <NetworkStatusBadge onSyncTrigger={onSyncTrigger} isSyncing={isSyncing} />

            {/* Authenticated User Badge */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 font-medium px-2.5 py-1 rounded-xl bg-white/5 border border-white/10">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate max-w-[120px]">{user?.name?.split(' ')[0] || user?.email}</span>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-white/10 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
