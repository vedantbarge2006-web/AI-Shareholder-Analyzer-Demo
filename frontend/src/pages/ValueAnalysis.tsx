import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Percent,
  Layers,
  Scale,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Info,
  DollarSign,
  PieChart,
} from 'lucide-react';
import { useFinancialData } from '../context/FinancialDataContext';
import { MetricCard } from '../components/common/MetricCard';
import { Badge } from '../components/common/Badge';
import { formatCurrency, formatPercent, formatMultiplier } from '../utils/financialFormulas';

export const ValueAnalysis: React.FC = () => {
  const { activeData, calculatedMetrics, setActiveTab } = useFinancialData();

  const isCreating = calculatedMetrics.isValueCreating;

  // Dynamically compute benchmark baselines proportional to the company's size
  const benchmarkRevenue = activeData.prevRevenue > 0 ? activeData.prevRevenue * 1.05 : activeData.revenue;
  const benchmarkEbit = benchmarkRevenue * 0.18; // 18% peer benchmark EBIT margin
  const benchmarkNopat = benchmarkEbit * (1 - activeData.taxRate / 100);
  const benchmarkCapCharge = activeData.investedCapital * 0.08; // 8% hurdle
  const benchmarkEva = benchmarkNopat - benchmarkCapCharge;

  // Comparison Matrix Data
  const comparisonRows = [
    {
      metric: 'Total Revenue',
      current: formatCurrency(activeData.revenue, true),
      prior: formatCurrency(activeData.prevRevenue, true),
      benchmark: formatCurrency(benchmarkRevenue, true),
      variance: formatPercent(calculatedMetrics.revenueGrowth, true),
      isPositive: calculatedMetrics.revenueGrowth > 0,
      description: 'Topline scale & volume',
    },
    {
      metric: 'Operating Profit (EBIT)',
      current: formatCurrency(activeData.operatingProfit, true),
      prior: formatCurrency(activeData.prevOperatingProfit, true),
      benchmark: formatCurrency(benchmarkEbit, true),
      variance: formatPercent(
        activeData.prevOperatingProfit > 0
          ? ((activeData.operatingProfit - activeData.prevOperatingProfit) / activeData.prevOperatingProfit) * 100
          : 0,
        true
      ),
      isPositive: activeData.operatingProfit >= activeData.prevOperatingProfit,
      description: 'Core operational earnings',
    },
    {
      metric: 'NOPAT (After-Tax EBIT)',
      current: formatCurrency(calculatedMetrics.nopat, true),
      prior: formatCurrency(calculatedMetrics.prevNopat, true),
      benchmark: formatCurrency(benchmarkNopat, true),
      variance: formatPercent(
        calculatedMetrics.prevNopat > 0
          ? ((calculatedMetrics.nopat - calculatedMetrics.prevNopat) / calculatedMetrics.prevNopat) * 100
          : 0,
        true
      ),
      isPositive: calculatedMetrics.nopat >= calculatedMetrics.prevNopat,
      description: 'Net operating profit after tax',
    },
    {
      metric: 'Capital Charge (Invested Cap × WACC)',
      current: formatCurrency(calculatedMetrics.capitalCharge, true),
      prior: formatCurrency(calculatedMetrics.prevCapitalCharge, true),
      benchmark: formatCurrency(benchmarkCapCharge, true),
      variance: formatPercent(
        calculatedMetrics.prevCapitalCharge > 0
          ? ((calculatedMetrics.capitalCharge - calculatedMetrics.prevCapitalCharge) / calculatedMetrics.prevCapitalCharge) * 100
          : 0,
        true
      ),
      isPositive: calculatedMetrics.capitalCharge <= calculatedMetrics.prevCapitalCharge, // lower hurdle is favorable
      description: 'Hurdle cost of committed capital',
    },
    {
      metric: 'Economic Value Added (EVA)',
      current: `${calculatedMetrics.eva >= 0 ? '+' : ''}${formatCurrency(calculatedMetrics.eva, true)}`,
      prior: `${calculatedMetrics.prevEva >= 0 ? '+' : ''}${formatCurrency(calculatedMetrics.prevEva, true)}`,
      benchmark: `${benchmarkEva >= 0 ? '+' : ''}${formatCurrency(benchmarkEva, true)}`,
      variance: formatPercent(calculatedMetrics.evaGrowth, true),
      isPositive: calculatedMetrics.eva >= calculatedMetrics.prevEva,
      description: 'True economic profit surplus',
    },
    {
      metric: 'Return on Invested Capital (ROIC)',
      current: formatPercent(calculatedMetrics.roic),
      prior: formatPercent(calculatedMetrics.prevRoic),
      benchmark: '12.0%',
      variance: `${(calculatedMetrics.roic - calculatedMetrics.prevRoic) > 0 ? '+' : ''}${(calculatedMetrics.roic - calculatedMetrics.prevRoic).toFixed(1)}% pts`,
      isPositive: calculatedMetrics.roic >= calculatedMetrics.prevRoic,
      description: 'Operating return on capital',
    },
    {
      metric: 'Return on Investment (ROI)',
      current: formatPercent(calculatedMetrics.roi),
      prior: formatPercent(calculatedMetrics.prevRoi),
      benchmark: '10.5%',
      variance: `${(calculatedMetrics.roi - calculatedMetrics.prevRoi) > 0 ? '+' : ''}${(calculatedMetrics.roi - calculatedMetrics.prevRoi).toFixed(1)}% pts`,
      isPositive: calculatedMetrics.roi >= calculatedMetrics.prevRoi,
      description: 'Net profit per $ invested capital',
    },
    {
      metric: 'Return on Equity (ROE)',
      current: formatPercent(calculatedMetrics.roe),
      prior: formatPercent(calculatedMetrics.prevRoe),
      benchmark: '15.0%',
      variance: `${(calculatedMetrics.roe - calculatedMetrics.prevRoe) > 0 ? '+' : ''}${(calculatedMetrics.roe - calculatedMetrics.prevRoe).toFixed(1)}% pts`,
      isPositive: calculatedMetrics.roe >= calculatedMetrics.prevRoe,
      description: 'Equity capital return',
    },
    {
      metric: 'Debt Ratio (Debt / Total Capital)',
      current: formatPercent(calculatedMetrics.debtRatio),
      prior: formatPercent(calculatedMetrics.prevDebtRatio),
      benchmark: '25.0%',
      variance: `${calculatedMetrics.debtRatioChange > 0 ? '+' : ''}${calculatedMetrics.debtRatioChange.toFixed(1)}% pts`,
      isPositive: calculatedMetrics.debtRatio <= 30,
      description: 'Financial leverage solvency',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Value Verdict Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Stern Stewart & DuPont Framework
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">
            Shareholder Value Creation & Capital Productivity Analysis
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Evaluating true economic profit (EVA) after accounting for the opportunity cost of both debt and equity capital.
          </p>
        </div>

        {/* Verdict Badge */}
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 shrink-0 ${
            activeData.revenue <= 0
              ? 'bg-slate-50 border-slate-200 text-slate-700'
              : isCreating
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              activeData.revenue <= 0
                ? 'bg-slate-400 text-white'
                : isCreating
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            {activeData.revenue <= 0 ? (
              <Scale className="w-5 h-5" />
            ) : isCreating ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">
              {activeData.revenue <= 0
                ? 'Status: Ready for Input'
                : isCreating
                ? 'Status: Value Creator'
                : 'Status: Value Destroyer'}
            </div>
            <div className="text-sm font-extrabold font-mono">
              {activeData.revenue <= 0
                ? 'EVA: $0.0M'
                : `EVA: ${isCreating ? '+' : ''}${formatCurrency(calculatedMetrics.eva, true)}`}
            </div>
          </div>
        </div>
      </div>

      {activeData.revenue <= 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">No Enterprise Statements Loaded</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Input your company's income statement and balance sheet in the Financial Data tab to compute NOPAT, EVA, ROIC, and Capital Charge breakdown.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('input')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
          >
            <span>Input Financial Statements</span>
          </button>
        </div>
      )}

      {/* 1. Interactive EVA Equation Breakdown */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Economic Value Added (EVA) Equation Decomposition
            </h3>
          </div>
          <span className="text-xs font-mono font-medium text-slate-500">
            EVA = NOPAT - (Invested Capital × WACC)
          </span>
        </div>

        {/* Visual Equation Flow */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
          {/* Step 1: NOPAT */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Step 1: NOPAT
            </span>
            <div className="text-lg font-bold text-slate-900 font-mono">
              {formatCurrency(calculatedMetrics.nopat, true)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              EBIT ({formatCurrency(activeData.operatingProfit, true)}) × (1 - {activeData.taxRate}%)
            </div>
          </div>

          {/* Minus Operator */}
          <div className="text-center font-bold text-slate-400 text-xl hidden md:block">
            —
          </div>

          {/* Step 2: Capital Charge */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Step 2: Capital Charge
            </span>
            <div className="text-lg font-bold text-slate-900 font-mono">
              {formatCurrency(calculatedMetrics.capitalCharge, true)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Cap ({formatCurrency(activeData.investedCapital, true)}) × WACC ({activeData.wacc}%)
            </div>
          </div>

          {/* Equals Operator */}
          <div className="text-center font-bold text-slate-400 text-xl hidden md:block">
            =
          </div>

          {/* Step 3: Resulting EVA */}
          <div
            className={`p-4 rounded-xl border text-center ${
              isCreating
                ? 'bg-emerald-500/10 border-emerald-300 text-emerald-900'
                : 'bg-rose-500/10 border-rose-300 text-rose-900'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">
              Economic Surplus (EVA)
            </span>
            <div className="text-xl font-black font-mono">
              {isCreating ? '+' : ''}{formatCurrency(calculatedMetrics.eva, true)}
            </div>
            <div className="text-[11px] font-semibold mt-1">
              {isCreating ? 'Net Value Generated' : 'Capital Erosion'}
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200/60 text-xs text-slate-600 flex items-start gap-2">
          <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <strong>Strategic Interpretation:</strong> Traditional accounting net income ({formatCurrency(activeData.netProfit, true)}) only deducts debt interest. EVA deducts the full cost of equity as well. Since EVA is <strong>{isCreating ? 'positive' : 'negative'}</strong>, management is <strong>{isCreating ? 'enriching shareholders above market opportunity cost' : 'eroding real equity value despite positive accounting profits'}</strong>.
          </span>
        </div>
      </div>

      {/* 2. Capital Return Pillars: ROIC vs ROI vs ROE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* ROIC Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Operating Capital Return</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Unlevered</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-emerald-600">{formatPercent(calculatedMetrics.roic)}</span>
            <span className="text-xs text-slate-500 font-mono">Hurdle: {formatPercent(activeData.wacc)}</span>
          </div>
          <h4 className="text-xs font-bold text-slate-800">Return on Invested Capital (ROIC)</h4>
          <p className="text-[11px] text-slate-500">
            Formula: NOPAT / Invested Capital. Measures operating returns before capital structure distortions.
          </p>
        </div>

        {/* ROI Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Total Return on Capital</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">All-In</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-blue-600">{formatPercent(calculatedMetrics.roi)}</span>
            <span className="text-xs text-slate-500 font-mono">Net Profit Yield</span>
          </div>
          <h4 className="text-xs font-bold text-slate-800">Return on Investment (ROI)</h4>
          <p className="text-[11px] text-slate-500">
            Formula: Net Profit / Invested Capital. Bottom-line return earned per dollar of capital committed.
          </p>
        </div>

        {/* ROE Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Shareholder Return</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">Levered</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-indigo-600">{formatPercent(calculatedMetrics.roe)}</span>
            <span className="text-xs text-slate-500 font-mono">Target: 15.0%</span>
          </div>
          <h4 className="text-xs font-bold text-slate-800">Return on Equity (ROE)</h4>
          <p className="text-[11px] text-slate-500">
            Formula: Net Profit / Equity. Direct return realized on shareholder equity book value.
          </p>
        </div>
      </div>

      {/* 3. ROIC vs WACC Spread & DuPont ROE Decomposition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pillar A: ROIC vs WACC Hurdle Spread */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                ROIC vs. WACC Value Spread
              </h3>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                calculatedMetrics.valueSpread > 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              Spread: {calculatedMetrics.valueSpread > 0 ? '+' : ''}{calculatedMetrics.valueSpread.toFixed(1)}%
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Return on Invested Capital (ROIC)</span>
                <span className="font-mono text-emerald-600 font-bold">{formatPercent(calculatedMetrics.roic)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, calculatedMetrics.roic * 3.5))}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Weighted Average Cost of Capital (WACC Hurdle)</span>
                <span className="font-mono text-slate-700 font-bold">{formatPercent(activeData.wacc)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-slate-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, activeData.wacc * 3.5))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Invested Capital Employed:</span>
              <strong className="text-slate-800 font-mono">{formatCurrency(activeData.investedCapital, true)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Net Value Created per $100 Capital:</span>
              <strong className={calculatedMetrics.valueSpread >= 0 ? "text-emerald-600 font-mono" : "text-rose-600 font-mono"}>
                {calculatedMetrics.valueSpread >= 0 ? '+' : ''}${calculatedMetrics.valueSpread.toFixed(2)} / yr
              </strong>
            </div>
          </div>
        </div>

        {/* Pillar B: DuPont ROE Decomposition */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                DuPont ROE Decomposition (3-Way)
              </h3>
            </div>
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-800">
              ROE: {formatPercent(calculatedMetrics.roe)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Factor 1: Net Margin */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Net Profit Margin
              </span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {formatPercent(calculatedMetrics.netProfitMargin)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Earnings efficiency</span>
            </div>

            {/* Factor 2: Asset Turnover */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Capital Turnover
              </span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {activeData.investedCapital > 0 ? (activeData.revenue / activeData.investedCapital).toFixed(2) : '0.00'}x
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Asset utilization</span>
            </div>

            {/* Factor 3: Financial Leverage */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Financial Leverage
              </span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {activeData.shareholdersEquity > 0
                  ? ((activeData.totalDebt + activeData.shareholdersEquity) / activeData.shareholdersEquity).toFixed(2)
                  : '0.00'}x
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Assets / Equity</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 pt-1">
            DuPont analysis decomposes ROE into profitability, operational productivity, and capital structure leverage.
          </p>
        </div>
      </div>

      {/* 4. Comprehensive Performance Comparison Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Multi-Metric Variance Analysis
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Financial Performance Comparison (Current vs. Prior vs. Peer Benchmark)
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
            Audit Grade
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-5">Financial Metric</th>
                <th className="py-3 px-4">Current FY</th>
                <th className="py-3 px-4">Prior FY</th>
                <th className="py-3 px-4">Peer Benchmark</th>
                <th className="py-3 px-4">YoY Variance</th>
                <th className="py-3 px-5">Diagnostic Evaluation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {comparisonRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-5">
                    <span className="font-bold text-slate-900 block">{row.metric}</span>
                    <span className="text-[11px] text-slate-400">{row.description}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                    {row.current}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {row.prior}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">
                    {row.benchmark}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-0.5 font-mono font-bold ${
                        row.isPositive ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {row.isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {row.variance}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    {row.isPositive ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Favorable
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        Monitoring
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
