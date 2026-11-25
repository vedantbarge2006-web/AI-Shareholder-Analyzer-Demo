from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

class AiStatusResponse(BaseModel):
    is_configured: bool
    masked_key: Optional[str] = None
    model: str
    service_status: str # "ready", "unconfigured", "error"
    message: Optional[str] = None

class AiKeyUpdateRequest(BaseModel):
    api_key: str = Field(..., min_length=10, description="Gemini API Key")

class RecommendationItem(BaseModel):
    recommendation: str = Field(..., description="Actionable recommendation description")
    reason: str = Field(..., description="Financial reasoning rooted in metrics")
    expected_impact: str = Field(..., description="Anticipated impact on EVA, ROIC, or shareholder score")
    priority: str = Field(..., description="High, Medium, or Low")
    suggested_timeframe: str = Field(..., description="0-6 months, 6-12 months, or 1-3 years")

class ActionPlanItem(BaseModel):
    step_number: int = Field(..., description="Sequential action step")
    action: str = Field(..., description="Specific management action")
    focus_area: str = Field(..., description="Operations, Capital Structure, Working Capital, or Pricing")
    target_metric: str = Field(..., description="Target metric to measure success")
    timeline: str = Field(..., description="Implementation timeline")

class AiFinancialAnalysisResponse(BaseModel):
    company_name: str
    ticker: str
    fiscal_year: str
    executive_summary: str
    shareholder_value_assessment: str
    financial_strengths: List[str]
    financial_weaknesses: List[str]
    risk_assessment: List[str]
    growth_opportunities: List[str]
    capital_allocation_recommendations: List[RecommendationItem]
    debt_management_recommendations: List[RecommendationItem]
    profitability_recommendations: List[RecommendationItem]
    prioritized_action_plan: List[ActionPlanItem]
    short_term_outlook: str
    long_term_outlook: str
    model_used: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatMessage(BaseModel):
    role: str # "user", "assistant", or "model"
    content: str

class AiChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    history: Optional[List[ChatMessage]] = Field(default_factory=list)

class AiChatResponse(BaseModel):
    reply: str
    company_id: int
    company_name: str
    ticker: str
    metrics_referenced: List[str] = Field(default_factory=list)
    model_used: str

class AiScenarioExplainRequest(BaseModel):
    scenario_name: str
    scenario_type: str
    assumptions: Dict[str, Any]
    baseline_metrics: Dict[str, Any]
    projected_metrics: Dict[str, Any]

class AiScenarioExplainResponse(BaseModel):
    headline: str
    value_creation_verdict: str # "Value Accretive", "Value Dilutive", or "Neutral"
    what_changed: str
    why_it_matters: str
    eva_roic_impact_analysis: str
    debt_solvency_implications: str
    strategic_recommendations: List[str]
    model_used: str
