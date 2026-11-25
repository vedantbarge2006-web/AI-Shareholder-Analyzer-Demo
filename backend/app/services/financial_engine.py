"""
Valora AI — Centralized Financial Calculation Engine
Implements deterministic, verified corporate finance valuation formulas:
- Stern Stewart Economic Value Added (EVA®)
- Return on Invested Capital (ROIC)
- Return on Investment (ROI)
- Return on Equity (ROE) & DuPont Decomposition
- Debt Ratios & Solvency Metrics
- Shareholder Value Creation Score (0-100) & Factor Attribution
"""
from typing import Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class FinancialEngineInput:
    revenue: float
    operating_profit: float  # EBIT
    net_profit: float
    tax_rate: float          # In percent, e.g. 22.0 (or 0.22 auto-normalized)
    total_debt: float
    shareholders_equity: float
    invested_capital: float
    wacc: float              # In percent, e.g. 8.4 (or 0.084 auto-normalized)
    
    # Previous period comparative figures
    prev_revenue: Optional[float] = None
    prev_operating_profit: Optional[float] = None
    prev_net_profit: Optional[float] = None
    prev_total_debt: Optional[float] = None
    prev_shareholders_equity: Optional[float] = None
    prev_invested_capital: Optional[float] = None
    prev_wacc: Optional[float] = None

@dataclass
class ScoreAttribution:
    base_score: float
    value_spread_points: float
    roe_points: float
    growth_points: float
    solvency_points: float
    final_score: int
    classification: str
    interpretation: str

@dataclass
class FinancialEngineOutput:
    # Operating & Valuation Metrics
    nopat: float
    capital_charge: float
    eva: float
    is_value_creating: bool
    
    # Return Rates
    roic: float
    roi: float
    roe: float
    value_spread: float
    
    # Capital Structure & Solvency
    total_capital: float
    debt_ratio: float
    debt_to_equity: float
    debt_ratio_change: float
    
    # Margins & Growth
    operating_margin: float
    net_profit_margin: float
    revenue_growth: Optional[float]
    profit_growth: Optional[float]
    eva_growth: Optional[float]
    
    # Scoring
    shareholder_value_score: int
    score_classification: str
    score_attribution: ScoreAttribution

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

def normalize_percentage(value: float) -> float:
    """
    Normalizes percentage input:
    If value is <= 1.0 and > 0 (e.g. 0.22 or 0.084), converts to percentage scale (22.0, 8.4).
    If value is already on 0-100 scale, preserves it.
    """
    if 0 < value <= 1.0:
        return value * 100.0
    return value

def compute_score_breakdown(
    value_spread: float,
    roe: float,
    revenue_growth: float,
    debt_to_equity: float
) -> ScoreAttribution:
    """
    Evaluates the 0-100 Shareholder Value Score with detailed attribution points:
    1. Base: 50 pts
    2. Value Spread factor: up to +/- 25 pts (2.5 pts per 1% spread)
    3. ROE performance vs 12% equity hurdle: up to +/- 15 pts
    4. Topline growth: up to +/- 10 pts
    5. Solvency factor: +5 pts for conservative leverage, down to -15 pts for excessive debt
    """
    base_score = 50.0
    
    # 1. Value Spread (+/- 25 pts)
    spread_pts = max(-25.0, min(25.0, value_spread * 2.5))
    
    # 2. ROE Factor vs 12% Hurdle (+/- 15 pts)
    if roe >= 12.0:
        roe_pts = min(15.0, (roe - 12.0) * 1.25)
    else:
        roe_pts = -max(-15.0, (12.0 - roe) * 1.5)
        
    # 3. Growth Factor (+/- 10 pts)
    if revenueGrowth := revenue_growth:
        if revenueGrowth > 0:
            growth_pts = min(10.0, revenueGrowth * 0.5)
        else:
            growth_pts = max(-10.0, revenueGrowth * 0.4)
    else:
        growth_pts = 0.0
        
    # 4. Solvency Factor (+5 to -15 pts)
    if debt_to_equity <= 0.6:
        solvency_pts = 5.0
    elif debt_to_equity > 1.5:
        solvency_pts = -min(15.0, (debt_to_equity - 1.5) * 10.0)
    else:
        solvency_pts = 0.0
        
    raw_score = base_score + spread_pts + roe_pts + growth_pts + solvency_pts
    final_score = int(max(0, min(100, round(raw_score))))
    
    if final_score >= 75:
        classification = "Strong Value Creator"
        interpretation = "Firm generates substantial economic profit well in excess of its weighted cost of capital."
    elif final_score >= 55:
        classification = "Moderate Value Creator"
        interpretation = "Firm covers its hurdle rate and generates positive economic value with healthy returns."
    elif final_score >= 45:
        classification = "Value Neutral"
        interpretation = "Firm earns approximately its cost of capital; returns match investor hurdle rate."
    else:
        classification = "Value Destructive"
        interpretation = "Firm's returns on capital fall below hurdle cost of capital, eroding equity value."
        
    return ScoreAttribution(
        base_score=base_score,
        value_spread_points=round(spread_pts, 2),
        roe_points=round(roe_pts, 2),
        growth_points=round(growth_pts, 2),
        solvency_points=round(solvency_pts, 2),
        final_score=final_score,
        classification=classification,
        interpretation=interpretation
    )

