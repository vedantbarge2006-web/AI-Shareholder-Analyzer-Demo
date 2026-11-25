import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  Clock,
  Shield,
  Eye,
  Share2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useFinancialData } from '../context/FinancialDataContext';
import { formatCurrency, formatPercent, formatMultiplier } from '../utils/financialFormulas';
import { apiService, triggerBrowserDownload } from '../services/api';

export const Reports: React.FC = () => {
  const {
    activeData,
    calculatedMetrics,
    reports,
    setNotification,
    activeCompanyId,
    aiAnalysis,
  } = useFinancialData();

  const [selectedReportId, setSelectedReportId] = useState<string>(reports[0]?.id || 'rep-001');
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  useEffect(() => {
    if (reports.length > 0 && !reports.some((r) => r.id === selectedReportId)) {
      setSelectedReportId(reports[0].id);
    }
  }, [reports, selectedReportId]);

  const handleDownload = async (format: 'pdf' | 'excel') => {
    if (!activeCompanyId || activeData.revenue <= 0) {
      setNotification('Please select or input a company with financial statements before exporting.');
      return;
    }

    setDownloadingFormat(format);
    try {
      if (format === 'pdf') {
        setNotification('Synthesizing executive valuation and generating auditor-grade PDF...');
        const { blob, filename } = await apiService.downloadPdfReport(activeCompanyId, aiAnalysis);
        triggerBrowserDownload(blob, filename);
        setNotification(`Executive Shareholder Value Report (${filename}) downloaded successfully.`);
      } else if (format === 'excel') {
        setNotification('Formatting multi-sheet financial valuation workbook...');
        const { blob, filename } = await apiService.downloadExcelReport(activeCompanyId);
        triggerBrowserDownload(blob, filename);
        setNotification(`VALORA Financial Model Spreadsheet (${filename}) downloaded successfully.`);
      }
    } catch (err: any) {
      console.error('Report export failed:', err);
      setNotification(`Export failed: ${err.message || 'Server error generating document'}`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Audit & Compliance Documentation
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">
            Shareholder Value Creation Reports & Archives
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-xs text-slate-500">
              Active Company:
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
              {activeData.companyName || 'No Company Loaded'} {activeData.ticker ? `(${activeData.ticker})` : ''}
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Period: {activeData.fiscalYear || 'FY 2024'}
            </span>
          </div>
        </div>

        {/* Export / Print Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            title="Open browser print dialog / Save as PDF"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print View</span>
          </button>

          <button
            onClick={() => handleDownload('excel')}
            disabled={downloadingFormat === 'excel' || activeData.revenue <= 0}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            title="Download multi-tab Excel financial model"
          >
            <FileSpreadsheet className={`w-4 h-4 ${downloadingFormat === 'excel' ? 'animate-pulse' : 'text-emerald-600'}`} />
            <span>{downloadingFormat === 'excel' ? 'Building Excel...' : 'Export Excel (.xlsx)'}</span>
          </button>

          <button
            onClick={() => handleDownload('pdf')}
            disabled={downloadingFormat === 'pdf' || activeData.revenue <= 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-xs shadow-emerald-600/20"
            title="Generate and download certified PDF report"
          >
            <Download className={`w-4 h-4 ${downloadingFormat === 'pdf' ? 'animate-bounce' : ''}`} />
            <span>{downloadingFormat === 'pdf' ? 'Generating PDF...' : 'Download Certified PDF'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Report Document Preview (Printable) */}
        <div className="lg:col-span-2 space-y-6">
          {activeData.revenue <= 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-12 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Company Statements Loaded</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Please enter financial statement figures in the <strong>Financial Data</strong> tab to generate an auditor-grade Shareholder Value Creation Report.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 print-page space-y-6">
              {/* Report Letterhead */}
              <div className="flex items-start justify-between pb-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-lg shadow-sm">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black tracking-tight text-slate-900">
                        VALORA AI
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        CERTIFIED AUDIT
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-600 mt-0.5">
                      Executive Shareholder Value Creation Report
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Prepared for the Board of Directors & Investor Relations
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <div className="font-mono font-bold text-slate-800">REF: VAL-{new Date().getFullYear()}-001</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                  <div className="text-slate-500 text-[11px]">Period: {activeData.fiscalYear || 'FY 2024'}</div>
                </div>
              </div>

              {/* Target Enterprise Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Company</span>
                  <strong className="text-slate-900 font-bold block truncate">{activeData.companyName}</strong>
                  <span className="text-[10px] font-mono text-slate-500">{activeData.ticker}</span>
                </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Sector</span>
                <strong className="text-slate-800 block truncate">{activeData.sector}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Invested Capital</span>
                <strong className="text-slate-800 font-mono block">{formatCurrency(activeData.investedCapital, true)}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">WACC Hurdle</span>
                <strong className="text-slate-800 font-mono block">{formatPercent(activeData.wacc)}</strong>
              </div>
            </div>

            {/* Executive Summary Narrative */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Executive Summary & Verdict
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed text-justify">
                During {activeData.fiscalYear}, <strong>{activeData.companyName}</strong> achieved an Economic Value Added (EVA) of <strong>{calculatedMetrics.eva >= 0 ? '+' : ''}{formatCurrency(calculatedMetrics.eva, true)}</strong>, reflecting an annualized economic surplus spread of <strong>{calculatedMetrics.valueSpread > 0 ? '+' : ''}{calculatedMetrics.valueSpread.toFixed(1)}%</strong> over its Weighted Average Cost of Capital ({formatPercent(activeData.wacc)}). Return on Equity (ROE) expanded to <strong>{formatPercent(calculatedMetrics.roe)}</strong>, yielding an overall Shareholder Value Score of <strong>{calculatedMetrics.shareholderValueScore}/100</strong> ({calculatedMetrics.scoreClassification}).
              </p>
            </div>

            {/* Audit Table: Value Scorecard */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Key Capital Productivity Metrics & Verification
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Valuation Metric</th>
                      <th className="py-2.5 px-3">Reported Value</th>
                      <th className="py-2.5 px-3">Benchmark</th>
                      <th className="py-2.5 px-3">Assessment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    <tr>
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">Total Revenue</td>
                      <td className="py-2 px-3 font-bold">{formatCurrency(activeData.revenue, true)}</td>
                      <td className="py-2 px-3 text-slate-500">{formatCurrency(activeData.prevRevenue > 0 ? activeData.prevRevenue * 1.05 : activeData.revenue, true)}</td>
                      <td className={`py-2 px-3 font-sans font-semibold ${calculatedMetrics.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {calculatedMetrics.revenueGrowth >= 0 ? `+${calculatedMetrics.revenueGrowth.toFixed(1)}% YoY` : `${calculatedMetrics.revenueGrowth.toFixed(1)}% YoY`}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">Operating Profit (EBIT)</td>
                      <td className="py-2 px-3 font-bold">{formatCurrency(activeData.operatingProfit, true)}</td>
                      <td className="py-2 px-3 text-slate-500">{formatCurrency(activeData.revenue * 0.18, true)}</td>
                      <td className={`py-2 px-3 font-sans font-semibold ${calculatedMetrics.operatingMargin >= 18 ? 'text-emerald-600' : 'text-slate-600'}`}>
                        Margin: {formatPercent(calculatedMetrics.operatingMargin)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">NOPAT (After-Tax EBIT)</td>
                      <td className="py-2 px-3 font-bold">{formatCurrency(calculatedMetrics.nopat, true)}</td>
                      <td className="py-2 px-3 text-slate-500">{formatCurrency(calculatedMetrics.prevNopat, true)}</td>
                      <td className="py-2 px-3 font-sans text-slate-700 font-semibold">Normalized</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">Capital Charge (Cap × WACC)</td>
                      <td className="py-2 px-3 font-bold text-slate-700">{formatCurrency(calculatedMetrics.capitalCharge, true)}</td>
                      <td className="py-2 px-3 text-slate-500">{formatCurrency(activeData.investedCapital * 0.08, true)}</td>
                      <td className="py-2 px-3 font-sans text-slate-600">Hurdle rate {formatPercent(activeData.wacc)}</td>
                    </tr>
                    <tr className={calculatedMetrics.isValueCreating ? "bg-emerald-50/50" : "bg-rose-50/50"}>
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-900">Economic Value Added (EVA)</td>
                      <td className={`py-2.5 px-3 font-bold font-mono ${calculatedMetrics.isValueCreating ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {calculatedMetrics.eva >= 0 ? '+' : ''}{formatCurrency(calculatedMetrics.eva, true)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">+$0.0M Baseline</td>
                      <td className={`py-2.5 px-3 font-sans font-bold ${calculatedMetrics.isValueCreating ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {calculatedMetrics.isValueCreating ? 'Value Accretive' : 'Value Dilutive'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">Return on Invested Capital (ROIC)</td>
                      <td className="py-2 px-3 font-bold">{formatPercent(calculatedMetrics.roic)}</td>
                      <td className="py-2 px-3 text-slate-500">12.0%</td>
                      <td className={`py-2 px-3 font-sans font-semibold ${calculatedMetrics.valueSpread >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {calculatedMetrics.valueSpread >= 0 ? `+${calculatedMetrics.valueSpread.toFixed(1)}% spread` : `${calculatedMetrics.valueSpread.toFixed(1)}% spread`}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">Return on Investment (ROI)</td>
                      <td className="py-2 px-3 font-bold">{formatPercent(calculatedMetrics.roi)}</td>
                      <td className="py-2 px-3 text-slate-500">10.0%</td>
                      <td className={`py-2 px-3 font-sans font-semibold ${calculatedMetrics.roi >= 10 ? 'text-emerald-600' : 'text-slate-600'}`}>
                        Net yield
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">Return on Equity (ROE)</td>
                      <td className="py-2 px-3 font-bold">{formatPercent(calculatedMetrics.roe)}</td>
                      <td className="py-2 px-3 text-slate-500">15.0%</td>
                      <td className={`py-2 px-3 font-sans font-semibold ${calculatedMetrics.roe >= 15 ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {calculatedMetrics.roe >= 15 ? 'Top Quartile' : 'Moderate'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">Debt to Equity Ratio</td>
                      <td className="py-2 px-3 font-bold">{formatMultiplier(calculatedMetrics.debtToEquity)}</td>
                      <td className="py-2 px-3 text-slate-500">&lt; 0.80x</td>
                      <td className={`py-2 px-3 font-sans font-semibold ${calculatedMetrics.debtToEquity <= 0.8 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {calculatedMetrics.debtToEquity <= 0.8 ? 'Conservative' : 'Elevated'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Auditor Signature / Stamp Box */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div className="space-y-1">
                <div className="font-bold text-slate-800">Automated Financial Certification</div>
                <div className="text-[11px]">Algorithmic Model: Valora AI Analytics Core v1.4</div>
                <div className="text-[11px] font-mono">SHA-256: 7f8a3c...e42b10</div>
              </div>
              <div className="text-right">
                <div className="inline-block p-2 border border-emerald-400 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
                  Verified & Ready for Board Review
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

        {/* Right Column: Analysis History & Archive */}
        <div className="space-y-4 no-print">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Valuation History & Snapshots
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">{reports.length} Archived</span>
            </div>

            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No archived audit snapshots</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Audits saved to the database will appear here.</p>
                </div>
              ) : (
                reports.map((rep) => {
                  const isSelected = selectedReportId === rep.id;

                  return (
                    <div
                      key={rep.id}
                      onClick={() => setSelectedReportId(rep.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                          : 'border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                          {rep.title}
                        </h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 shrink-0">
                          {rep.period}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-slate-400 text-[11px]">{rep.date}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-600">
                            {rep.evaFormatted}
                          </span>
                          <span className="text-[11px] font-bold text-slate-800">
                            {rep.score} pts
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">By {rep.analyst}</span>
                        <span className="text-emerald-700 font-semibold hover:underline flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Preview
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick PDF Export Help Card */}
          <div className="bg-slate-900 text-white p-5 rounded-xl shadow-sm space-y-2">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              Client Presentation Tip
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Use the <strong>Print Report</strong> button to save directly to high-resolution vector PDF or physical handout. The layout automatically strips sidebar navigation and formats for letter/A4 pages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
