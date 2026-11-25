/**
 * Valora AI — Centralized Frontend API Service
 * Connects frontend modules to the FastAPI valuation backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export interface BackendCompany {
  id: number;
  name: string;
  ticker: string;
  sector: string;
  tagline?: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface ScoreAttribution {
  base_score: number;
  value_spread_points: number;
  roe_points: number;
  growth_points: number;
  solvency_points: number;
  final_score: number;
  classification: string;
  interpretation: string;
}

export interface ValueAnalysisOutput {
  company_name: string;
  fiscal_year: string;
  nopat: number;
  capital_charge: number;
  eva: number;
  is_value_creating: boolean;
  roic: number;
  roi: number;
  roe: number;
  value_spread: number;
  total_capital: number;
  debt_to_equity: number;
  debt_ratio: number;
  debt_ratio_change: number;
  operating_margin: number;
  net_profit_margin: number;
  revenue_growth: number | null;
  profit_growth: number | null;
  eva_growth: number | null;
  shareholder_value_score: number;
  score_classification: string;
  score_breakdown: ScoreAttribution;
  prev_nopat?: number | null;
  prev_capital_charge?: number | null;
  prev_eva?: number | null;
  prev_roic?: number | null;
  prev_roi?: number | null;
  prev_roe?: number | null;
  prev_debt_ratio?: number | null;
  prev_value_spread?: number | null;
  prev_score?: number | null;
}

export interface BackendAnalysisRecord {
  id: number;
  company_id: number;
  financial_record_id?: number | null;
  period: string;
  nopat: number;
  capital_charge: number;
  eva: number;
  is_value_creating: boolean;
  roic: number;
  roi: number;
  roe: number;
  value_spread: number;
  debt_ratio: number;
  debt_to_equity: number;
  operating_margin: number;
  net_profit_margin: number;
  revenue_growth: number | null;
  profit_growth: number | null;
  shareholder_value_score: number;
  score_classification: string;
  score_breakdown?: any;
  created_at: string;
}

export interface ScenarioAssumption {
  name: string;
  scenario_type: string;
  description?: string;
  rev_delta_pct: number;
  margin_delta_pct: number;
  debt_delta: number;
  invested_capital_delta: number;
  wacc_delta: number;
}

export interface ScenarioProjection {
  id?: number;
  scenario_name: string;
  scenario_type: string;
  description?: string;
  rev_delta_pct: number;
  margin_delta_pct: number;
  debt_delta: number;
  invested_capital_delta: number;
  wacc_delta: number;
  projected_revenue: number;
  projected_net_profit: number;
  projected_eva: number;
  projected_roe: number;
  projected_roic: number;
  projected_debt_ratio: number;
  projected_score: number;
  eva_impact: number;
  created_at?: string;
}

export interface ScenarioCompareResponse {
  baseline_eva: number;
  baseline_roe: number;
  baseline_roic: number;
  baseline_debt_ratio: number;
  baseline_score: number;
  scenarios: ScenarioProjection[];
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  database_connected: boolean;
}

async function request<T>(endpoint: string, options: RequestInit = {}, timeoutMs = 25000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = response.statusText;
      try {
        const errJson = await response.json();
        if (errJson.detail) {
          errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
        }
      } catch {}
      throw new Error(`API Error [${response.status}]: ${errorDetail}`);
    }

    return (await response.json()) as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`API request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  }
}

async function downloadFile(
  endpoint: string,
  options: RequestInit = {},
  fallbackFilename: string = 'VALORA_Report.pdf',
  timeoutMs = 60000
): Promise<{ blob: Blob; filename: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = response.statusText;
      try {
        const errJson = await response.json();
        if (errJson.detail) {
          errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
        }
      } catch {}
      throw new Error(`Report Download Error [${response.status}]: ${errorDetail}`);
    }

    let filename = fallbackFilename;
    const disposition = response.headers.get('Content-Disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const blob = await response.blob();
    return { blob, filename };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Report generation timed out after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  }
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}

export const apiService = {
  // Health
  checkHealth: (): Promise<HealthResponse> => {
    return request<HealthResponse>('/health', { method: 'GET' }, 3500);
  },

  // Companies
  getCompanies: (): Promise<BackendCompany[]> => {
    return request<BackendCompany[]>('/companies', { method: 'GET' });
  },

  getCompany: (id: number): Promise<BackendCompany> => {
    return request<BackendCompany>(`/companies/${id}`, { method: 'GET' });
  },

  createCompany: (data: { name: string; ticker: string; sector: string; tagline?: string; currency?: string }): Promise<BackendCompany> => {
    return request<BackendCompany>('/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteCompany: (id: number): Promise<void> => {
    return request<void>(`/companies/${id}`, { method: 'DELETE' });
  },

  // Valuation Analysis
  analyzeFinancials: (data: any): Promise<ValueAnalysisOutput> => {
    return request<ValueAnalysisOutput>('/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  calculateStateless: (data: any): Promise<ValueAnalysisOutput> => {
    return request<ValueAnalysisOutput>('/financials/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Financial Records
  getFinancialRecords: (companyId: number): Promise<any[]> => {
    return request<any[]>(`/financial-records/${companyId}`, { method: 'GET' });
  },

  createFinancialRecord: (data: any): Promise<any> => {
    return request<any>('/financial-records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Analysis History
  getAnalysisHistory: (companyId: number): Promise<BackendAnalysisRecord[]> => {
    return request<BackendAnalysisRecord[]>(`/analysis/history/${companyId}`, { method: 'GET' });
  },

  // Scenario Simulations
  compareScenarios: (
    payload: {
      company_id?: number;
      revenue: number;
      operating_profit: number;
      net_profit: number;
      tax_rate: number;
      total_debt: number;
      shareholders_equity: number;
      invested_capital: number;
      wacc: number;
      scenarios: ScenarioAssumption[];
    },
    saveHistory: boolean = true
  ): Promise<ScenarioCompareResponse> => {
    return request<ScenarioCompareResponse>(`/scenarios/compare?save_history=${saveHistory}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getScenarioHistory: (companyId: number): Promise<ScenarioProjection[]> => {
    return request<ScenarioProjection[]>(`/scenarios/history/${companyId}`, { method: 'GET' });
  },

  // Gemini AI Analyst Endpoints
  getAiStatus: (): Promise<AiStatusResponse> => {
    return request<AiStatusResponse>('/ai/status', { method: 'GET' });
  },

  saveAiKey: (apiKey: string): Promise<AiStatusResponse> => {
    return request<AiStatusResponse>(
      '/ai/settings',
      {
        method: 'POST',
        body: JSON.stringify({ api_key: apiKey }),
      },
      25000
    );
  },

  deleteAiKey: (): Promise<AiStatusResponse> => {
    return request<AiStatusResponse>('/ai/settings', { method: 'DELETE' });
  },

  analyzeCompanyWithAi: (companyId: number): Promise<AiFinancialAnalysisResponse> => {
    return request<AiFinancialAnalysisResponse>(
      `/ai/analyze/${companyId}`,
      {
        method: 'POST',
      },
      90000
    );
  },

  sendAiChat: (
    companyId: number,
    message: string,
    history: Array<{ role: string; content: string }> = []
  ): Promise<AiChatResponse> => {
    return request<AiChatResponse>(
      `/ai/chat/${companyId}`,
      {
        method: 'POST',
        body: JSON.stringify({ message, history }),
      },
      60000
    );
  },

  explainScenarioWithAi: (
    companyId: number,
    payload: {
      scenario_name: string;
      scenario_type: string;
      assumptions: Record<string, any>;
      baseline_metrics: Record<string, any>;
      projected_metrics: Record<string, any>;
    }
  ): Promise<AiScenarioExplainResponse> => {
    return request<AiScenarioExplainResponse>(
      `/ai/explain-scenario/${companyId}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      60000
    );
  },

  // Phase 4: Reports & Exports
  downloadPdfReport: (
    companyId: number,
    aiData?: any
  ): Promise<{ blob: Blob; filename: string }> => {
    return downloadFile(
      `/reports/${companyId}/pdf`,
      aiData ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ai_data: aiData }) } : { method: 'GET' },
      'VALORA_Executive_Report.pdf',
      90000
    );
  },

  downloadExcelReport: (companyId: number): Promise<{ blob: Blob; filename: string }> => {
    return downloadFile(
      `/reports/${companyId}/excel`,
      { method: 'GET' },
      'VALORA_Financial_Model.xlsx',
      60000
    );
  },

  getReportHistory: (companyId: number): Promise<BackendAnalysisRecord[]> => {
    return request<BackendAnalysisRecord[]>(`/reports/${companyId}/history`, { method: 'GET' });
  },
};

export interface AiStatusResponse {
  is_configured: boolean;
  masked_key: string | null;
  model: string;
  service_status: 'ready' | 'unconfigured' | 'error';
  message?: string;
}

export interface RecommendationItem {
  recommendation: string;
  reason: string;
  expected_impact: string;
  priority: string;
  suggested_timeframe: string;
}

export interface ActionPlanItem {
  step_number: number;
  action: string;
  focus_area: string;
  target_metric: string;
  timeline: string;
}

export interface AiFinancialAnalysisResponse {
  company_name: string;
  ticker: string;
  fiscal_year: string;
  executive_summary: string;
  shareholder_value_assessment: string;
  financial_strengths: string[];
  financial_weaknesses: string[];
  risk_assessment: string[];
  growth_opportunities: string[];
  capital_allocation_recommendations: RecommendationItem[];
  debt_management_recommendations: RecommendationItem[];
  profitability_recommendations: RecommendationItem[];
  prioritized_action_plan: ActionPlanItem[];
  short_term_outlook: string;
  long_term_outlook: string;
  model_used: string;
  generated_at: string;
}

export interface AiChatResponse {
  reply: string;
  company_id: number;
  company_name: string;
  ticker: string;
  metrics_referenced: string[];
  model_used: string;
}

export interface AiScenarioExplainResponse {
  headline: string;
  value_creation_verdict: 'Value Accretive' | 'Value Dilutive' | 'Neutral';
  what_changed: string;
  why_it_matters: string;
  eva_roic_impact_analysis: string;
  debt_solvency_implications: string;
  strategic_recommendations: string[];
  model_used: string;
}
