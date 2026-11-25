import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { HistoricalTrendPoint } from '../../types/financial';

interface PerformanceChartProps {
  data: HistoricalTrendPoint[];
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
  const [metricView, setMetricView] = useState<'all' | 'revenue' | 'profits'>('all');

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs border border-slate-700">
          <div className="font-bold text-slate-300 mb-1.5 pb-1 border-b border-slate-700">
            {label} Performance
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 my-1">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-white">
                ${entry.value.toFixed(1)}M
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Multi-Period Trajectory
          </span>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">
            Financial Performance Overview
          </h3>
        </div>

        {/* View Toggle */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg self-start sm:self-auto text-xs font-semibold text-slate-600">
          <button
            onClick={() => setMetricView('all')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              metricView === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            All Metrics
          </button>
          <button
            onClick={() => setMetricView('revenue')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              metricView === 'revenue'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Revenue Focus
          </button>
          <button
            onClick={() => setMetricView('profits')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              metricView === 'profits'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Operating vs Net
          </button>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorOp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v}M`}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
            />

            {(metricView === 'all' || metricView === 'revenue') && (
              <Area
                type="monotone"
                dataKey="revenue"
                name="Total Revenue"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorRev)"
              />
            )}

            {(metricView === 'all' || metricView === 'profits') && (
              <Area
                type="monotone"
                dataKey="operatingProfit"
                name="Operating Profit (EBIT)"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorOp)"
              />
            )}

            {(metricView === 'all' || metricView === 'profits') && (
              <Area
                type="monotone"
                dataKey="netProfit"
                name="Net Profit"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorNet)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Quarterly figures in millions (USD)</span>
        <span className="font-semibold text-emerald-600 flex items-center gap-1">
          Compound Margin Expansion: +180 bps
        </span>
      </div>
    </div>
  );
};
