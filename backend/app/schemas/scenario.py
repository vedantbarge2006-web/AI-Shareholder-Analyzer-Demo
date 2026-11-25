from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class ScenarioAssumptionsSchema(BaseModel):
    name: str = Field(..., json_schema_extra={"example": "Growth Reinvestment Program"})
    scenario_type: str = Field(..., json_schema_extra={"example": "reinvest"}) # 'reinvest', 'debt_repayment', 'dividend', 'custom'
    description: Optional[str] = Field(None, json_schema_extra={"example": "Deploy $15M capex into high-margin enterprise sales."})
    
    rev_delta_pct: float = Field(..., json_schema_extra={"example": 12.0})
    margin_delta_pct: float = Field(..., json_schema_extra={"example": -1.0})
    debt_delta: float = Field(..., json_schema_extra={"example": 5000000.0})
    invested_capital_delta: float = Field(..., json_schema_extra={"example": 15000000.0})
    wacc_delta: float = Field(..., json_schema_extra={"example": 0.1})

class ScenarioSimulationResponse(BaseModel):
    id: Optional[int] = None
    scenario_name: str
    scenario_type: str
    description: Optional[str] = None
    
    # Assumptions
    rev_delta_pct: float
    margin_delta_pct: float
    debt_delta: float
    invested_capital_delta: float
    wacc_delta: float
    
    # Projections
    projected_revenue: float
    projected_net_profit: float
    projected_eva: float
    projected_roe: float
    projected_roic: float
    projected_debt_ratio: float
    projected_score: int
    eva_impact: float
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ScenarioCompareRequest(BaseModel):
    company_id: Optional[int] = None
    revenue: float = Field(..., gt=0)
    operating_profit: float
    net_profit: float
    tax_rate: float
    total_debt: float
    shareholders_equity: float = Field(..., gt=0)
    invested_capital: float = Field(..., gt=0)
    wacc: float
    
    scenarios: List[ScenarioAssumptionsSchema]

class ScenarioCompareResponse(BaseModel):
    baseline_eva: float
    baseline_roe: float
    baseline_roic: float
    baseline_debt_ratio: float
    baseline_score: int
    scenarios: List[ScenarioSimulationResponse]
