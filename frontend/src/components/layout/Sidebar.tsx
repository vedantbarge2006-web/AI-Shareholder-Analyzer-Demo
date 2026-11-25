import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  LineChart,
  Sparkles,
  SlidersHorizontal,
  FileText,
  Shield,
  Layers,
  Key,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useFinancialData } from '../../context/FinancialDataContext';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { activeTab, setActiveTab, activeData, calculatedMetrics } = useFinancialData();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: 'Overview',
    },
    {
      id: 'input',
      label: 'Financial Data Input',
      icon: FileSpreadsheet,
      badge: 'Edit',
    },
    {
      id: 'analysis',
      label: 'Value Analysis',
      icon: LineChart,
      badge: 'EVA & ROE',
    },
    {
      id: 'insights',
      label: 'AI Insights',
      icon: Sparkles,
      badge: 'Valora Copilot',
      highlight: true,
    },
    {
      id: 'simulator',
      label: 'Scenario Simulator',
      icon: SlidersHorizontal,
      badge: 'Interactive',
    },
    {
      id: 'reports',
      label: 'Reports & Audits',
      icon: FileText,
      badge: 'Export',
    },
    {
      id: 'ai_settings',
      label: 'AI Settings',
      icon: Key,
      badge: 'Gemini',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-18 px-6 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-slate-900">
                  VALORA
                </span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  AI
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 -mt-0.5 tracking-tight">
                Value Creation Analyzer
              </p>
            </div>
          </div>
        </div>

        {/* Company Quick Glance Badge */}
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${calculatedMetrics.isValueCreating ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-xs font-semibold text-slate-700 truncate max-w-[140px]">
                {activeData.companyName}
              </span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-mono">
              {activeData.ticker}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
            <span>Score: <strong className="text-slate-800">{calculatedMetrics.shareholderValueScore}/100</strong></span>
            <span className={calculatedMetrics.isValueCreating ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
              {calculatedMetrics.isValueCreating ? 'Value Accretive' : 'Value Destroyer'}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold tracking-wider uppercase text-slate-400">
            Main Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 group ${
                  isActive
                    ? 'bg-emerald-50/90 text-emerald-800 shadow-sm border border-emerald-200/70'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded-md transition-colors ${
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-500 group-hover:text-slate-800 group-hover:bg-slate-200/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-left font-medium">{item.label}</span>
                </div>

                {item.highlight ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-2.5 h-2.5" />
                    AI
                  </span>
                ) : (
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                      isActive ? 'text-emerald-700 translate-x-0.5' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom System Status & Phase Info */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/50">
          <div className="bg-white rounded-lg p-3 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Phase 3 Live
              </span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                Gemini AI Analyst
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Google GenAI SDK integrated. Valuation copilot active.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