class FinancialEngine:
    """Centralized valuation calculation engine."""

    @staticmethod
    def calculate(inp: FinancialEngineInput) -> FinancialEngineOutput:
        # 1. Normalize Rates
        tax_pct = normalize_percentage(inp.tax_rate)
        wacc_pct = normalize_percentage(inp.wacc)
        tax_decimal = tax_pct / 100.0
        wacc_decimal = wacc_pct / 100.0
        
        # 2. Operating & Capital Charge Calculations
        # NOPAT = EBIT * (1 - Tax Rate)
        nopat = inp.operating_profit * (1.0 - tax_decimal)
        
        # Capital Charge = Invested Capital * WACC
        capital_charge = inp.invested_capital * wacc_decimal
        
        # EVA = NOPAT - Capital Charge
        eva = nopat - capital_charge
        is_value_creating = eva > 0
        
        # 3. Return Rates (ROIC, ROI, ROE)
        # ROIC = NOPAT / Invested Capital * 100
        roic = (nopat / inp.invested_capital * 100.0) if inp.invested_capital > 0 else 0.0
        
        # ROI = Net Profit / Invested Capital * 100
        roi = (inp.net_profit / inp.invested_capital * 100.0) if inp.invested_capital > 0 else 0.0
        
        # ROE = Net Profit / Shareholders' Equity * 100
        roe = (inp.net_profit / inp.shareholders_equity * 100.0) if inp.shareholders_equity > 0 else 0.0
        
        # Value Spread = ROIC - WACC
        value_spread = roic - wacc_pct
        
        # 4. Solvency & Debt Ratios
        total_capital = inp.total_debt + inp.shareholders_equity
        debt_ratio = (inp.total_debt / total_capital * 100.0) if total_capital > 0 else 0.0
        debt_to_equity = (inp.total_debt / inp.shareholders_equity) if inp.shareholders_equity > 0 else 0.0
        
        # 5. Margins
        operating_margin = (inp.operating_profit / inp.revenue * 100.0) if inp.revenue > 0 else 0.0
        net_profit_margin = (inp.net_profit / inp.revenue * 100.0) if inp.revenue > 0 else 0.0
        
        # 6. Growth Calculations
        rev_growth = None
        if inp.prev_revenue and inp.prev_revenue > 0:
            rev_growth = ((inp.revenue - inp.prev_revenue) / inp.prev_revenue) * 100.0
            
        profit_growth = None
        if inp.prev_net_profit and inp.prev_net_profit > 0:
            profit_growth = ((inp.net_profit - inp.prev_net_profit) / inp.prev_net_profit) * 100.0
            
        # 7. Prior Period Metrics
        prev_nopat = None
        prev_capital_charge = None
        prev_eva = None
        prev_roic = None
        prev_roi = None
        prev_roe = None
        prev_debt_ratio = None
        prev_value_spread = None
        prev_score = None
        debt_ratio_change = 0.0
        eva_growth = None
        
        if inp.prev_operating_profit is not None and inp.prev_invested_capital is not None:
            prev_wacc_pct = normalize_percentage(inp.prev_wacc) if inp.prev_wacc else wacc_pct
            prev_nopat = inp.prev_operating_profit * (1.0 - tax_decimal)
            prev_capital_charge = inp.prev_invested_capital * (prev_wacc_pct / 100.0)
            prev_eva = prev_nopat - prev_capital_charge
            prev_roic = (prev_nopat / inp.prev_invested_capital * 100.0) if inp.prev_invested_capital > 0 else 0.0
            prev_value_spread = prev_roic - prev_wacc_pct
            
            if inp.prev_net_profit is not None and inp.prev_invested_capital > 0:
                prev_roi = (inp.prev_net_profit / inp.prev_invested_capital) * 100.0
                
            if inp.prev_shareholders_equity and inp.prev_shareholders_equity > 0 and inp.prev_net_profit is not None:
                prev_roe = (inp.prev_net_profit / inp.prev_shareholders_equity) * 100.0
                
            if inp.prev_total_debt is not None and inp.prev_shareholders_equity:
                prev_total_cap = inp.prev_total_debt + inp.prev_shareholders_equity
                if prev_total_cap > 0:
                    prev_debt_ratio = (inp.prev_total_debt / prev_total_cap) * 100.0
                    debt_ratio_change = debt_ratio - prev_debt_ratio
                    
                prev_dte = inp.prev_total_debt / inp.prev_shareholders_equity
                prev_breakdown = compute_score_breakdown(
                    value_spread=prev_value_spread,
                    roe=prev_roe if prev_roe else 0.0,
                    revenue_growth=0.0,
                    debt_to_equity=prev_dte
                )
                prev_score = prev_breakdown.final_score
                
            if prev_eva is not None and prev_eva != 0:
                eva_growth = ((eva - prev_eva) / abs(prev_eva)) * 100.0

        # 8. Composite Shareholder Value Score
        score_breakdown = compute_score_breakdown(
            value_spread=value_spread,
            roe=roe,
            revenue_growth=rev_growth if rev_growth else 0.0,
            debt_to_equity=debt_to_equity
        )
        
        return FinancialEngineOutput(
            nopat=round(nopat, 2),
            capital_charge=round(capital_charge, 2),
            eva=round(eva, 2),
            is_value_creating=is_value_creating,
            roic=round(roic, 2),
            roi=round(roi, 2),
            roe=round(roe, 2),
            value_spread=round(value_spread, 2),
            total_capital=round(total_capital, 2),
            debt_ratio=round(debt_ratio, 2),
            debt_to_equity=round(debt_to_equity, 2),
            debt_ratio_change=round(debt_ratio_change, 2),
            operating_margin=round(operating_margin, 2),
            net_profit_margin=round(net_profit_margin, 2),
            revenue_growth=round(rev_growth, 2) if rev_growth is not None else None,
            profit_growth=round(profit_growth, 2) if profit_growth is not None else None,
            eva_growth=round(eva_growth, 2) if eva_growth is not None else None,
            shareholder_value_score=score_breakdown.final_score,
            score_classification=score_breakdown.classification,
            score_attribution=score_breakdown,
            prev_nopat=round(prev_nopat, 2) if prev_nopat is not None else None,
            prev_capital_charge=round(prev_capital_charge, 2) if prev_capital_charge is not None else None,
            prev_eva=round(prev_eva, 2) if prev_eva is not None else None,
            prev_roic=round(prev_roic, 2) if prev_roic is not None else None,
            prev_roi=round(prev_roi, 2) if prev_roi is not None else None,
            prev_roe=round(prev_roe, 2) if prev_roe is not None else None,
            prev_debt_ratio=round(prev_debt_ratio, 2) if prev_debt_ratio is not None else None,
            prev_value_spread=round(prev_value_spread, 2) if prev_value_spread is not None else None,
            prev_score=prev_score
        )
