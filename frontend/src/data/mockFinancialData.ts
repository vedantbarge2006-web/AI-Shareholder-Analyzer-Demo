import {
  FinancialData,
  HistoricalTrendPoint,
  ExpenseBreakdownItem,
  ActivityItem,
  AiInsightItem,
  AnalysisReportRecord,
  ScenarioSimulation,
} from '../types/financial';

export interface CompanyPreset {
  id: string;
  name: string;
  ticker: string;
  tagline: string;
  status: 'creator' | 'moderate' | 'destroyer';
  data: FinancialData;
  historicalTrends: HistoricalTrendPoint[];
}

/**
 * Clean default financial statement baseline.
 * Used when no company is selected or when creating a new enterprise profile.
 */
export const BLANK_FINANCIAL_DATA: FinancialData = {
  companyName: '',
  ticker: '',
  sector: '',
  currency: 'USD',
  fiscalYear: 'FY 2024',
  revenue: 0,
  operatingProfit: 0,
  netProfit: 0,
  taxRate: 25.0,
  totalDebt: 0,
  shareholdersEquity: 0,
  investedCapital: 0,
  wacc: 8.0,
  prevRevenue: 0,
  prevOperatingProfit: 0,
  prevNetProfit: 0,
  prevTotalDebt: 0,
  prevInvestedCapital: 0,
  prevShareholdersEquity: 0,
  prevWacc: 8.0,
};

// All fake mock data collections removed for genuine production operation
export const COMPANY_PRESETS: Record<string, CompanyPreset> = {};
export const MOCK_HISTORICAL_TRENDS: HistoricalTrendPoint[] = [];
export const MOCK_ACTIVITIES: ActivityItem[] = [];
export const MOCK_AI_INSIGHTS: AiInsightItem[] = [];
export const MOCK_REPORTS: AnalysisReportRecord[] = [];
