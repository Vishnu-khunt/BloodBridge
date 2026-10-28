import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'crimson' | 'blue' | 'emerald' | 'amber' | 'purple' | 'slate';
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'slate',
  trend,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'crimson':
        return {
          iconBg: 'bg-crimson-600/10 border-crimson-500/30 text-crimson-500',
          accent: 'text-crimson-400',
        };
      case 'emerald':
        return {
          iconBg: 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400',
          accent: 'text-emerald-400',
        };
      case 'blue':
        return {
          iconBg: 'bg-blue-600/10 border-blue-500/30 text-blue-400',
          accent: 'text-blue-400',
        };
      case 'amber':
        return {
          iconBg: 'bg-amber-600/10 border-amber-500/30 text-amber-400',
          accent: 'text-amber-400',
        };
      case 'purple':
        return {
          iconBg: 'bg-purple-600/10 border-purple-500/30 text-purple-400',
          accent: 'text-purple-400',
        };
      default:
        return {
          iconBg: 'bg-slate-800 border-slate-700 text-slate-300',
          accent: 'text-slate-300',
        };
    }
  };

  const colors = getColors();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start justify-between shadow-xs hover:border-slate-700 transition">
      <div>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className="text-2xl font-black text-white mt-1 tracking-tight">{value}</div>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        {trend && <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-400">{trend}</span>}
      </div>
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${colors.iconBg}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};
