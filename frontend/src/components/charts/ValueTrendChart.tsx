import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { HistoricalTrendPoint } from '../../types/financial';

interface ValueTrendChartProps {
  data: HistoricalTrendPoint[];
}

export const ValueTrendChart: React.FC<ValueTrendChartProps> = ({ data }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs border border-slate-700">
          <div className="font-bold text-slate-200 mb-1.5 pb-1 border-b border-slate-700">
            {label} — Value Trend
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 my-1">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-white">
                {entry.dataKey === 'eva' ? `+$${entry.value}M` : `${entry.value}/100`}
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Economic Value Added (EVA) & Score
          </span>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">
            Shareholder Value Trend
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            EVA &gt; $0 = Value Accretive
          </span>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            {/* Left Axis: EVA in Millions */}
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v}M`}
              tick={{ fontSize: 11, fill: '#059669' }}
            />
            {/* Right Axis: Score 0-100 */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#3b82f6' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
            />
            <ReferenceLine yAxisId="left" y={0} stroke="#94a3b8" strokeDasharray="3 3" />
            <Bar
              yAxisId="left"
              dataKey="eva"
              name="EVA ($ Millions)"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              barSize={24}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="valueScore"
              name="Value Score (0-100)"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#2563eb' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Quarterly EVA expansion indicates sustainable compounding</span>
        <span className="font-semibold text-slate-700">8-Quarter Trajectory</span>
      </div>
    </div>
  );
};
