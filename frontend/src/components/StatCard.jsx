import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'emerald', alert = false }) => {
  const colorMap = {
    emerald: {
      card: 'border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 via-teal-500/5 to-transparent',
      iconBox: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-emerald-950/40',
      valueColor: 'text-white'
    },
    blue: {
      card: 'border-cyan-500/25 bg-gradient-to-br from-cyan-500/15 via-blue-500/5 to-transparent',
      iconBox: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 shadow-cyan-950/40',
      valueColor: 'text-white'
    },
    amber: {
      card: 'border-amber-500/25 bg-gradient-to-br from-amber-500/15 via-yellow-500/5 to-transparent',
      iconBox: 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-amber-950/40',
      valueColor: 'text-white'
    },
    rose: {
      card: 'border-rose-500/30 bg-gradient-to-br from-rose-500/20 via-red-500/5 to-transparent',
      iconBox: 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-rose-950/40',
      valueColor: 'text-white'
    }
  };

  const scheme = colorMap[color] || colorMap.emerald;

  return (
    <div className={`relative overflow-hidden rounded-3xl p-5 border glass-card ${scheme.card} ${alert ? 'animate-pulse' : ''} shadow-xl transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">{title}</p>
          <h3 className={`text-3xl font-extrabold font-mono tracking-tight ${scheme.valueColor}`}>{value}</h3>
          {subtitle && (
            <p className="text-xs text-slate-400 font-medium">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3.5 rounded-2xl border shadow-lg ${scheme.iconBox}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
