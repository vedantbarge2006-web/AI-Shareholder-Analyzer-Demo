import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  Send,
  MessageSquare,
  Bot,
  HelpCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  Target,
  Clock,
  ChevronRight,
  TrendingDown,
  Scale,
} from 'lucide-react';
import { useFinancialData } from '../context/FinancialDataContext';
import { formatCurrency, formatPercent } from '../utils/financialFormulas';
import { apiService } from '../services/api';

export const AiInsights: React.FC = () => {
  const {
    activeData,
    calculatedMetrics,
    activeCompanyId,
    aiStatus,
    isAiConfigured,
    aiAnalysis,
    isAiAnalyzing,
    aiAnalysisError,
    fetchAiAnalysis,
    setActiveTab,
  } = useFinancialData();

  // Chat conversation state
  const [activeQuery, setActiveQuery] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: 'user' | 'assistant'; text: string; time: string; metrics?: string[] }>
  >([
    {
      role: 'assistant',
      text: activeData.revenue > 0
        ? `Hello! I am the Valora AI Executive Valuation Agent. I have verified ${activeData.companyName}'s financial statements. Currently, your Shareholder Value Score is ${calculatedMetrics.shareholderValueScore}/100 with an Economic Value Added (EVA) of ${calculatedMetrics.isValueCreating ? '+' : ''}${formatCurrency(calculatedMetrics.eva, true)}. What financial or capital allocation questions can I answer for you?`
        : `Hello! I am your Valora AI Corporate Finance Assistant. No company statements are currently loaded. Enter your statements in the Financial Data tab to begin real-time shareholder value analysis.`,
      time: 'Just now',
      metrics: activeData.revenue > 0 ? ['EVA', 'Shareholder Value Score'] : undefined,
    },
  ]);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Trigger AI analysis when company changes or when configured
  useEffect(() => {
    if (isAiConfigured && activeCompanyId && activeData.revenue > 0) {
      fetchAiAnalysis(false);
    }
  }, [isAiConfigured, activeCompanyId, activeData.revenue, fetchAiAnalysis]);

  // Reset chat context when active company changes to enforce context isolation
  useEffect(() => {
    if (activeData.companyName && activeData.revenue > 0) {
      setChatHistory([
        {
          role: 'assistant',
          text: `Switched corporate profile to ${activeData.companyName} (${activeData.ticker}). Shareholder Value Score: ${calculatedMetrics.shareholderValueScore}/100 with EVA of ${calculatedMetrics.isValueCreating ? '+' : ''}${formatCurrency(calculatedMetrics.eva, true)}. How can I assist with your capital strategy?`,
          time: 'Just now',
          metrics: ['EVA', 'Score'],
        },
      ]);
    } else {
      setChatHistory([
        {
          role: 'assistant',
          text: 'Hello! I am your Valora AI Corporate Finance Assistant. No company statements are currently loaded. Enter your statements in the Financial Data tab to begin real-time shareholder value analysis.',
          time: 'Just now',
        },
      ]);
    }
  }, [activeData.ticker, activeData.companyName, activeData.revenue, calculatedMetrics.shareholderValueScore, calculatedMetrics.isValueCreating, calculatedMetrics.eva]);

  // Scroll chat into view on updates
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatLoading]);

  const samplePrompts = [
    'Why is our EVA positive/negative this period?',
    'How can we improve our ROIC to expand value spread?',
    'Is our debt-to-equity ratio safe or risky?',
    'Should we invest in Capex expansion or pay down debt?',
  ];

  const handleAsk = async (queryText: string) => {
    const q = queryText.trim();
    if (!q || isChatLoading) return;

    if (!isAiConfigured) {
      setChatError('Gemini API is not configured. Please add your API key in AI Settings.');
      return;
    }

    if (!activeCompanyId) {
      setChatError('No active company selected.');
      return;
    }

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { role: 'user' as const, text: q, time: now };
    setChatHistory((prev) => [...prev, userMsg]);
    setActiveQuery('');
    setChatError(null);
    setIsChatLoading(true);

    // Format history for backend request
    const backendHistory = chatHistory.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      content: msg.text,
    }));

    try {
      const response = await apiService.sendAiChat(activeCompanyId, q, backendHistory);
      const assistantMsg = {
        role: 'assistant' as const,
        text: response.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        metrics: response.metrics_referenced,
      };
      setChatHistory((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setChatError(err.message || 'AI Assistant response failed.');
      const errorMsg = {
        role: 'assistant' as const,
        text: 'I encountered an issue communicating with the valuation service. Please verify your Gemini connection in AI Settings or retry your question.',
        time: now,
      };
      setChatHistory((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white p-6 rounded-2xl border border-emerald-900/50 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Valora AI Valuation Copilot
              </span>
              <span className="text-slate-400 text-xs font-mono">
                Model: {aiStatus?.model || 'gemini-2.5-flash'}
              </span>
              {isAiConfigured && (
                <span className="text-[10px] px-2 py-0.5 bg-emerald-900/80 text-emerald-300 rounded-full font-bold border border-emerald-700/50">
                  Live Gemini Connected
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              AI-Driven Shareholder Value Commentary & Risk Diagnostics
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Board-level strategic diagnostics synthesizing Economic Value Added (EVA), DuPont ROE, and capital allocation levers for <strong className="text-white">{activeData.companyName} ({activeData.ticker})</strong>.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {isAiConfigured ? (
              <button
                onClick={() => fetchAiAnalysis(true)}
                disabled={isAiAnalyzing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAiAnalyzing ? 'animate-spin' : ''}`} />
                <span>{isAiAnalyzing ? 'Generating Analysis...' : 'Regenerate Analysis'}</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('ai_settings')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Configure Gemini API</span>
              </button>
            )}

            <span className="text-[10px] text-slate-400 font-mono">
              Grounded in Python Engine Ground Truth
            </span>
          </div>
        </div>
      </div>

      {/* Unconfigured Alert State */}
      {!isAiConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                Gemini AI Financial Analyst is Not Configured
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Configure your Google Gemini API key in AI Settings to enable real-time valuation diagnostics, strengths & weaknesses analysis, and the interactive advisory copilot.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('ai_settings')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors shrink-0 flex items-center gap-1.5 shadow-xs"
          >
            <span>Open AI Settings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* No Statements Loaded State */}
      {isAiConfigured && activeData.revenue <= 0 && (
        <div className="bg-white p-8 rounded-xl border border-slate-200/80 shadow-sm text-center space-y-3">
          <Sparkles className="w-10 h-10 text-emerald-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-900">
            No Company Financial Statements Submitted
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Gemini AI generates valuations based on actual corporate statements. Please enter your statements in the Financial Data tab to generate real shareholder value diagnostics.
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

      {/* AI Analysis Section */}
      {isAiConfigured && activeData.revenue > 0 && (
        <>
          {/* Loading State */}
          {isAiAnalyzing && (
            <div className="bg-white p-8 rounded-xl border border-slate-200/80 shadow-sm text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">
                Gemini AI Financial Analyst is Synthesizing Corporate Metrics...
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Correlating NOPAT (${(calculatedMetrics.nopat / 1e6).toFixed(1)}M), Capital Charge (${(calculatedMetrics.capitalCharge / 1e6).toFixed(1)}M), ROIC ({calculatedMetrics.roic.toFixed(1)}%), and Hurdle Spread ({calculatedMetrics.valueSpread.toFixed(1)}%).
              </p>
            </div>
          )}

          {/* Error State */}
          {!isAiAnalyzing && aiAnalysisError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-rose-900">AI Valuation Analysis Failed</h4>
                  <p className="text-xs text-rose-700 mt-0.5">{aiAnalysisError}</p>
                </div>
              </div>
              <button
                onClick={() => fetchAiAnalysis(true)}
                className="px-3 py-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-100 text-rose-800 text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Rendered Real Gemini Analysis */}
          {!isAiAnalyzing && aiAnalysis && (
            <div className="space-y-6">
              {/* Executive Summary Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      1. Executive Shareholder Value Verdict
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Generated for {aiAnalysis.fiscal_year}
                  </span>
                </div>

                <div className="space-y-3 text-xs leading-relaxed text-slate-700">
                  <p className="font-semibold text-slate-900 bg-slate-50 p-3.5 rounded-lg border border-slate-200/70">
                    {aiAnalysis.executive_summary}
                  </p>
                  <p className="text-slate-600">
                    {aiAnalysis.shareholder_value_assessment}
                  </p>
                </div>

                {/* Outlook Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-lg">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Short-Term Horizon (0–12 Mo)
                    </span>
                    <p className="text-emerald-900 mt-0.5 text-[11px] font-medium">
                      {aiAnalysis.short_term_outlook}
                    </p>
                  </div>
                  <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-lg">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
                      Long-Term Compound Horizon (1–3 Yr)
                    </span>
                    <p className="text-blue-900 mt-0.5 text-[11px] font-medium">
                      {aiAnalysis.long_term_outlook}
                    </p>
                  </div>
                </div>
              </div>

              {/* Strengths, Weaknesses, Risks, Opportunities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Financial Strengths
                    </h4>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600">
                    {aiAnalysis.financial_strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Financial Weaknesses & Capital Drag
                    </h4>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600">
                    {aiAnalysis.financial_weaknesses.map((weak, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                        <span>{weak}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Risks */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Risk Diagnostics
                    </h4>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600">
                    {aiAnalysis.risk_assessment.map((r, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Growth Opportunities */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Lightbulb className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Value Expansion Opportunities
                    </h4>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600">
                    {aiAnalysis.growth_opportunities.map((opp, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Capital Allocation & Recommendations */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      2. Board-Level Capital Allocation & Debt Recommendations
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600">
                    Prioritized & Impact-Mapped
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Capital Allocation */}
                  {aiAnalysis.capital_allocation_recommendations.map((rec, idx) => (
                    <div
                      key={`cap-${idx}`}
                      className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5 text-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Capital Allocation
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rec.priority === 'High'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {rec.priority} Priority
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 leading-snug">
                          {rec.recommendation}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1">{rec.reason}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/70 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Impact:</span>
                          <strong className="text-emerald-700 font-mono">{rec.expected_impact}</strong>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Timeframe:</span>
                          <span className="font-mono text-slate-700">{rec.suggested_timeframe}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Debt Management */}
                  {aiAnalysis.debt_management_recommendations.map((rec, idx) => (
                    <div
                      key={`debt-${idx}`}
                      className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5 text-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Debt Optimization
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            {rec.priority} Priority
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 leading-snug">
                          {rec.recommendation}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1">{rec.reason}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/70 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Impact:</span>
                          <strong className="text-slate-800 font-mono">{rec.expected_impact}</strong>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Timeframe:</span>
                          <span className="font-mono text-slate-700">{rec.suggested_timeframe}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Profitability */}
                  {aiAnalysis.profitability_recommendations.map((rec, idx) => (
                    <div
                      key={`prof-${idx}`}
                      className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5 text-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Operating Margin
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                            {rec.priority} Priority
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 leading-snug">
                          {rec.recommendation}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1">{rec.reason}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/70 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Impact:</span>
                          <strong className="text-blue-700 font-mono">{rec.expected_impact}</strong>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Timeframe:</span>
                          <span className="font-mono text-slate-700">{rec.suggested_timeframe}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prioritized Action Plan */}
              {aiAnalysis.prioritized_action_plan && aiAnalysis.prioritized_action_plan.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        3. Prioritized Strategic Execution Plan
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Sequential Milestones
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {aiAnalysis.prioritized_action_plan.map((step, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-[11px]">
                            {step.step_number || idx + 1}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                            {step.timeline}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900">{step.action}</h4>
                        <div className="pt-2 border-t border-slate-200/60 text-[11px] space-y-0.5">
                          <div className="text-slate-400">Focus: {step.focus_area}</div>
                          <div className="font-mono text-emerald-700 font-semibold truncate">
                            Target: {step.target_metric}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Interactive "Ask Valora AI" Copilot Interface */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Interactive Valuation Copilot (AI Financial Advisory)
              </h3>
              <p className="text-[11px] text-slate-500">
                Directly grounded in <strong className="text-slate-700">{activeData.companyName}</strong>'s balance sheet, EVA, and hurdle metrics.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono hidden sm:inline">
              Company Isolated: {activeData.ticker}
            </span>
          </div>
        </div>

        {/* Quick Sample Prompts Pills */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-500 shrink-0">
            Suggested Queries:
          </span>
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(prompt)}
              disabled={isChatLoading}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-slate-700 text-[11px] font-medium shrink-0 transition-colors shadow-xs"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Conversation Stream */}
        <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
          {chatHistory.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`max-w-2xl p-4 rounded-xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white rounded-br-none shadow-sm'
                    : 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-bl-none shadow-xs space-y-2'
                }`}
              >
                <div>{msg.text}</div>

                {msg.metrics && msg.metrics.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400">Metrics Referenced:</span>
                    {msg.metrics.map((m, mIdx) => (
                      <span
                        key={mIdx}
                        className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[10px] font-mono font-semibold"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}

                <div
                  className={`text-[10px] ${
                    msg.role === 'user' ? 'text-slate-400 text-right' : 'text-slate-400 text-left'
                  }`}
                >
                  {msg.time}
                </div>
              </div>
            </div>
          ))}

          {isChatLoading && (
            <div className="flex items-start gap-3 justify-start">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs text-slate-500 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Gemini AI Analyst is analyzing corporate metrics & crafting advisory...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Chat Error Bar */}
        {chatError && (
          <div className="px-5 py-2 bg-rose-50 border-t border-rose-200 text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{chatError}</span>
            </div>
            <button onClick={() => setChatError(null)} className="underline text-[11px]">
              Dismiss
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
          <input
            type="text"
            value={activeQuery}
            onChange={(e) => setActiveQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk(activeQuery)}
            placeholder={
              isAiConfigured
                ? `Ask about ${activeData.companyName}'s EVA, capital hurdles, ROIC sensitivity...`
                : 'Connect Gemini API Key in AI Settings to chat with copilot...'
            }
            disabled={!isAiConfigured || isChatLoading}
            className="flex-1 px-4 py-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 disabled:bg-slate-100"
          />
          <button
            onClick={() => handleAsk(activeQuery)}
            disabled={!isAiConfigured || isChatLoading || !activeQuery.trim()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span>Ask AI</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
