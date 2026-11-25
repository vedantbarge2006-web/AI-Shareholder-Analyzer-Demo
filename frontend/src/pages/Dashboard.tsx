import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Layers,
  ShieldCheck,
  Scale,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Filter,
  Clock,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import { useFinancialData } from '../context/FinancialDataContext';
import { MetricCard } from '../components/common/MetricCard';
import { ScoreMeter } from '../components/common/ScoreMeter';
import { Badge } from '../components/common/Badge';
import { PerformanceChart } from '../components/charts/PerformanceChart';
import { RevenueExpensesChart } from '../components/charts/RevenueExpensesChart';
import { ValueTrendChart } from '../components/charts/ValueTrendChart';
import { formatCurrency, formatPercent, formatMultiplier } from '../utils/financialFormulas';

export const Dashboard: React.FC = () => {
  const {
    activeData,
    calculatedMetrics,
    historicalTrends,
    activities,
    setActiveTab,
  } = useFinancialData();

  const [activityFilter, setActivityFilter] = useState<string>('all');

  const filteredActivities = activities.filter((act) => {
    if (activityFilter === 'all') return true;
    return act.category === activityFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Executive Highlight */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            {activeData.revenue > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {activeData.fiscalYear || 'FY24'} Executive Brief
                  </span>
                  <span className="text-slate-400 text-xs font-mono">
                    {activeData.companyName} {activeData.ticker ? `(${activeData.ticker})` : ''}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  {calculatedMetrics.isValueCreating ? (
                    <span>Value Accretive: Generating <strong className="text-emerald-400">+{formatCurrency(calculatedMetrics.eva, true)}</strong> in Economic Surplus</span>
                  ) : (
                    <span>Value Dilutive: Economic Value Drag of <strong className="text-rose-400">{formatCurrency(calculatedMetrics.eva, true)}</strong></span>
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  With Return on Invested Capital at <strong>{formatPercent(calculatedMetrics.roic)}</strong> against a WACC hurdle of <strong>{formatPercent(activeData.wacc)}</strong>, the business sustains a <strong>{calculatedMetrics.valueSpread > 0 ? '+' : ''}{calculatedMetrics.valueSpread.toFixed(1)}%</strong> economic spread.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-700 text-slate-300 border border-slate-600">
                    Corporate Financial Valuation
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Welcome to VALORA AI
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  No company statements are currently loaded. Input your company's income statement and balance sheet figures to evaluate whether your decisions create or destroy shareholder value.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {activeData.revenue > 0 ? (
              <>
                <button
                  onClick={() => setActiveTab('analysis')}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-emerald-500/20"
                >
                  <span>Explore EVA Decomposition</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveTab('insights')}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-lg transition-colors border border-white/10 flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AI Insights</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setActiveTab('input')}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-emerald-500/20"
              >
                <span>Enter Financial Statements</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(activeData.revenue, true)}
          change={{
            value: calculatedMetrics.revenueGrowth,
            period: 'YoY',
          }}
          subtitle={`Prior: ${formatCurrency(activeData.prevRevenue, true)}`}
          icon={DollarSign}
          iconColor="blue"
          tooltipText="Total gross sales generated over the fiscal period."
        />

        {/* Net Profit */}
        <MetricCard
          title="Net Profit"
          value={formatCurrency(activeData.netProfit, true)}
          change={{
            value: calculatedMetrics.profitGrowth,
            period: 'YoY',
          }}
          subtitle={`Net Margin: ${formatPercent(calculatedMetrics.netProfitMargin)}`}
          icon={TrendingUp}
          iconColor="emerald"
          tooltipText="Bottom-line earnings after all operating costs, taxes, and interest."
        />

        {/* Economic Value Added (EVA) */}
        <MetricCard
          title="Economic Value Added (EVA)"
          value={`${calculatedMetrics.eva >= 0 ? '+' : ''}${formatCurrency(calculatedMetrics.eva, true)}`}
          change={{
            value: calculatedMetrics.evaGrowth,
            period: 'YoY',
          }}
          subtitle={`Capital Charge: ${formatCurrency(calculatedMetrics.capitalCharge, true)}`}
          icon={ShieldCheck}
          iconColor={calculatedMetrics.isValueCreating ? 'emerald' : 'rose'}
          highlight={true}
          statusBadge={{
            text: calculatedMetrics.isValueCreating ? 'Value Creating' : 'Value Destroying',
            variant: calculatedMetrics.isValueCreating ? 'positive' : 'negative',
          }}
          tooltipText="EVA = NOPAT - (Invested Capital × WACC). Direct measure of true economic value creation beyond cost of capital."
        />

        {/* Return on Equity (ROE) */}
        <MetricCard
          title="Return on Equity (ROE)"
          value={formatPercent(calculatedMetrics.roe)}
          change={{
            value: calculatedMetrics.roe - calculatedMetrics.prevRoe,
            period: 'bps delta',
          }}
          subtitle={`Invested Capital: ${formatCurrency(activeData.investedCapital, true)}`}
          icon={Percent}
          iconColor="indigo"
          statusBadge={{
            text: calculatedMetrics.roe > 15 ? 'Top Quartile' : 'Moderate',
            variant: calculatedMetrics.roe > 15 ? 'positive' : 'neutral',
          }}
          tooltipText="Net income divided by shareholders equity. Measures return on shareholders' funds."
        />
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Debt Ratio */}
        <MetricCard
          title="Debt Ratio (Debt / Capital)"
          value={formatPercent(calculatedMetrics.debtRatio)}
          change={{
            value: calculatedMetrics.debtRatioChange,
            period: 'YoY',
            isPositiveGood: false,
          }}
          subtitle={`Total Debt: ${formatCurrency(activeData.totalDebt, true)}`}
          icon={Scale}
          iconColor="amber"
          tooltipText="Total Debt as a percentage of Total Capital (Debt + Equity)."
        />

        {/* Revenue Growth Rate */}
        <MetricCard
          title="Revenue Growth (YoY)"
          value={formatPercent(calculatedMetrics.revenueGrowth, true)}
          subtitle="Annualized topline velocity"
          icon={ArrowUpRight}
          iconColor="blue"
          statusBadge={{
            text: calculatedMetrics.revenueGrowth > 10 ? 'Accelerating' : 'Stable',
            variant: calculatedMetrics.revenueGrowth > 10 ? 'positive' : 'neutral',
          }}
        />

        {/* Profit Growth Rate */}
        <MetricCard
          title="Profit Growth (YoY)"
          value={formatPercent(calculatedMetrics.profitGrowth, true)}
          subtitle="Operating earnings expansion"
          icon={TrendingUp}
          iconColor="emerald"
          statusBadge={{
            text: calculatedMetrics.profitGrowth > calculatedMetrics.revenueGrowth ? 'Operating Leverage' : 'Compressed',
            variant: calculatedMetrics.profitGrowth > calculatedMetrics.revenueGrowth ? 'positive' : 'warning',
          }}
        />

        {/* Cost of Capital (WACC) */}
        <MetricCard
          title="WACC Hurdle Rate"
          value={formatPercent(activeData.wacc)}
          subtitle={`ROIC Spread: ${calculatedMetrics.valueSpread > 0 ? '+' : ''}${calculatedMetrics.valueSpread.toFixed(1)}%`}
          icon={Layers}
          iconColor="purple"
          tooltipText="Weighted Average Cost of Capital: Minimum threshold return required by debt and equity investors."
        />
      </div>

      {/* Shareholder Value Score & Trend Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ScoreMeter
            score={calculatedMetrics.shareholderValueScore}
            classification={calculatedMetrics.scoreClassification}
          />

          {/* Quick Score Breakdown summary */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 mt-4 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Score Attribution Drivers
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">ROIC vs WACC Spread:</span>
                <span className="font-bold font-mono text-emerald-600">
                  +{calculatedMetrics.valueSpread.toFixed(1)}% (+24 pts)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">ROE Performance:</span>
                <span className="font-bold font-mono text-slate-800">
                  {formatPercent(calculatedMetrics.roe)} (+12 pts)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Topline Expansion:</span>
                <span className="font-bold font-mono text-slate-800">
                  +{formatPercent(calculatedMetrics.revenueGrowth)} (+8 pts)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Leverage & Solvency:</span>
                <span className="font-bold font-mono text-slate-800">
                  {formatMultiplier(calculatedMetrics.debtToEquity)} D/E (+6 pts)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <ValueTrendChart data={historicalTrends} />
        </div>
      </div>

      {/* Performance Chart & Cost Waterfall Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart data={historicalTrends} />
        <RevenueExpensesChart />
      </div>

      {/* Recent Financial Activities & Corporate Actions */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Corporate Governance & Capital Deployment
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Recent Financial Activities
            </h3>
          </div>

          {/* Activity Category Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'capital', 'debt', 'dividend', 'operations'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActivityFilter(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg capitalize transition-colors ${
                  activityFilter === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredActivities.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No corporate activities recorded</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Audits, scenario stress-tests, and strategic decisions will appear here automatically.</p>
            </div>
          ) : (
            filteredActivities.map((act) => (
              <div
                key={act.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors -mx-2 px-2 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${
                      act.type === 'positive'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : act.type === 'negative'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-slate-900">{act.title}</h5>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                        {act.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      {act.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 sm:text-right">
                  {act.amount && (
                    <span className="text-xs font-bold font-mono text-slate-900">
                      {act.amount}
                    </span>
                  )}
                  <div>
                    <div
                      className={`text-xs font-semibold ${
                        act.type === 'positive'
                          ? 'text-emerald-600'
                          : act.type === 'negative'
                          ? 'text-rose-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {act.impact}
                    </div>
                    <div className="text-[10px] text-slate-400">{act.date}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
