import React, { useState } from 'react';
import {
  SlidersHorizontal,
  TrendingUp,
  Scale,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Zap,
  Sparkles,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useFinancialData } from '../context/FinancialDataContext';
import { MetricCard } from '../components/common/MetricCard';
import { formatCurrency, formatPercent } from '../utils/financialFormulas';
import { apiService, AiScenarioExplainResponse } from '../services/api';

export const ScenarioSimulator: React.FC = () => {
  const {
    activeData,
    calculatedMetrics,
    scenarios,
    runScenarioSimulation,
    runBackendScenarioComparison,
    isBackendConnected,
    setNotification,
    activeCompanyId,
    isAiConfigured,
    setActiveTab,
  } = useFinancialData();

  // Custom scenario interactive slider states
  const [revGrowthPct, setRevGrowthPct] = useState<number>(8.0);
  const [marginDeltaPct, setMarginDeltaPct] = useState<number>(1.0);
  const [capexDeltaMillions, setCapexDeltaMillions] = useState<number>(10.0);
  const [debtDeltaMillions, setDebtDeltaMillions] = useState<number>(-5.0);
  const [waccDeltaBps, setWaccDeltaBps] = useState<number>(-0.2);
  const [isSimulatingBackend, setIsSimulatingBackend] = useState<boolean>(false);

  // Gemini AI Scenario Interpretation State
  const [aiInterpretation, setAiInterpretation] = useState<AiScenarioExplainResponse | null>(null);
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  // Compute custom scenario in real time
  const customScenario = runScenarioSimulation(
    revGrowthPct,
    marginDeltaPct,
    debtDeltaMillions * 1e6,
    capexDeltaMillions * 1e6,
    waccDeltaBps
  );

  // Prepare chart comparison data
  const chartData = [
    {
      scenario: 'Baseline (Current)',
      eva: +(calculatedMetrics.eva / 1e6).toFixed(1),
      score: calculatedMetrics.shareholderValueScore,
      roe: +calculatedMetrics.roe.toFixed(1),
    },
    {
      scenario: 'Growth Capex',
      eva: +(scenarios[0].projectedEva / 1e6).toFixed(1),
      score: scenarios[0].projectedScore,
      roe: +scenarios[0].projectedRoe.toFixed(1),
    },
    {
      scenario: 'Debt Reduction',
      eva: +(scenarios[1].projectedEva / 1e6).toFixed(1),
      score: scenarios[1].projectedScore,
      roe: +scenarios[1].projectedRoe.toFixed(1),
    },
    {
      scenario: 'Dividend / Buyback',
      eva: +(scenarios[2].projectedEva / 1e6).toFixed(1),
      score: scenarios[2].projectedScore,
      roe: +scenarios[2].projectedRoe.toFixed(1),
    },
    {
      scenario: 'Your Custom Mix',
      eva: +(customScenario.projectedEva / 1e6).toFixed(1),
      score: customScenario.projectedScore,
      roe: +customScenario.projectedRoe.toFixed(1),
    },
  ];

  const handleResetSliders = () => {
    setRevGrowthPct(8.0);
    setMarginDeltaPct(1.0);
    setCapexDeltaMillions(10.0);
    setDebtDeltaMillions(-5.0);
    setWaccDeltaBps(-0.2);
  };

  const handleRunBackendComparison = async () => {
    if (!isBackendConnected) {
      setNotification('Backend server is offline. Running simulation with local financial engine.');
      return;
    }
    setIsSimulatingBackend(true);
    try {
      const debtPaydown = Math.min(activeData.totalDebt * 0.4, 20000000);
      const res = await runBackendScenarioComparison([
        {
          name: 'Growth Reinvestment Program',
          scenario_type: 'reinvest',
          description: 'Deploy Capex into product expansion (+12% Rev, +$15M Cap, +$5M Debt).',
          rev_delta_pct: 12.0,
          margin_delta_pct: -1.0,
          debt_delta: 5000000,
          invested_capital_delta: 15000000,
          wacc_delta: 0.1,
        },
        {
          name: 'Aggressive Debt Deleveraging',
          scenario_type: 'debt_repayment',
          description: 'Pay down debt from cash reserves (-$20M Debt, -0.4% WACC).',
          rev_delta_pct: 2.0,
          margin_delta_pct: 0.8,
          debt_delta: -debtPaydown,
          invested_capital_delta: -5000000,
          wacc_delta: -0.4,
        },
        {
          name: 'Special Dividend & Share Buyback',
          scenario_type: 'dividend',
          description: 'Return capital to equity holders (-$14M Equity Capital, +0.3% WACC).',
          rev_delta_pct: 0.0,
          margin_delta_pct: 0.0,
          debt_delta: 4000000,
          invested_capital_delta: -14000000,
          wacc_delta: 0.3,
        },
        {
          name: 'Custom User Mix',
          scenario_type: 'custom',
          description: `Custom interactive sliders: ${revGrowthPct}% Rev, ${marginDeltaPct}% Margin, $${capexDeltaMillions}M Capex.`,
          rev_delta_pct: revGrowthPct,
          margin_delta_pct: marginDeltaPct,
          debt_delta: debtDeltaMillions * 1e6,
          invested_capital_delta: capexDeltaMillions * 1e6,
          wacc_delta: waccDeltaBps,
        },
      ]);
      if (res && res.scenarios) {
        setNotification(`Backend simulation completed for ${res.scenarios.length} scenarios and archived to SQLite database!`);
      }
    } catch (err) {
      console.warn('Backend scenario run failed:', err);
    } finally {
      setIsSimulatingBackend(false);
    }
  };

  const handleInterpretScenario = async () => {
    if (!activeCompanyId) {
      setNotification('No active company selected.');
      return;
    }
    if (!isAiConfigured) {
      setNotification('Please configure Gemini API key in AI Settings to enable AI scenario interpretation.');
      return;
    }

    setIsExplaining(true);
    setExplainError(null);
    try {
      const payload = {
        scenario_name: 'Your Custom Strategic Mix',
        scenario_type: 'custom',
        assumptions: {
          rev_delta_pct: revGrowthPct,
          margin_delta_pct: marginDeltaPct,
          debt_delta: debtDeltaMillions * 1e6,
          invested_capital_delta: capexDeltaMillions * 1e6,
          wacc_delta: waccDeltaBps,
        },
        baseline_metrics: {
          revenue: activeData.revenue,
          ebit: activeData.operatingProfit,
          eva: calculatedMetrics.eva,
          roic: calculatedMetrics.roic,
          roe: calculatedMetrics.roe,
          debt_ratio: calculatedMetrics.debtRatio,
          score: calculatedMetrics.shareholderValueScore,
        },
        projected_metrics: {
          projected_revenue: customScenario.projectedRevenue,
          projected_net_profit: customScenario.projectedNetProfit,
          projected_eva: customScenario.projectedEva,
          projected_roe: customScenario.projectedRoe,
          projected_debt_ratio: customScenario.projectedDebtRatio,
          projected_score: customScenario.projectedScore,
          eva_impact: customScenario.evaImpact,
        },
      };

      const result = await apiService.explainScenarioWithAi(activeCompanyId, payload);
      setAiInterpretation(result);
      setNotification('Gemini AI scenario interpretation completed!');
    } catch (err: any) {
      setExplainError(err.message || 'AI scenario interpretation failed.');
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Strategic Decision Modeling
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">
            Scenario Simulator: Capital Allocation & Value Impact
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Simulate how organic reinvestment, balance sheet deleveraging, and shareholder distributions alter your Economic Value Added (EVA) and Value Score.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleInterpretScenario}
            disabled={isExplaining || activeData.revenue <= 0}
            className="px-3 py-1.5 rounded-lg border border-purple-600 bg-purple-50 text-xs font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isExplaining ? 'animate-spin' : 'text-purple-600'}`} />
            <span>{isExplaining ? 'Interpreting...' : 'AI Scenario Interpretation'}</span>
          </button>

          <button
            onClick={handleRunBackendComparison}
            disabled={isSimulatingBackend || activeData.revenue <= 0}
            className="px-3 py-1.5 rounded-lg border border-emerald-600 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            <Zap className={`w-3.5 h-3.5 ${isSimulatingBackend ? 'animate-spin' : 'text-emerald-600'}`} />
            <span>{isSimulatingBackend ? 'Simulating on Backend...' : 'Run Backend Simulation & Save'}</span>
          </button>

          <button
            onClick={handleResetSliders}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Sliders</span>
          </button>
        </div>
      </div>

      {activeData.revenue <= 0 && (
        <div className="bg-white p-8 rounded-xl border border-slate-200/80 shadow-sm text-center space-y-3">
          <Scale className="w-10 h-10 text-emerald-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-900">No Enterprise Baseline Statements Loaded</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            The Scenario Simulator stress-tests corporate decisions against your company's actual revenue and capital structure. Please enter financial statements in the Financial Data tab.
          </p>
          <button
            onClick={() => setActiveTab('input')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm"
          >
            <span>Input Financial Statements</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Preset Scenario Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Scenario 1: Growth Reinvestment */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Scenario A
            </span>
            <span className="text-xs font-bold text-emerald-600 font-mono">
              +${(scenarios[0].evaImpact / 1e6).toFixed(1)}M EVA
            </span>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900">{scenarios[0].name}</h4>
            <p className="text-xs text-slate-500 mt-1">{scenarios[0].description}</p>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 block">Projected EVA</span>
              <strong className="text-slate-800 font-mono">+{formatCurrency(scenarios[0].projectedEva, true)}</strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Projected ROE</span>
              <strong className="text-slate-800 font-mono">{formatPercent(scenarios[0].projectedRoe)}</strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Value Score</span>
              <strong className="text-emerald-600 font-mono">{scenarios[0].projectedScore}/100</strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Debt Ratio</span>
              <strong className="text-slate-800 font-mono">{formatPercent(scenarios[0].projectedDebtRatio)}</strong>
            </div>
          </div>
        </div>

        {/* Scenario 2: Aggressive Deleveraging */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Scenario B
            </span>
            <span className="text-xs font-bold text-emerald-600 font-mono">
              +${(scenarios[1].evaImpact / 1e6).toFixed(1)}M EVA
            </span>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900">{scenarios[1].name}</h4>
            <p className="text-xs text-slate-500 mt-1">{scenarios[1].description}</p>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 block">Projected EVA</span>
              <strong className="text-slate-800 font-mono">+{formatCurrency(scenarios[1].projectedEva, true)}</strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Projected ROE</span>
              <strong className="text-slate-800 font-mono">{formatPercent(scenarios[1].projectedRoe)}</strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Value Score</span>
              <strong className="text-emerald-600 font-mono">{scenarios[1].projectedScore}/100</strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Debt Ratio</span>
              <strong className="text-slate-800 font-mono">{formatPercent(scenarios[1].projectedDebtRatio)}</strong>
            </div>
          </div>
        </div>

        {/* Scenario 3: Dividend & Share Buyback */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
              Scenario C
            </span>
            <span className="text-xs font-bold text-purple-600 font-mono">
              +${(scenarios[2].evaImpact / 1e6).toFixed(1)}M EVA
            </span>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900">{scenarios[2].name}</h4>
            <p className="text-xs text-slate-500 mt-1">{scenarios[2].description}</p>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 block">Projected EVA</span>
              <strong className="text-slate-800 font-mono">+{formatCurrency(scenarios[2].projectedEva, true)}</strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Projected ROE</span>
              <strong className="text-indigo-600 font-mono">{formatPercent(scenarios[2].projectedRoe)}</strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Value Score</span>
              <strong className="text-slate-800 font-mono">{scenarios[2].projectedScore}/100</strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Debt Ratio</span>
              <strong className="text-slate-800 font-mono">{formatPercent(scenarios[2].projectedDebtRatio)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Levers & Real-Time Custom Scenario Sandbox */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Interactive Custom Decision Levers
            </h3>
          </div>
          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            Live Mathematical Engine
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Sliders Column */}
          <div className="space-y-5">
            {/* Lever 1: Revenue Growth */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                <span className="text-slate-700">1. Topline Revenue Growth Delta</span>
                <span className="font-mono text-emerald-600 font-bold">
                  {revGrowthPct > 0 ? '+' : ''}{revGrowthPct.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="-15"
                max="30"
                step="0.5"
                value={revGrowthPct}
                onChange={(e) => setRevGrowthPct(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>-15% (Contraction)</span>
                <span>0% (Flat)</span>
                <span>+30% (High Growth)</span>
              </div>
            </div>

            {/* Lever 2: Operating Margin Delta */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                <span className="text-slate-700">2. Operating Margin Expansion/Compression</span>
                <span className="font-mono text-emerald-600 font-bold">
                  {marginDeltaPct > 0 ? '+' : ''}{marginDeltaPct.toFixed(1)}% pts
                </span>
              </div>
              <input
                type="range"
                min="-5"
                max="8"
                step="0.2"
                value={marginDeltaPct}
                onChange={(e) => setMarginDeltaPct(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>-500 bps (Margin erosion)</span>
                <span>0 bps</span>
                <span>+800 bps (Efficiency)</span>
              </div>
            </div>

            {/* Lever 3: Capex Investment */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                <span className="text-slate-700">3. Capital Reinvestment / Capex Delta</span>
                <span className="font-mono text-slate-800 font-bold">
                  {capexDeltaMillions > 0 ? '+' : ''}${capexDeltaMillions.toFixed(1)}M
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="40"
                step="1"
                value={capexDeltaMillions}
                onChange={(e) => setCapexDeltaMillions(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>-$20M (Harvest assets)</span>
                <span>$0M</span>
                <span>+$40M (Aggressive Capex)</span>
              </div>
            </div>

            {/* Lever 4: Debt Modification */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                <span className="text-slate-700">4. Debt Issuance (+) vs. Debt Paydown (-)</span>
                <span className="font-mono text-slate-800 font-bold">
                  {debtDeltaMillions > 0 ? '+' : ''}${debtDeltaMillions.toFixed(1)}M
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                step="1"
                value={debtDeltaMillions}
                onChange={(e) => setDebtDeltaMillions(parseFloat(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>-$30M (Deleveraging)</span>
                <span>$0M</span>
                <span>+$30M (Leverage up)</span>
              </div>
            </div>

            {/* Lever 5: WACC Hurdle Delta */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                <span className="text-slate-700">5. WACC Hurdle Fluctuation</span>
                <span className="font-mono text-slate-800 font-bold">
                  {waccDeltaBps > 0 ? '+' : ''}{(waccDeltaBps * 100).toFixed(0)} bps
                </span>
              </div>
              <input
                type="range"
                min="-1.5"
                max="2.5"
                step="0.1"
                value={waccDeltaBps}
                onChange={(e) => setWaccDeltaBps(parseFloat(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>-150 bps (Lower cost)</span>
                <span>0 bps</span>
                <span>+250 bps (Rate spike)</span>
              </div>
            </div>
          </div>

          {/* Real-time Projected Outcome Card */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Simulated Outcome Scorecard
              </span>
              <span
                className={`text-xs font-extrabold px-2 py-0.5 rounded font-mono ${
                  customScenario.evaImpact >= 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                EVA Impact: {customScenario.evaImpact >= 0 ? '+' : ''}{formatCurrency(customScenario.evaImpact, true)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200/70">
                <span className="text-[10px] text-slate-400 block">Projected Revenue</span>
                <strong className="text-sm font-bold font-mono text-slate-900">
                  {formatCurrency(customScenario.projectedRevenue, true)}
                </strong>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200/70">
                <span className="text-[10px] text-slate-400 block">Projected Net Profit</span>
                <strong className="text-sm font-bold font-mono text-slate-900">
                  {formatCurrency(customScenario.projectedNetProfit, true)}
                </strong>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200/70">
                <span className="text-[10px] text-slate-400 block">Projected EVA</span>
                <strong
                  className={`text-sm font-bold font-mono ${
                    customScenario.projectedEva >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {customScenario.projectedEva >= 0 ? '+' : ''}{formatCurrency(customScenario.projectedEva, true)}
                </strong>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200/70">
                <span className="text-[10px] text-slate-400 block">Projected ROE</span>
                <strong className="text-sm font-bold font-mono text-indigo-600">
                  {formatPercent(customScenario.projectedRoe)}
                </strong>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200/70">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-700">Projected Value Score</span>
                <span className="text-sm font-extrabold font-mono text-slate-900">
                  {customScenario.projectedScore} / 100
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${customScenario.projectedScore}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Baseline: {calculatedMetrics.shareholderValueScore} pts</span>
                <span className="text-emerald-600 font-semibold">
                  Delta: {customScenario.projectedScore - calculatedMetrics.shareholderValueScore > 0 ? '+' : ''}
                  {customScenario.projectedScore - calculatedMetrics.shareholderValueScore} pts
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Comparison Chart */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Comparative Impact Analysis
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              EVA & Shareholder Value Score Across Strategic Paths
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Recharts Visualization</span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="scenario"
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}M`}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip
                formatter={(value: any, name?: any) => [
                  name === 'EVA ($M)' ? `$${value}M` : `${value}`,
                  name || '',
                ]}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
              />
              <Bar dataKey="eva" name="EVA ($M)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="roe" name="ROE (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gemini AI Strategic Scenario Interpretation Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Gemini AI Strategic Scenario Interpretation
              </h3>
              <p className="text-[11px] text-slate-500">
                Qualitative valuation diagnosis grounded strictly in calculated engine outcomes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAiConfigured ? (
              <button
                onClick={handleInterpretScenario}
                disabled={isExplaining}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-200 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isExplaining ? 'animate-spin' : ''}`} />
                <span>{isExplaining ? 'Interpreting...' : 'Generate AI Diagnosis'}</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('ai_settings')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
              >
                <span>Configure Gemini</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Not Configured State */}
        {!isAiConfigured && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-600 flex items-center justify-between">
            <span>Connect your Gemini API key in AI Settings to enable automated strategic scenario interpretation.</span>
            <button
              onClick={() => setActiveTab('ai_settings')}
              className="text-purple-700 font-bold hover:underline ml-2 shrink-0"
            >
              Open Settings &rarr;
            </button>
          </div>
        )}

        {/* Error State */}
        {explainError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{explainError}</span>
            </div>
            <button onClick={() => setExplainError(null)} className="underline text-[11px]">
              Dismiss
            </button>
          </div>
        )}

        {/* Loading State */}
        {isExplaining && (
          <div className="p-6 text-center text-xs text-slate-500 space-y-2">
            <RefreshCw className="w-6 h-6 text-purple-600 animate-spin mx-auto" />
            <p className="font-semibold text-slate-700">Gemini is interpreting value creation drivers for this strategic mix...</p>
            <p className="text-[11px] text-slate-400">Evaluating incremental ROIC vs WACC hurdle, balance sheet debt shift, and EVA impact.</p>
          </div>
        )}

        {/* Rendered Interpretation */}
        {!isExplaining && aiInterpretation && (
          <div className="space-y-4 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    aiInterpretation.value_creation_verdict === 'Value Accretive'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : aiInterpretation.value_creation_verdict === 'Value Dilutive'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {aiInterpretation.value_creation_verdict}
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {aiInterpretation.headline}
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Model: {aiInterpretation.model_used}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  1. Operational & Capital Shifts
                </span>
                <p className="text-slate-700 leading-relaxed">{aiInterpretation.what_changed}</p>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  2. Strategic Value Implications
                </span>
                <p className="text-slate-700 leading-relaxed">{aiInterpretation.why_it_matters}</p>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  3. EVA & ROIC Spread Dynamics
                </span>
                <p className="text-slate-700 leading-relaxed">{aiInterpretation.eva_roic_impact_analysis}</p>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  4. Solvency & Balance Sheet Headroom
                </span>
                <p className="text-slate-700 leading-relaxed">{aiInterpretation.debt_solvency_implications}</p>
              </div>
            </div>

            {aiInterpretation.strategic_recommendations && aiInterpretation.strategic_recommendations.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Executive Recommendations for Leadership:
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {aiInterpretation.strategic_recommendations.map((rec, idx) => (
                    <li
                      key={idx}
                      className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/60 text-emerald-950 flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
