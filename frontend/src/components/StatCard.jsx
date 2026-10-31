import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'amber', alert = false }) => {
  const colorMap = {
    amber: {
      card: 'border-amber-500/25 bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-transparent',
      iconBox: 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-amber-950/40',
      valueColor: 'text-white'
    },
    rose: {
      card: 'border-rose-500/30 bg-gradient-to-br from-rose-500/20 via-pink-500/5 to-transparent',
      iconBox: 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-rose-950/40',
      valueColor: 'text-white'
    },
    purple: {
      card: 'border-purple-500/25 bg-gradient-to-br from-purple-500/15 via-pink-500/5 to-transparent',
      iconBox: 'bg-purple-500/15 text-purple-400 border-purple-500/30 shadow-purple-950/40',
      valueColor: 'text-white'
    },
    orange: {
      card: 'border-orange-500/25 bg-gradient-to-br from-orange-500/15 via-amber-500/5 to-transparent',
      iconBox: 'bg-orange-500/15 text-orange-400 border-orange-500/30 shadow-orange-950/40',
      valueColor: 'text-white'
    }
  };

  const scheme = colorMap[color] || colorMap.amber;

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
