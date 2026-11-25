import React, { useState } from 'react';
import {
  Building2,
  DollarSign,
  Percent,
  Layers,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  TrendingUp,
  Scale,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { useFinancialData } from '../context/FinancialDataContext';
import { FinancialData } from '../types/financial';
import { formatCurrency, formatPercent } from '../utils/financialFormulas';
import { BLANK_FINANCIAL_DATA } from '../data/mockFinancialData';

export const FinancialInput: React.FC = () => {
  const {
    activeData,
    updateFinancialData,
    backendCompanies,
    activeCompanyId,
    selectCompany,
    resetToBlank,
    deleteCompany,
    calculatedMetrics,
    setActiveTab,
  } = useFinancialData();

  // Local form state
  const [formData, setFormData] = useState<FinancialData>({ ...activeData });
  const [successBanner, setSuccessBanner] = useState(false);

  // Sync if preset changed externally
  React.useEffect(() => {
    setFormData({ ...activeData });
  }, [activeData]);

  const handleChange = (field: keyof FinancialData, rawValue: string) => {
    setFormData((prev) => {
      if (typeof prev[field] === 'number') {
        const parsed = rawValue === '' ? 0 : parseFloat(rawValue);
        return {
          ...prev,
          [field]: isNaN(parsed) ? 0 : parsed,
        };
      }
      return {
        ...prev,
        [field]: rawValue,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFinancialData(formData);
    setSuccessBanner(true);
    setTimeout(() => setSuccessBanner(false), 3000);
  };

  const handleReset = () => {
    resetToBlank();
    setFormData({ ...BLANK_FINANCIAL_DATA });
  };

  return (
    <div className="space-y-6">
      {/* Header & Company Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Corporate Model Calibration
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">
            Financial Statements & Hurdle Inputs
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Input statement values and capital hurdle figures below. Submitting recalculates EVA, ROE, ROIC, and Shareholder Value Score in the backend financial engine.
          </p>
        </div>

        {/* Company profile selector */}
        <div className="flex items-center gap-2">
          {backendCompanies.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg overflow-x-auto">
              {backendCompanies.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCompany(c.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    activeCompanyId === c.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {c.ticker || c.name.slice(0, 8)}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition-colors"
            title="Create clean company profile"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Profile</span>
          </button>

          {activeCompanyId && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete company profile "${formData.companyName}"? This will remove all associated financial and analysis history.`)) {
                  deleteCompany(activeCompanyId);
                }
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete this company profile"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-xs font-medium animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Financial figures saved! Shareholder Value Score recalculated to <strong>{calculatedMetrics.shareholderValueScore}/100</strong>.</span>
          </div>
          <button
            onClick={() => setActiveTab('analysis')}
            className="text-emerald-700 underline font-bold hover:text-emerald-900"
          >
            View EVA Breakdown &rarr;
          </button>
        </div>
      )}

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Company Profile & Identification */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              1. Enterprise Profile & Period
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Company Name
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                placeholder="Apex Global Technologies Inc."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Stock Ticker / Identifier
              </label>
              <input
                type="text"
                value={formData.ticker}
                onChange={(e) => handleChange('ticker', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800"
                placeholder="APEX"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Industry Sector
              </label>
              <input
                type="text"
                value={formData.sector}
                onChange={(e) => handleChange('sector', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                placeholder="Enterprise Software"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reporting Fiscal Year
              </label>
              <input
                type="text"
                value={formData.fiscalYear}
                onChange={(e) => handleChange('fiscalYear', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                placeholder="FY 2024"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Operating & Income Statement Metrics (Current vs Prior Year) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                2. Operating Performance & Comparative Figures (USD)
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Enter amounts in raw figures (e.g. 142500000 for $142.5M)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Period */}
            <div className="space-y-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Current Year ({formData.fiscalYear})
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  Active Period
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Total Revenue
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    {formatCurrency(formData.revenue, true)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">$</span>
                  <input
                    type="number"
                    step="any"
                    value={formData.revenue || ''}
                    onChange={(e) => handleChange('revenue', e.target.value)}
                    required
                    className="w-full pl-7 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Operating Profit (EBIT)
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    {formatCurrency(formData.operatingProfit, true)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">$</span>
                  <input
                    type="number"
                    step="any"
                    value={formData.operatingProfit || ''}
                    onChange={(e) => handleChange('operatingProfit', e.target.value)}
                    required
                    className="w-full pl-7 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Net Profit (After Tax & Interest)
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    {formatCurrency(formData.netProfit, true)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">$</span>
                  <input
                    type="number"
                    step="any"
                    value={formData.netProfit || ''}
                    onChange={(e) => handleChange('netProfit', e.target.value)}
                    required
                    className="w-full pl-7 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Effective Corporate Tax Rate (%)
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    {formData.taxRate}%
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="60"
                    value={formData.taxRate || ''}
                    onChange={(e) => handleChange('taxRate', e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-mono">%</span>
                </div>
              </div>
            </div>

            {/* Previous Period for Comparison */}
            <div className="space-y-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Previous Year (Comparative Baseline)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                  Prior FY
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Prior Revenue
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    {formatCurrency(formData.prevRevenue, true)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">$</span>
                  <input
                    type="number"
                    step="any"
                    value={formData.prevRevenue || ''}
                    onChange={(e) => handleChange('prevRevenue', e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Prior Operating Profit (EBIT)
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    {formatCurrency(formData.prevOperatingProfit, true)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">$</span>
                  <input
                    type="number"
                    step="any"
                    value={formData.prevOperatingProfit || ''}
                    onChange={(e) => handleChange('prevOperatingProfit', e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Prior Net Profit
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    {formatCurrency(formData.prevNetProfit, true)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">$</span>
                  <input
                    type="number"
                    step="any"
                    value={formData.prevNetProfit || ''}
                    onChange={(e) => handleChange('prevNetProfit', e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Prior WACC Hurdle Rate (%)
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    {formData.prevWacc}%
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={formData.prevWacc || ''}
                    onChange={(e) => handleChange('prevWacc', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-mono">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Capital Structure & WACC Parameters (Current vs Prior) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Scale className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              3. Balance Sheet & Capital Hurdle Parameters (Current & Prior Year)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Debt */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Total Debt (Current)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatCurrency(formData.totalDebt, true)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">$</span>
                <input
                  type="number"
                  step="any"
                  value={formData.totalDebt || ''}
                  onChange={(e) => handleChange('totalDebt', e.target.value)}
                  required
                  className="w-full pl-7 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Short & long-term interest debt</p>
            </div>

            {/* Shareholders' Equity */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Shareholders' Equity (Current)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatCurrency(formData.shareholdersEquity, true)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">$</span>
                <input
                  type="number"
                  step="any"
                  value={formData.shareholdersEquity || ''}
                  onChange={(e) => handleChange('shareholdersEquity', e.target.value)}
                  required
                  className="w-full pl-7 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Book value of equity capital</p>
            </div>

            {/* Invested Capital */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Invested Capital (Current)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatCurrency(formData.investedCapital, true)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">$</span>
                <input
                  type="number"
                  step="any"
                  value={formData.investedCapital || ''}
                  onChange={(e) => handleChange('investedCapital', e.target.value)}
                  required
                  className="w-full pl-7 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Operating assets less non-interest liabilities</p>
            </div>

            {/* WACC */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  WACC Hurdle Rate (%)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {formData.wacc}%
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  min="1"
                  max="30"
                  value={formData.wacc || ''}
                  onChange={(e) => handleChange('wacc', e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 font-mono">%</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Blended cost of debt & equity</p>
            </div>
          </div>

          {/* Prior Year Balance Sheet Items */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 p-3 rounded-lg">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Prior Year Total Debt
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-mono">$</span>
                <input
                  type="number"
                  step="any"
                  value={formData.prevTotalDebt || ''}
                  onChange={(e) => handleChange('prevTotalDebt', e.target.value)}
                  className="w-full pl-6 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Prior Year Shareholders' Equity
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-mono">$</span>
                <input
                  type="number"
                  step="any"
                  value={formData.prevShareholdersEquity || ''}
                  onChange={(e) => handleChange('prevShareholdersEquity', e.target.value)}
                  className="w-full pl-6 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Prior Year Invested Capital
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-mono">$</span>
                <input
                  type="number"
                  step="any"
                  value={formData.prevInvestedCapital || ''}
                  onChange={(e) => handleChange('prevInvestedCapital', e.target.value)}
                  className="w-full pl-6 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Changes will immediately update the Dashboard, Value Analysis, and Scenario Simulator.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="submit"
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30"
            >
              <Save className="w-4 h-4" />
              <span>Calculate & Update Valuation Metrics</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
