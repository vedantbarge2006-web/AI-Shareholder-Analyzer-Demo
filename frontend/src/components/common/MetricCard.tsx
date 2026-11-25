import React from 'react';
import { TrendingUp, TrendingDown, Minus, LucideIcon, Info } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number; // percentage
    period?: string;
    isPositiveGood?: boolean;
  };
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: 'emerald' | 'blue' | 'indigo' | 'amber' | 'rose' | 'purple';
  statusBadge?: {
    text: string;
    variant: 'positive' | 'negative' | 'neutral' | 'warning';
  };
  tooltipText?: string;
  className?: string;
  highlight?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  subtitle,
  icon: Icon,
  iconColor = 'emerald',
  statusBadge,
  tooltipText,
  className = '',
  highlight = false,
}) => {
  const iconColorStyles = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  const badgeStyles = {
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    negative: 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  // Determine trend direction
  let trendElement = null;
  if (change !== undefined) {
    const isGood = change.isPositiveGood !== false;
    const isPositive = change.value > 0;
    const isZero = Math.abs(change.value) < 0.05;

    let textClass = 'text-slate-500 bg-slate-50 border-slate-200';
    let ArrowIcon = Minus;

    if (!isZero) {
      if (isPositive) {
        textClass = isGood
          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
          : 'text-rose-700 bg-rose-50 border-rose-200';
        ArrowIcon = TrendingUp;
      } else {
        textClass = isGood
          ? 'text-rose-700 bg-rose-50 border-rose-200'
          : 'text-emerald-700 bg-emerald-50 border-emerald-200';
        ArrowIcon = TrendingDown;
      }
    }

    trendElement = (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${textClass}`}>
        <ArrowIcon className="w-3 h-3" />
        <span>
          {isPositive ? '+' : ''}
          {change.value.toFixed(1)}%
        </span>
        {change.period && (
          <span className="text-[10px] font-normal opacity-80">{change.period}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative bg-white rounded-xl border p-5 transition-all duration-200 hover:shadow-md ${
        highlight
          ? 'border-emerald-300 ring-2 ring-emerald-500/10 shadow-sm'
          : 'border-slate-200/80 shadow-sm'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          {tooltipText && (
            <div className="group relative cursor-pointer">
              <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[11px] rounded shadow-lg z-30 pointer-events-none">
                {tooltipText}
              </div>
            </div>
          )}
        </div>

        {Icon && (
          <div
            className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${iconColorStyles[iconColor]}`}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </span>
        {trendElement}
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
        {subtitle && <span>{subtitle}</span>}
        {statusBadge && (
          <span
            className={`ml-auto px-2 py-0.5 rounded-full text-[11px] font-medium border ${badgeStyles[statusBadge.variant]}`}
          >
            {statusBadge.text}
          </span>
        )}
      </div>
    </div>
  );
};
