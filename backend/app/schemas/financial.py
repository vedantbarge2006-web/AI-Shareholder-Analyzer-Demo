from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime

class FinancialInputSchema(BaseModel):
    company_name: str = Field(..., json_schema_extra={"example": "Apex Global Technologies Inc."})
    ticker: Optional[str] = Field("APEX", json_schema_extra={"example": "APEX"})
    sector: Optional[str] = Field("Enterprise Software", json_schema_extra={"example": "Enterprise Software"})
    fiscal_year: Optional[str] = Field("FY 2024", json_schema_extra={"example": "FY 2024"})
    
    revenue: float = Field(..., gt=0, description="Total Gross Sales / Revenue", json_schema_extra={"example": 142500000.0})
    operating_profit: float = Field(..., description="Operating Profit (EBIT)", json_schema_extra={"example": 33480000.0})
    net_profit: float = Field(..., description="Net Profit (After Tax & Interest)", json_schema_extra={"example": 25110000.0})
    tax_rate: float = Field(..., ge=0, le=100, description="Effective Tax Rate in %", json_schema_extra={"example": 22.0})
    total_debt: float = Field(..., ge=0, description="Total Debt", json_schema_extra={"example": 38000000.0})
    shareholders_equity: float = Field(..., gt=0, description="Shareholders' Equity", json_schema_extra={"example": 122000000.0})
    invested_capital: float = Field(..., gt=0, description="Invested Capital", json_schema_extra={"example": 136000000.0})
    wacc: float = Field(..., ge=0, le=100, description="WACC Hurdle Rate in %", json_schema_extra={"example": 8.4})
    
    # Previous Year Comparison Figures
    prev_revenue: Optional[float] = Field(None, json_schema_extra={"example": 122800000.0})
    prev_operating_profit: Optional[float] = Field(None, json_schema_extra={"example": 27500000.0})
    prev_net_profit: Optional[float] = Field(None, json_schema_extra={"example": 20600000.0})
    prev_total_debt: Optional[float] = Field(None, json_schema_extra={"example": 42000000.0})
    prev_invested_capital: Optional[float] = Field(None, json_schema_extra={"example": 121000000.0})
    prev_shareholders_equity: Optional[float] = Field(None, json_schema_extra={"example": 104000000.0})
    prev_wacc: Optional[float] = Field(None, json_schema_extra={"example": 8.6})

class FinancialRecordCreate(BaseModel):
    company_id: int
    fiscal_year: str = Field(..., json_schema_extra={"example": "FY 2024"})
    revenue: float = Field(..., gt=0)
    operating_profit: float
    net_profit: float
    tax_rate: float = Field(..., ge=0, le=100)
    total_debt: float = Field(..., ge=0)
    shareholders_equity: float = Field(..., gt=0)
    invested_capital: float = Field(..., gt=0)
    wacc: float = Field(..., ge=0, le=100)
    
    prev_revenue: Optional[float] = None
    prev_operating_profit: Optional[float] = None
    prev_net_profit: Optional[float] = None
    prev_total_debt: Optional[float] = None
    prev_invested_capital: Optional[float] = None
    prev_shareholders_equity: Optional[float] = None
    prev_wacc: Optional[float] = None

class FinancialRecordResponse(BaseModel):
    id: int
    company_id: int
    fiscal_year: str
    revenue: float
    operating_profit: float
    net_profit: float
    tax_rate: float
    total_debt: float
    shareholders_equity: float
    invested_capital: float
    wacc: float
    prev_revenue: Optional[float]
    prev_operating_profit: Optional[float]
    prev_net_profit: Optional[float]
    prev_total_debt: Optional[float]
    prev_invested_capital: Optional[float]
    prev_shareholders_equity: Optional[float]
    prev_wacc: Optional[float]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ScoreBreakdownSchema(BaseModel):
    base_score: float
    value_spread_points: float
    roe_points: float
    growth_points: float
    solvency_points: float
    final_score: int
    classification: str
    interpretation: str

class ValueAnalysisOutputSchema(BaseModel):
    company_name: str
    fiscal_year: Optional[str] = "FY 2024"
    nopat: float
    capital_charge: float
    eva: float
    is_value_creating: bool
    
    # Returns
    roic: float
    roi: float
    roe: float
    value_spread: float
    
    # Solvency & Leverage
    total_capital: float
    debt_to_equity: float
    debt_ratio: float
    debt_ratio_change: float
    
    # Margins & Growth
    operating_margin: float
    net_profit_margin: float
    revenue_growth: Optional[float]
    profit_growth: Optional[float]
    eva_growth: Optional[float]
    
    # Score
    shareholder_value_score: int
    score_classification: str
    score_breakdown: ScoreBreakdownSchema
    
    # Prior Period Metrics
    prev_nopat: Optional[float] = None
    prev_capital_charge: Optional[float] = None
    prev_eva: Optional[float] = None
    prev_roic: Optional[float] = None
    prev_roi: Optional[float] = None
    prev_roe: Optional[float] = None
    prev_debt_ratio: Optional[float] = None
    prev_value_spread: Optional[float] = None
    prev_score: Optional[int] = None
