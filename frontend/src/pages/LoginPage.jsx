import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Radio, Lock, Mail, User, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('organizer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register({ name, email, password, role });
        login(res.user, res.token);
      } else {
        const res = await api.login({ email, password });
        login(res.user, res.token);
      }
    } catch (err) {
      // If server is not responding, fallback for demo credentials
      if (email === 'organizer@blackout.io' && password === 'password123') {
        const fallbackUser = { id: 'd042b8ee-c113-424c-85f0-0dcbb6ccc114', name: 'Gulshan (Lead Organiser)', email: 'organizer@blackout.io', role: 'organizer' };
        login(fallbackUser, 'offline_jwt_token_org');
        return;
      }
      if (email === 'volunteer@blackout.io' && password === 'password123') {
        const fallbackUser = { id: 'c55adda2-aae8-4536-b50e-8d6c463e1a7a', name: 'Alex (Gate Volunteer)', email: 'volunteer@blackout.io', role: 'volunteer' };
        login(fallbackUser, 'offline_jwt_token_vol');
        return;
      }
      setError(err.message || 'Authentication failed. Please check credentials or use Quick Demo buttons.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoRole) => {
    setLoading(true);
    setError('');

    // Predefined demo identities
    const demoUser = demoRole === 'organizer'
      ? { id: 'd042b8ee-c113-424c-85f0-0dcbb6ccc114', name: 'Gulshan (Lead Organiser)', email: 'organizer@blackout.io', role: 'organizer' }
      : { id: 'c55adda2-aae8-4536-b50e-8d6c463e1a7a', name: 'Alex (Gate Volunteer)', email: 'volunteer@blackout.io', role: 'volunteer' };

    try {
      // 1. Try online server login first
      const creds = demoRole === 'organizer'
        ? { email: 'organizer@blackout.io', password: 'password123' }
        : { email: 'volunteer@blackout.io', password: 'password123' };

      const res = await api.login(creds);
      login(res.user, res.token);
    } catch (err) {
      // 2. Fail-safe Offline Mode: Immediately grant access so the presenter is NEVER blocked!
      console.warn('Backend server offline, engaging Instant Offline Demo Session:', err);
      login(demoUser, `demo_offline_token_${Date.now()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#060911] relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Radio className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight font-mono">
            BLACKOUT
          </h2>
          <p className="text-xs text-slate-400">
            Event entry that keeps working when the internet stops
          </p>
        </div>

        {/* 1-Click Quick Demo Login Buttons */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <p className="text-[11px] font-mono uppercase text-slate-400 text-center font-bold tracking-wider flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>1-Click Instant Login (No Typing Needed)</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('organizer')}
              disabled={loading}
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-emerald-500/50 text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Lead Organiser</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('volunteer')}
              disabled={loading}
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-blue-500/50 text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <User className="w-4 h-4 text-blue-400" />
              <span>Gate Volunteer</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Gulshan Kumar"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="organizer@blackout.io"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="organizer">Organiser (Creates events, reviews conflicts)</option>
                <option value="volunteer">Volunteer (Gate scanner terminal)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 transition flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-400">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="hover:text-emerald-400 underline"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>

      </div>
    </div>
  );
};
