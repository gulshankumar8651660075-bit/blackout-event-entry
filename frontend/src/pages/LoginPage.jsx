import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Radio, Lock, Mail, User, ArrowRight, Eye, EyeOff, ShieldCheck, Crown, Smartphone, Zap } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('organizer');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          throw new Error('Please enter your full name.');
        }
        const res = await api.register({ name: name.trim(), email: email.trim(), password, role });
        login(res.user, res.token);
      } else {
        const res = await api.login({ email: email.trim(), password });
        login(res.user, res.token);
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // Instant 1-Click Fast Login for Hackathon Judges & Evaluators
  const handleFastDemoLogin = async (targetRole) => {
    setError('');
    setLoading(true);
    const demoEmail = targetRole === 'organizer' ? 'organizer@blackout.io' : 'volunteer@blackout.io';
    const demoPass = 'password123';
    try {
      const res = await api.login({ email: demoEmail, password: demoPass });
      login(res.user, res.token);
    } catch (err) {
      // Offline / fallback login
      const isOrg = targetRole === 'organizer';
      const fallbackUser = {
        id: isOrg ? 'user-org-01' : 'user-vol-01',
        name: isOrg ? 'Gulshan (Lead Organiser)' : 'Alex (Gate Volunteer)',
        email: demoEmail,
        role: targetRole
      };
      login(fallbackUser, 'demo_token_' + targetRole);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#070b16]">
      {/* Background ambient glowing orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-500/15 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">
        
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 p-0.5 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/25">
            <div className="w-full h-full bg-[#070b16] rounded-[14px] flex items-center justify-center">
              <Radio className="w-7 h-7 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
            BLACKOUT
          </h2>
          <p className="text-xs text-slate-300 font-medium">
            Zero-Downtime Offline Event Entry &amp; Verification
          </p>
        </div>

        {/* 1-Click Fast Login for Hackathon Judges & Testing */}
        <div className="space-y-2 bg-black/30 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>1-Click Quick Demo Sign In:</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleFastDemoLogin('organizer')}
              disabled={loading}
              className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/80 to-purple-950/80 hover:from-indigo-900/90 hover:to-purple-900/90 border border-indigo-500/30 hover:border-indigo-400 text-left transition group shadow-md"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-white group-hover:text-indigo-300">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Organiser</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Full Admin &amp; Passes</p>
            </button>

            <button
              type="button"
              onClick={() => handleFastDemoLogin('volunteer')}
              disabled={loading}
              className="p-3 rounded-xl bg-gradient-to-br from-emerald-950/80 to-teal-950/80 hover:from-emerald-900/90 hover:to-teal-900/90 border border-emerald-500/30 hover:border-emerald-400 text-left transition group shadow-md"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-white group-hover:text-emerald-300">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gate Volunteer</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Scanning Terminal</p>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex-1 h-px bg-white/10"></div>
          <span className="font-mono text-[10px] uppercase">Or enter credentials</span>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-300 font-medium animate-in fade-in">
            {error}
          </div>
        )}

        {/* Authenticated Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Gulshan Kumar"
                  className="w-full bg-[#070b16] border border-white/15 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#070b16] border border-white/15 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#070b16] border border-white/15 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-[#070b16] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="organizer">Lead Organiser (Full Management &amp; Passes)</option>
                <option value="volunteer">Gate Volunteer (Scanning Terminal Only)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-950 transition flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Authenticating...' : isRegister ? 'Create Secure Account' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Switch Register/Login */}
        <div className="text-center text-xs text-slate-400 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-emerald-400 hover:underline font-semibold"
          >
            {isRegister ? '← Already have an account? Sign In' : "Don't have an account? Register →"}
          </button>
        </div>

      </div>
    </div>
  );
};
