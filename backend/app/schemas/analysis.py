from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime
from app.schemas.financial import ScoreBreakdownSchema, ValueAnalysisOutputSchema

class AnalysisHistoryResponse(BaseModel):
    id: int
    company_id: int
    financial_record_id: Optional[int]
    period: str
    nopat: float
    capital_charge: float
    eva: float
    is_value_creating: bool
    roic: float
    roi: float
    roe: float
    value_spread: float
    debt_ratio: float
    debt_to_equity: float
    operating_margin: float
    net_profit_margin: float
    revenue_growth: Optional[float]
    profit_growth: Optional[float]
    shareholder_value_score: int
    score_classification: str
    score_breakdown: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
