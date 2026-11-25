import React from 'react';
import {
  Menu,
  Building2,
  ChevronDown,
  RefreshCw,
  Bell,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useFinancialData } from '../../context/FinancialDataContext';
import { formatCurrency } from '../../utils/financialFormulas';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const {
    activeTab,
    activeData,
    calculatedMetrics,
    backendCompanies,
    activeCompanyId,
    selectCompany,
    resetToBlank,
    notification,
    isBackendConnected,
    isBackendLoading,
    isAiConfigured,
    setActiveTab,
  } = useFinancialData();

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Executive Value Dashboard', desc: 'Real-time shareholder value & capital productivity indicators' };
      case 'input':
        return { title: 'Financial Data Input & Calibration', desc: 'Manage balance sheet, operating metrics, and hurdle rates' };
      case 'analysis':
        return { title: 'Shareholder Value Deep-Dive', desc: 'Economic Value Added (EVA), DuPont ROE & ROIC spread breakdown' };
      case 'insights':
        return { title: 'Valora AI Copilot & Insights', desc: 'Algorithmic valuation commentary, risk profiling & capital allocation' };
      case 'simulator':
        return { title: 'Strategic Decision Simulator', desc: 'Stress-test growth capex, debt restructuring, and dividend decisions' };
      case 'reports':
        return { title: 'Executive Reports & Valuation Audits', desc: 'Formal shareholder value statements and historical archives' };
      case 'ai_settings':
        return { title: 'Gemini AI Configuration & Security', desc: 'Manage Google GenAI API credentials, active model, and backend isolation' };
      default:
        return { title: 'Shareholder Value Analyzer', desc: 'Enterprise valuation & capital efficiency' };
    }
  };

  const { title, desc } = getPageTitle();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile trigger & Page Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                {title}
              </h1>
              <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {activeData.fiscalYear}
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden md:block">
              {desc}
            </p>
          </div>
        </div>

        {/* Right Actions: Company Profile Selector & Status */}
        <div className="flex items-center gap-3">
          {/* Backend API & SQLite Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold shadow-xs transition-colors bg-white">
            {isBackendLoading ? (
              <div className="flex items-center gap-1.5 text-amber-700">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                <span>Connecting API...</span>
              </div>
            ) : isBackendConnected ? (
              <div className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse" />
                <span>FastAPI + SQLite Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                <span>Offline Mode</span>
              </div>
            )}
          </div>

          {/* Gemini AI Status Badge */}
          <button
            onClick={() => setActiveTab('ai_settings')}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold shadow-xs transition-colors bg-white hover:bg-slate-50 cursor-pointer"
            title="Configure Gemini AI Analyst"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiConfigured ? 'text-purple-600' : 'text-slate-400'}`} />
            <span className={isAiConfigured ? 'text-purple-700' : 'text-slate-600'}>
              {isAiConfigured ? 'Gemini AI Live' : 'Setup AI'}
            </span>
          </button>

          {/* Quick Company Selector from Backend SQLite */}
          <div className="relative flex items-center">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1.5 shadow-xs">
              <Building2 className="w-4 h-4 text-slate-500 shrink-0 hidden sm:block" />
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold text-slate-400 leading-none">
                  Active Company
                </div>
                <select
                  value={activeCompanyId || 'new'}
                  onChange={(e) => {
                    if (e.target.value === 'new') {
                      resetToBlank();
                      setActiveTab('input');
                    } else {
                      selectCompany(Number(e.target.value));
                    }
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  {backendCompanies.length > 0 ? (
                    backendCompanies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.ticker})
                      </option>
                    ))
                  ) : (
                    <option value="new">No Company Tracked</option>
                  )}
                  <option value="new">+ Register New Company</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick Value Status Pill */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white shadow-xs">
            {activeData.revenue <= 0 ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Ready for Input</span>
              </div>
            ) : calculatedMetrics.isValueCreating ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>EVA:</span>
                <span className="font-bold">+{formatCurrency(calculatedMetrics.eva, true)}</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">
                  Accretive
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>EVA:</span>
                <span className="font-bold">{formatCurrency(calculatedMetrics.eva, true)}</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded font-bold">
                  Dilutive
                </span>
              </div>
            )}
          </div>

          {/* Value Score Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
            <span className="text-slate-500 font-medium hidden sm:inline">Score:</span>
            <span className="font-bold text-slate-900 font-mono text-sm">
              {calculatedMetrics.shareholderValueScore}
            </span>
            <span className="text-slate-400 text-[10px]">/100</span>
          </div>
        </div>
      </div>

      {/* Global Toast / Notification Bar */}
      {notification && (
        <div className="mt-2 py-1.5 px-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
            Recalculated
          </span>
        </div>
      )}
    </header>
  );
};
