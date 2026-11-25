import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import {
  FinancialData,
  CalculatedMetrics,
  HistoricalTrendPoint,
  ActivityItem,
  AiInsightItem,
  ScenarioSimulation,
  AnalysisReportRecord,
} from '../types/financial';
import {
  BLANK_FINANCIAL_DATA,
  COMPANY_PRESETS,
  CompanyPreset,
} from '../data/mockFinancialData';
import { calculateFinancialMetrics } from '../utils/financialFormulas';
import {
  apiService,
  BackendCompany,
  ScoreAttribution,
  ScenarioAssumption,
  ScenarioCompareResponse,
  AiStatusResponse,
  AiFinancialAnalysisResponse,
  ValueAnalysisOutput,
} from '../services/api';

interface FinancialContextType {
  activeData: FinancialData;
  calculatedMetrics: CalculatedMetrics;
  selectedPresetId: string;
  presets: Record<string, CompanyPreset>;
  historicalTrends: HistoricalTrendPoint[];
  activities: ActivityItem[];
  aiInsights: AiInsightItem[];
  scenarios: ScenarioSimulation[];
  reports: AnalysisReportRecord[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  loadPreset: (presetId: string) => void;
  selectCompany: (companyId: number) => Promise<void>;
  resetToBlank: () => void;
  deleteCompany: (companyId: number) => Promise<void>;
  updateFinancialData: (partial: Partial<FinancialData>) => Promise<void>;
  runScenarioSimulation: (
    revDeltaPct: number,
    marginDeltaPct: number,
    debtDelta: number,
    investedCapitalDelta: number,
    waccDelta: number
  ) => ScenarioSimulation;
  runBackendScenarioComparison: (scenariosList: ScenarioAssumption[]) => Promise<ScenarioCompareResponse | null>;
  addActivity: (activity: Omit<ActivityItem, 'id'>) => void;
  notification: string | null;
  setNotification: (msg: string | null) => void;
  
  // Backend States
  isBackendConnected: boolean;
  isBackendLoading: boolean;
  backendCompanies: BackendCompany[];
  scoreAttribution: ScoreAttribution | null;
  activeCompanyId: number | null;
  refreshCompanies: () => Promise<void>;

  // Phase 3 Gemini AI States
  aiStatus: AiStatusResponse | null;
  isAiConfigured: boolean;
  aiAnalysis: AiFinancialAnalysisResponse | null;
  isAiAnalyzing: boolean;
  aiAnalysisError: string | null;
  refreshAiStatus: () => Promise<void>;
  fetchAiAnalysis: (forceRefresh?: boolean) => Promise<void>;
  saveAiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  removeAiKey: () => Promise<void>;
}

const FinancialDataContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeData, setActiveData] = useState<FinancialData>(BLANK_FINANCIAL_DATA);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // Backend state
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [isBackendLoading, setIsBackendLoading] = useState<boolean>(false);
  const [backendCompanies, setBackendCompanies] = useState<BackendCompany[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);
  const [backendCalculatedMetrics, setBackendCalculatedMetrics] = useState<CalculatedMetrics | null>(null);
  const [scoreAttribution, setScoreAttribution] = useState<ScoreAttribution | null>(null);
  const [backendReports, setBackendReports] = useState<AnalysisReportRecord[]>([]);

  // Phase 3 Gemini AI state
  const [aiStatus, setAiStatus] = useState<AiStatusResponse | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AiFinancialAnalysisResponse | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);

  const isAiConfigured = Boolean(aiStatus?.is_configured);

  const refreshAiStatus = useCallback(async () => {
    try {
      const status = await apiService.getAiStatus();
      setAiStatus(status);
    } catch (e) {
      setAiStatus(null);
    }
  }, []);

  const fetchAiAnalysis = useCallback(async (forceRefresh = false) => {
    if (!activeCompanyId) return;
    if (!forceRefresh && aiAnalysis && aiAnalysis.ticker === activeData.ticker) return;

    setIsAiAnalyzing(true);
    setAiAnalysisError(null);
    try {
      const analysis = await apiService.analyzeCompanyWithAi(activeCompanyId);
      setAiAnalysis(analysis);
      addActivity({
        title: `AI Valuation Audit Completed: ${activeData.companyName || 'Enterprise'}`,
        date: 'Just now',
        impact: 'Accretive',
        category: 'operations',
        type: 'positive',
        description: `Executive diagnosis generated via Gemini. Shareholder Assessment: ${analysis.executive_summary.slice(0, 100)}...`,
      });
    } catch (err: any) {
      const msg = err.message || 'AI Financial Analysis failed.';
      setAiAnalysisError(msg);
      console.warn('AI Analysis failed:', msg);
    } finally {
      setIsAiAnalyzing(false);
    }
  }, [activeCompanyId, activeData.companyName, activeData.ticker, aiAnalysis]);

  const saveAiKey = async (apiKey: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiService.saveAiKey(apiKey);
      setAiStatus(res);
      setNotification('Gemini API key validated and securely configured on the backend!');
      if (activeCompanyId) {
        fetchAiAnalysis(true);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to validate or save Gemini API key.' };
    }
  };

  const removeAiKey = async (): Promise<void> => {
    try {
      const res = await apiService.deleteAiKey();
      setAiStatus(res);
      setAiAnalysis(null);
      setNotification('Gemini API key removed from backend configuration.');
    } catch (err: any) {
      console.warn('Error deleting AI key:', err);
    }
  };

  // Local calculation engine for immediate client feedback
  const localCalculatedMetrics = useMemo(() => {
    return calculateFinancialMetrics(activeData);
  }, [activeData]);

  // Active calculated metrics: preference to backend deterministic engine, fallback to local engine
  const calculatedMetrics = useMemo(() => {
    return backendCalculatedMetrics || localCalculatedMetrics;
  }, [backendCalculatedMetrics, localCalculatedMetrics]);

  // Dynamic historical trend series based on real company figures (Prior Year vs Current Year)
  const historicalTrends = useMemo<HistoricalTrendPoint[]>(() => {
    if (activeData.revenue <= 0 && activeData.prevRevenue <= 0) {
      return [];
    }

    const trends: HistoricalTrendPoint[] = [];

    // Prior Year (Actual input data)
    if (activeData.prevRevenue > 0) {
      trends.push({
        period: 'Prior Year',
        revenue: +(activeData.prevRevenue / 1e6).toFixed(1),
        operatingProfit: +(activeData.prevOperatingProfit / 1e6).toFixed(1),
        netProfit: +(activeData.prevNetProfit / 1e6).toFixed(1),
        eva: +(calculatedMetrics.prevEva / 1e6).toFixed(1),
        roic: +calculatedMetrics.prevRoic.toFixed(1),
        wacc: +activeData.prevWacc.toFixed(1),
        valueScore: calculatedMetrics.prevShareholderValueScore,
      });
    }

    // Current Year (Actual input data)
    if (activeData.revenue > 0) {
      trends.push({
        period: activeData.fiscalYear || 'FY 2024',
        revenue: +(activeData.revenue / 1e6).toFixed(1),
        operatingProfit: +(activeData.operatingProfit / 1e6).toFixed(1),
        netProfit: +(activeData.netProfit / 1e6).toFixed(1),
        eva: +(calculatedMetrics.eva / 1e6).toFixed(1),
        roic: +calculatedMetrics.roic.toFixed(1),
        wacc: +activeData.wacc.toFixed(1),
        valueScore: calculatedMetrics.shareholderValueScore,
      });
    }

    return trends;
  }, [activeData, calculatedMetrics]);

  // Fetch analysis history from SQLite for the active company
  const loadCompanyHistoryFromBackend = useCallback(async (companyId: number) => {
    try {
      const records = await apiService.getAnalysisHistory(companyId);
      if (records && records.length > 0) {
        const mappedReports: AnalysisReportRecord[] = records.map((rec) => ({
          id: `rep-${rec.id}`,
          date: new Date(rec.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          title: `${rec.period} Valuation & Shareholder Value Audit`,
          period: rec.period,
          analyst: 'Valora AI Engine (SQLite)',
          status: 'Published',
          score: rec.shareholder_value_score,
          evaFormatted: `${rec.eva >= 0 ? '+' : ''}${(rec.eva / 1e6).toFixed(1)}M`,
        }));
        setBackendReports(mappedReports);
      } else {
        setBackendReports([]);
      }
    } catch (err) {
      console.warn('Could not load analysis history from backend:', err);
      setBackendReports([]);
    }
  }, []);

  const refreshCompanies = useCallback(async () => {
    try {
      const companies = await apiService.getCompanies();
      setBackendCompanies(companies);
      return;
    } catch (err) {
      console.warn('Could not refresh companies:', err);
    }
  }, []);

  const selectCompany = useCallback(async (companyId: number) => {
    setIsBackendLoading(true);
    try {
      setActiveCompanyId(companyId);
      const company = backendCompanies.find((c) => c.id === companyId);
      const records = await apiService.getFinancialRecords(companyId);

      if (records && records.length > 0) {
        const latest = records[records.length - 1];
        const loaded: FinancialData = {
          companyName: company?.name || latest.company_name || '',
          ticker: company?.ticker || latest.ticker || '',
          sector: company?.sector || 'General Business',
          currency: company?.currency || 'USD',
          fiscalYear: latest.fiscal_year || 'FY 2024',
          revenue: latest.revenue,
          operatingProfit: latest.operating_profit,
          netProfit: latest.net_profit,
          taxRate: latest.tax_rate,
          totalDebt: latest.total_debt,
          shareholdersEquity: latest.shareholders_equity,
          investedCapital: latest.invested_capital,
          wacc: latest.wacc,
          prevRevenue: latest.prev_revenue ?? 0,
          prevOperatingProfit: latest.prev_operating_profit ?? 0,
          prevNetProfit: latest.prev_net_profit ?? 0,
          prevTotalDebt: latest.prev_total_debt ?? 0,
          prevInvestedCapital: latest.prev_invested_capital ?? 0,
          prevShareholdersEquity: latest.prev_shareholders_equity ?? 0,
          prevWacc: latest.prev_wacc ?? 8.0,
        };
        setActiveData(loaded);

        // Run calculation
        const result = await apiService.calculateStateless(loaded);
        if (result) {
          setScoreAttribution(result.score_breakdown);
          setBackendCalculatedMetrics(mapResultToMetrics(result));
        }
      } else if (company) {
        setActiveData({
          ...BLANK_FINANCIAL_DATA,
          companyName: company.name,
          ticker: company.ticker,
          sector: company.sector,
          currency: company.currency || 'USD',
        });
        setBackendCalculatedMetrics(null);
      }
      loadCompanyHistoryFromBackend(companyId);
    } catch (err) {
      console.warn('Error selecting company:', err);
    } finally {
      setIsBackendLoading(false);
    }
  }, [backendCompanies, loadCompanyHistoryFromBackend]);

  const resetToBlank = useCallback(() => {
    setActiveCompanyId(null);
    setActiveData(BLANK_FINANCIAL_DATA);
    setBackendCalculatedMetrics(null);
    setScoreAttribution(null);
    setBackendReports([]);
    setAiAnalysis(null);
    setNotification('Started clean financial statement form. Ready for input.');
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const deleteCompany = useCallback(async (companyId: number) => {
    try {
      setIsBackendLoading(true);
      await apiService.deleteCompany(companyId);
      const remaining = backendCompanies.filter((c) => c.id !== companyId);
      setBackendCompanies(remaining);

      if (activeCompanyId === companyId) {
        if (remaining.length > 0) {
          selectCompany(remaining[0].id);
        } else {
          resetToBlank();
        }
      }
      setNotification('Company profile removed successfully.');
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      setNotification(`Failed to delete company: ${err.message}`);
    } finally {
      setIsBackendLoading(false);
    }
  }, [activeCompanyId, backendCompanies, resetToBlank, selectCompany]);

  // Sync initial backend state on component mount
  useEffect(() => {
    let mounted = true;

    async function initBackend() {
      setIsBackendLoading(true);
      try {
        const health = await apiService.checkHealth();
        if (mounted && health && health.status === 'healthy') {
          setIsBackendConnected(true);
          refreshAiStatus();

          const companies = await apiService.getCompanies();
          if (mounted && companies.length > 0) {
            setBackendCompanies(companies);
            setActiveCompanyId(companies[0].id);
            // Load first company's real data
            const records = await apiService.getFinancialRecords(companies[0].id);
            if (records && records.length > 0) {
              const latest = records[records.length - 1];
              setActiveData({
                companyName: companies[0].name,
                ticker: companies[0].ticker,
                sector: companies[0].sector,
                currency: companies[0].currency || 'USD',
                fiscalYear: latest.fiscal_year || 'FY 2024',
                revenue: latest.revenue,
                operatingProfit: latest.operating_profit,
                netProfit: latest.net_profit,
                taxRate: latest.tax_rate,
                totalDebt: latest.total_debt,
                shareholdersEquity: latest.shareholders_equity,
                investedCapital: latest.invested_capital,
                wacc: latest.wacc,
                prevRevenue: latest.prev_revenue ?? 0,
                prevOperatingProfit: latest.prev_operating_profit ?? 0,
                prevNetProfit: latest.prev_net_profit ?? 0,
                prevTotalDebt: latest.prev_total_debt ?? 0,
                prevInvestedCapital: latest.prev_invested_capital ?? 0,
                prevShareholdersEquity: latest.prev_shareholders_equity ?? 0,
                prevWacc: latest.prev_wacc ?? 8.0,
              });
              loadCompanyHistoryFromBackend(companies[0].id);
            }
          } else {
            // Clean empty state
            setActiveData(BLANK_FINANCIAL_DATA);
            setBackendCompanies([]);
            setActiveCompanyId(null);
          }
        }
      } catch (err) {
        if (mounted) {
          setIsBackendConnected(false);
        }
      } finally {
        if (mounted) setIsBackendLoading(false);
      }
    }

    initBackend();
    return () => {
      mounted = false;
    };
  }, [loadCompanyHistoryFromBackend, refreshAiStatus]);

  // Only real reports from SQLite
  const reports = useMemo(() => {
    return backendReports;
  }, [backendReports]);

  // Compatibility helper for any legacy caller
  const loadPreset = (presetId: string) => {
    const numId = Number(presetId);
    if (!isNaN(numId) && numId > 0) {
      selectCompany(numId);
    }
  };

  const updateFinancialData = async (partial: Partial<FinancialData>) => {
    const updated: FinancialData = {
      ...activeData,
      ...partial,
    };
    setActiveData(updated);

    // Call backend engine to calculate and persist to SQLite
    if (isBackendConnected) {
      try {
        setIsBackendLoading(true);
        const payload = {
          company_name: updated.companyName,
          ticker: updated.ticker,
          sector: updated.sector,
          fiscal_year: updated.fiscalYear,
          revenue: updated.revenue,
          operating_profit: updated.operatingProfit,
          net_profit: updated.netProfit,
          tax_rate: updated.taxRate,
          total_debt: updated.totalDebt,
          shareholders_equity: updated.shareholdersEquity,
          invested_capital: updated.investedCapital,
          wacc: updated.wacc,
          prev_revenue: updated.prevRevenue,
          prev_operating_profit: updated.prevOperatingProfit,
          prev_net_profit: updated.prevNetProfit,
          prev_total_debt: updated.prevTotalDebt,
          prev_invested_capital: updated.prevInvestedCapital,
          prev_shareholders_equity: updated.prevShareholdersEquity,
          prev_wacc: updated.prevWacc,
        };

        const result = await apiService.analyzeFinancials(payload);
        if (result) {
          setScoreAttribution(result.score_breakdown);
          const mapped = mapResultToMetrics(result);
          setBackendCalculatedMetrics(mapped);

          // Refresh companies from database
          const companies = await apiService.getCompanies();
          setBackendCompanies(companies);
          const matched = companies.find((c) => c.name.toLowerCase() === updated.companyName.toLowerCase());
          if (matched) {
            setActiveCompanyId(matched.id);
            loadCompanyHistoryFromBackend(matched.id);
          }

          addActivity({
            title: `Financial Statement Audited: ${updated.companyName}`,
            date: 'Just now',
            impact: result.is_value_creating ? 'Value Accretive (+EVA)' : 'Value Dilutive (-EVA)',
            category: 'operations',
            type: result.is_value_creating ? 'positive' : 'negative',
            description: `EVA: ${result.eva >= 0 ? '+' : ''}${(result.eva / 1e6).toFixed(1)}M, ROIC: ${result.roic.toFixed(1)}%, Value Score: ${result.shareholder_value_score}/100`,
          });

          setNotification('Calculated by Python Financial Engine & persisted to SQLite!');
          setTimeout(() => setNotification(null), 3500);
          return;
        }
      } catch (err: any) {
        console.warn('Backend calculation error, using local valuation fallback:', err);
      } finally {
        setIsBackendLoading(false);
      }
    }

    setNotification('Financial figures updated & recalculated successfully across all modules!');
    setTimeout(() => setNotification(null), 3500);
  };

  const addActivity = (activity: Omit<ActivityItem, 'id'>) => {
    const newItem: ActivityItem = {
      ...activity,
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setActivities((prev) => [newItem, ...prev.slice(0, 19)]);
  };

  const runScenarioSimulation = (
    revDeltaPct: number,
    marginDeltaPct: number,
    debtDelta: number,
    investedCapitalDelta: number,
    waccDelta: number
  ): ScenarioSimulation => {
    const projRev = activeData.revenue * (1 + revDeltaPct / 100);
    const currOpMargin = activeData.revenue > 0 ? (activeData.operatingProfit / activeData.revenue) * 100 : 0;
    const projOpMargin = Math.max(1, currOpMargin + marginDeltaPct);
    const projEbit = projRev * (projOpMargin / 100);
    const projNopat = projEbit * (1 - activeData.taxRate / 100);

    const projInvCap = Math.max(1000000, activeData.investedCapital + investedCapitalDelta);
    const projWacc = Math.max(1, activeData.wacc + waccDelta);
    const projCapCharge = projInvCap * (projWacc / 100);
    const projEva = projNopat - projCapCharge;

    const projDebt = Math.max(0, activeData.totalDebt + debtDelta);
    const projEquity = Math.max(1000000, activeData.shareholdersEquity + (investedCapitalDelta - debtDelta));
    const projTotalCap = projDebt + projEquity;
    const projDebtRatio = projTotalCap > 0 ? (projDebt / projTotalCap) * 100 : 0;

    const projNetProfit = Math.max(0, projEbit * 0.75 - projDebt * 0.05);
    const projRoe = projEquity > 0 ? (projNetProfit / projEquity) * 100 : 0;
    const projRoic = projInvCap > 0 ? (projNopat / projInvCap) * 100 : 0;

    const evaImpact = projEva - calculatedMetrics.eva;

    return {
      id: `sim-${Date.now()}`,
      name: 'Custom Decision Stress-Test',
      type: 'custom',
      description: 'Parametric simulation of corporate capital allocation decision.',
      revenueDeltaPct: revDeltaPct,
      marginDeltaPct: marginDeltaPct,
      debtDelta,
      investedCapitalDelta,
      waccDelta,
      projectedRevenue: projRev,
      projectedNetProfit: projNetProfit,
      projectedEva: projEva,
      projectedScore: Math.round(
        Math.max(
          0,
          Math.min(
            100,
            calculatedMetrics.shareholderValueScore + (evaImpact > 0 ? Math.min(15, evaImpact / 1e6) : Math.max(-25, evaImpact / 1e6))
          )
        )
      ),
      projectedRoe: projRoe,
      projectedDebtRatio: projDebtRatio,
      evaImpact,
    };
  };

  const runBackendScenarioComparison = async (
    scenariosList: ScenarioAssumption[]
  ): Promise<ScenarioCompareResponse | null> => {
    if (!isBackendConnected) return null;
    try {
      const payload = {
        company_id: activeCompanyId || undefined,
        revenue: activeData.revenue,
        operating_profit: activeData.operatingProfit,
        net_profit: activeData.netProfit,
        tax_rate: activeData.taxRate,
        total_debt: activeData.totalDebt,
        shareholders_equity: activeData.shareholdersEquity,
        invested_capital: activeData.investedCapital,
        wacc: activeData.wacc,
        scenarios: scenariosList,
      };

      const result = await apiService.compareScenarios(payload);
      addActivity({
        title: `Decision Scenarios Evaluated (${scenariosList.length} paths)`,
        date: 'Just now',
        impact: 'Accretive',
        category: 'capital',
        type: 'positive',
        description: `Stress-tested capital allocation scenarios against baseline EVA (${(calculatedMetrics.eva / 1e6).toFixed(1)}M).`,
      });
      return result;
    } catch (err) {
      console.warn('Backend scenario comparison failed:', err);
      return null;
    }
  };

  // Derive preset scenarios dynamically from current company data if revenue exists
  const scenarios = useMemo<ScenarioSimulation[]>(() => {
    if (activeData.revenue <= 0) return [];

    // Scenario 1: Growth Reinvestment (+12% Rev, +$15M Cap, +$5M Debt)
    const sc1 = runScenarioSimulation(12.0, -1.0, 5000000, 15000000, 0.1);
    sc1.id = 'sc-1';
    sc1.name = 'Growth Reinvestment Program';
    sc1.description = `Deploy Capex into expansion. Assumes 12% revenue growth with slight short-term margin adjustment.`;
    sc1.type = 'reinvest';

    // Scenario 2: Aggressive Deleveraging (-Debt, -0.4% WACC)
    const debtPaydown = Math.min(activeData.totalDebt * 0.4, 20000000);
    const sc2 = runScenarioSimulation(2.0, 0.8, -debtPaydown, -5000000, -0.4);
    sc2.id = 'sc-2';
    sc2.name = 'Aggressive Debt Deleveraging';
    sc2.description = `Pay down debt from cash reserves. Lowers interest obligations and reduces hurdle WACC.`;
    sc2.type = 'debt_repayment';

    // Scenario 3: Dividend & Buyback (-Equity Capital, +0.3% WACC)
    const sc3 = runScenarioSimulation(0.0, 0.0, 4000000, -14000000, 0.3);
    sc3.id = 'sc-3';
    sc3.name = 'Special Dividend & Share Buyback';
    sc3.description = `Return capital to equity holders via tender offer. Shrinks equity base and enhances ROE.`;
    sc3.type = 'dividend';

    return [sc1, sc2, sc3];
  }, [activeData, calculatedMetrics.eva]);

  return (
    <FinancialDataContext.Provider
      value={{
        activeData,
        calculatedMetrics,
        selectedPresetId: activeCompanyId ? String(activeCompanyId) : '',
        presets: COMPANY_PRESETS,
        historicalTrends,
        activities,
        aiInsights: [],
        scenarios,
        reports,
        activeTab,
        setActiveTab,
        loadPreset,
        selectCompany,
        resetToBlank,
        deleteCompany,
        updateFinancialData,
        runScenarioSimulation,
        runBackendScenarioComparison,
        addActivity,
        notification,
        setNotification,
        isBackendConnected,
        isBackendLoading,
        backendCompanies,
        scoreAttribution,
        activeCompanyId,
        refreshCompanies,
        aiStatus,
        isAiConfigured,
        aiAnalysis,
        isAiAnalyzing,
        aiAnalysisError,
        refreshAiStatus,
        fetchAiAnalysis,
        saveAiKey,
        removeAiKey,
      }}
    >
      {children}
    </FinancialDataContext.Provider>
  );
};

function mapResultToMetrics(result: ValueAnalysisOutput): CalculatedMetrics {
  return {
    nopat: result.nopat,
    capitalCharge: result.capital_charge,
    eva: result.eva,
    isValueCreating: result.is_value_creating,
    roe: result.roe,
    roic: result.roic,
    roi: result.roi,
    valueSpread: result.value_spread,
    debtToEquity: result.debt_to_equity,
    debtRatio: result.debt_ratio,
    debtRatioChange: result.debt_ratio_change,
    operatingMargin: result.operating_margin,
    netProfitMargin: result.net_profit_margin,
    revenueGrowth: result.revenue_growth ?? 0,
    profitGrowth: result.profit_growth ?? 0,
    shareholderValueScore: result.shareholder_value_score,
    scoreClassification: result.score_classification as any,
    prevNopat: result.prev_nopat ?? 0,
    prevCapitalCharge: result.prev_capital_charge ?? 0,
    prevEva: result.prev_eva ?? 0,
    prevRoe: result.prev_roe ?? 0,
    prevRoic: result.prev_roic ?? 0,
    prevRoi: result.prev_roi ?? 0,
    prevDebtRatio: result.prev_debt_ratio ?? 0,
    prevValueSpread: result.prev_value_spread ?? 0,
    prevShareholderValueScore: result.prev_score ?? 50,
    evaGrowth: result.eva_growth ?? 0,
  };
}

export const useFinancialData = () => {
  const context = useContext(FinancialDataContext);
  if (!context) {
    throw new Error('useFinancialData must be used within a FinancialDataProvider');
  }
  return context;
};
