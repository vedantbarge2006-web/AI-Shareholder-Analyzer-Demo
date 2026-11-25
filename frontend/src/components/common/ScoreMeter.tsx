import React from 'react';
import { ScoreClassification } from '../../types/financial';
import { ShieldCheck, AlertTriangle, AlertCircle, TrendingUp } from 'lucide-react';

interface ScoreMeterProps {
  score: number; // 0 to 100
  classification: ScoreClassification;
  compact?: boolean;
}

export const ScoreMeter: React.FC<ScoreMeterProps> = ({
  score,
  classification,
  compact = false,
}) => {
  // Determine color and status attributes
  const getColor = () => {
    if (score >= 75) {
      return {
        text: 'text-emerald-600',
        bg: 'bg-emerald-500',
        lightBg: 'bg-emerald-50',
        border: 'border-emerald-200',
        glow: 'shadow-emerald-500/20',
        icon: ShieldCheck,
        badgeText: 'Value Accretive',
      };
    }
    if (score >= 55) {
      return {
        text: 'text-teal-600',
        bg: 'bg-teal-500',
        lightBg: 'bg-teal-50',
        border: 'border-teal-200',
        glow: 'shadow-teal-500/20',
        icon: TrendingUp,
        badgeText: 'Moderately Accretive',
      };
    }
    if (score >= 45) {
      return {
        text: 'text-amber-600',
        bg: 'bg-amber-500',
        lightBg: 'bg-amber-50',
        border: 'border-amber-200',
        glow: 'shadow-amber-500/20',
        icon: AlertTriangle,
        badgeText: 'Value Neutral',
      };
    }
    return {
      text: 'text-rose-600',
      bg: 'bg-rose-500',
      lightBg: 'bg-rose-50',
      border: 'border-rose-200',
      glow: 'shadow-rose-500/20',
      icon: AlertCircle,
      badgeText: 'Value Destructive',
    };
  };

  const currentTheme = getColor();
  const IconComponent = currentTheme.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-100"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={currentTheme.text}
              strokeDasharray={`${score}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className={`absolute text-sm font-bold ${currentTheme.text}`}>
            {score}
          </span>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-800">{classification}</div>
          <div className="text-[11px] text-slate-500">Benchmark: 65+</div>
        </div>
      </div>
    );
  }

  // Full Gauge Card view
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Composite Valuation Index
          </span>
          <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
            Shareholder Value Score
          </h4>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${currentTheme.lightBg} ${currentTheme.text} ${currentTheme.border}`}
        >
          <IconComponent className="w-3.5 h-3.5" />
          {currentTheme.badgeText}
        </span>
      </div>

      <div className="flex items-baseline gap-3 mb-3">
        <span className={`text-4xl font-extrabold tracking-tight ${currentTheme.text}`}>
          {score}
        </span>
        <span className="text-slate-400 font-medium text-sm">/ 100</span>
        <div className="ml-auto text-right">
          <span className="text-xs font-semibold text-slate-700 block">
            {classification}
          </span>
          <span className="text-[11px] text-slate-500">
            {score >= 65 ? 'Creating economic surplus' : 'Below cost of capital threshold'}
          </span>
        </div>
      </div>

      {/* Segmented Meter Bar */}
      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60 flex">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${currentTheme.bg}`}
          style={{ width: `${Math.max(5, Math.min(100, score))}%` }}
        />
      </div>

      {/* Benchmark Tick Labels */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 font-medium px-0.5">
        <span className="text-rose-600 font-semibold">0 Destructive</span>
        <span>45 Neutral</span>
        <span>65 Accretive</span>
        <span className="text-emerald-600 font-semibold">100 Top Decile</span>
      </div>
    </div>
  );
};
