import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { useFinancialData } from '../../context/FinancialDataContext';
import { formatCurrency } from '../../utils/financialFormulas';
import { ExpenseBreakdownItem } from '../../types/financial';

export const RevenueExpensesChart: React.FC = () => {
  const { activeData, calculatedMetrics } = useFinancialData();

  // Dynamically compute the cost waterfall from active company figures
  const breakdownData = useMemo<ExpenseBreakdownItem[]>(() => {
    const rev = activeData.revenue;
    if (rev <= 0) return [];

    const totalOpCosts = Math.max(0, rev - activeData.operatingProfit);
    const cogs = Math.round(totalOpCosts * 0.58);
    const rnd = Math.round(totalOpCosts * 0.24);
    const sga = Math.max(0, totalOpCosts - cogs - rnd);
    const taxesAndFin = Math.max(0, activeData.operatingProfit - activeData.netProfit);
    const retainedNet = Math.max(0, activeData.netProfit);

    return [
      {
        category: 'Cost of Goods Sold (COGS)',
        amount: cogs,
        percentage: +((cogs / rev) * 100).toFixed(1),
        color: '#3b82f6',
      },
      {
        category: 'R&D / Product Innovation',
        amount: rnd,
        percentage: +((rnd / rev) * 100).toFixed(1),
        color: '#8b5cf6',
      },
      {
        category: 'Sales, General & Admin (SG&A)',
        amount: sga,
        percentage: +((sga / rev) * 100).toFixed(1),
        color: '#06b6d4',
      },
      {
        category: 'Taxes & Net Interest',
        amount: taxesAndFin,
        percentage: +((taxesAndFin / rev) * 100).toFixed(1),
        color: '#f59e0b',
      },
      {
        category: 'Retained Net Earnings',
        amount: retainedNet,
        percentage: +((retainedNet / rev) * 100).toFixed(1),
        color: calculatedMetrics.netProfitMargin > 0 ? '#10b981' : '#f43f5e',
      },
    ];
  }, [activeData, calculatedMetrics.netProfitMargin]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ExpenseBreakdownItem;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs border border-slate-700">
          <div className="font-bold text-slate-200">{data.category}</div>
          <div className="mt-1 flex items-center justify-between gap-4">
            <span className="text-slate-400">Capital Allocated:</span>
            <span className="font-mono font-bold text-emerald-400">
              {formatCurrency(data.amount, true)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Share of Revenue:</span>
            <span className="font-mono font-bold">{data.percentage}%</span>
          </div>
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
            Cost Structure & Margin Waterfall
          </span>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">
            Revenue vs. Expense Breakdown
          </h3>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {activeData.fiscalYear} Live
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={breakdownData}
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis
              type="number"
              tickFormatter={(v) => `$${(v / 1e6).toFixed(0)}M`}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="category"
              width={140}
              tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {breakdownData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-[11px]">
        {breakdownData.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="truncate">{item.category.split(' ')[0]}: {item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
