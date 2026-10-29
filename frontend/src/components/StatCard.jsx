import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'emerald', alert = false }) => {
  const colorMap = {
    emerald: 'from-emerald-500/20 to-teal-500/5 text-emerald-400 border-emerald-500/30',
    blue: 'from-blue-500/20 to-indigo-500/5 text-blue-400 border-blue-500/30',
    amber: 'from-amber-500/20 to-yellow-500/5 text-amber-400 border-amber-500/30',
    rose: 'from-rose-500/20 to-red-500/5 text-rose-400 border-rose-500/30'
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 border bg-gradient-to-br glass-card ${colorMap[color]} ${alert ? 'animate-pulse' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <h3 className="text-3xl font-extrabold text-white mt-1 font-mono">{value}</h3>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-slate-900/80 border border-slate-700/50 shadow-inner`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
