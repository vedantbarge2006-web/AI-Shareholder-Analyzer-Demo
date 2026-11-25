export interface FinancialData {
  companyName: string;
  ticker: string;
  sector: string;
  currency: string;
  fiscalYear: string;
  revenue: number;
  operatingProfit: number; // EBIT
  netProfit: number;
  taxRate: number; // percentage (e.g. 22%)
  totalDebt: number;
  shareholdersEquity: number;
  investedCapital: number;
  wacc: number; // percentage (e.g. 8.2%)
  
  // Previous Year Comparative Figures
  prevRevenue: number;
  prevOperatingProfit: number;
  prevNetProfit: number;
  prevTotalDebt: number;
  prevShareholdersEquity: number;
  prevInvestedCapital: number;
  prevWacc: number;
}

export type ScoreClassification = 
  | 'Strong Value Creator'
  | 'Moderate Value Creator'
  | 'Value Neutral'
  | 'Value Destructive';

export interface CalculatedMetrics {
  nopat: number;
  capitalCharge: number;
  eva: number;
  isValueCreating: boolean;
  roe: number;
  roic: number;
  roi: number; // Return on Investment: Net Profit / Invested Capital
  valueSpread: number; // ROIC - WACC
  debtToEquity: number;
  debtRatio: number; // Total Debt / (Total Debt + Equity) * 100
  debtRatioChange: number; // YoY change in debt ratio
  operatingMargin: number;
  netProfitMargin: number;
  revenueGrowth: number;
  profitGrowth: number;
  shareholderValueScore: number; // 0 - 100
  scoreClassification: ScoreClassification;
  
  // Prior Year Metrics
  prevNopat: number;
  prevCapitalCharge: number;
  prevEva: number;
  prevRoe: number;
  prevRoic: number;
  prevRoi: number;
  prevDebtRatio: number;
  prevValueSpread: number;
  prevShareholderValueScore: number;
  evaGrowth: number;
}

export interface HistoricalTrendPoint {
  period: string;
  revenue: number;
  operatingProfit: number;
  netProfit: number;
  eva: number;
  roic: number;
  wacc: number;
  valueScore: number;
}

export interface ExpenseBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  category: 'capital' | 'debt' | 'governance' | 'dividend' | 'operations';
  date: string;
  impact: string;
  type: 'positive' | 'negative' | 'neutral';
  amount?: string;
  description: string;
}

export interface ScenarioSimulation {
  id: string;
  name: string;
  description: string;
  type: 'reinvest' | 'debt_repayment' | 'dividend' | 'custom';
  revenueDeltaPct: number;
  marginDeltaPct: number;
  debtDelta: number;
  investedCapitalDelta: number;
  waccDelta: number;
  projectedRevenue: number;
  projectedNetProfit: number;
  projectedEva: number;
  projectedScore: number;
  projectedRoe: number;
  projectedDebtRatio: number;
  evaImpact: number;
}

export interface AiInsightItem {
  id: string;
  title: string;
  category: 'summary' | 'risk' | 'recommendation' | 'capital_allocation';
  severity: 'low' | 'medium' | 'high' | 'critical' | 'positive';
  summary: string;
  details: string;
  impactMetric: string;
  impactValue: string;
  actionText: string;
}

export interface AnalysisReportRecord {
  id: string;
  date: string;
  title: string;
  period: string;
  analyst: string;
  status: 'Published' | 'Draft' | 'Archived';
  score: number;
  evaFormatted: string;
}
