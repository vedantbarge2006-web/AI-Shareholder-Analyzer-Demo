import pytest
from app.services.financial_engine import (
    FinancialEngine,
    FinancialEngineInput,
    compute_score_breakdown,
    normalize_percentage
)

def test_percentage_normalization():
    assert normalize_percentage(0.22) == 22.0
    assert normalize_percentage(0.084) == 8.4
    assert normalize_percentage(22.0) == 22.0
    assert normalize_percentage(8.4) == 8.4
    assert normalize_percentage(0.0) == 0.0

def test_apex_value_creator_calculation():
    """
    Tests financial calculations for Apex Global Technologies:
    Revenue: $142.5M, EBIT: $33.48M, Net: $25.11M, Tax: 22%, Debt: $38M, Equity: $122M, Cap: $136M, WACC: 8.4%
    """
    inp = FinancialEngineInput(
        revenue=142500000.0,
        operating_profit=33480000.0,
        net_profit=25110000.0,
        tax_rate=22.0,
        total_debt=38000000.0,
        shareholders_equity=122000000.0,
        invested_capital=136000000.0,
        wacc=8.4,
        prev_revenue=122800000.0,
        prev_operating_profit=27500000.0,
        prev_net_profit=20600000.0,
        prev_total_debt=42000000.0,
        prev_invested_capital=121000000.0,
        prev_shareholders_equity=104000000.0,
        prev_wacc=8.6
    )
    res = FinancialEngine.calculate(inp)

    # NOPAT = 33,480,000 * (1 - 0.22) = 26,114,400
    assert res.nopat == 26114400.0
    
    # Capital Charge = 136,000,000 * 0.084 = 11,424,000
    assert res.capital_charge == 11424000.0
    
    # EVA = 26,114,400 - 11,424,000 = +14,690,400
    assert res.eva == 14690400.0
    assert res.is_value_creating is True
    
    # ROIC = 26,114,400 / 136,000,000 * 100 = 19.20%
    assert res.roic == 19.2
    
    # ROE = 25,114,000 / 122,000,000 * 100 = 20.58%
    assert res.roe == 20.58
    
    # ROI = 25,110,000 / 136,000,000 * 100 = 18.46%
    assert res.roi == 18.46
    
    # Value Spread = 19.20 - 8.4 = +10.80%
    assert res.value_spread == 10.8
    
    # Debt Ratio = 38 / (38 + 122) = 38 / 160 = 23.75%
    assert res.debt_ratio == 23.75
    
    # Debt to Equity = 38 / 122 = 0.311x
    assert res.debt_to_equity == 0.31
    
    # Growth = (142.5 - 122.8) / 122.8 = 16.04%
    assert res.revenue_growth == 16.04
    
    # Score classification
    assert res.shareholder_value_score >= 75
    assert res.score_classification == "Strong Value Creator"

def test_titan_value_destroyer_calculation():
    """
    Tests financial calculations for Titan Heavy Materials (Value Destructive):
    Revenue: $96M, EBIT: $9.8M, Net: $4.2M, Tax: 25%, Debt: $78M, Equity: $54M, Cap: $120M, WACC: 10.2%
    """
    inp = FinancialEngineInput(
        revenue=96000000.0,
        operating_profit=9800000.0,
        net_profit=4200000.0,
        tax_rate=25.0,
        total_debt=78000000.0,
        shareholders_equity=54000000.0,
        invested_capital=120000000.0,
        wacc=10.2,
        prev_revenue=104000000.0,
        prev_operating_profit=12400000.0,
        prev_net_profit=6800000.0,
        prev_total_debt=72000000.0,
        prev_invested_capital=126000000.0,
        prev_shareholders_equity=58000000.0,
        prev_wacc=9.8
    )
    res = FinancialEngine.calculate(inp)

    # NOPAT = 9,800,000 * 0.75 = 7,350,000
    assert res.nopat == 7350000.0
    
    # Capital Charge = 120,000,000 * 0.102 = 12,240,000
    assert res.capital_charge == 12240000.0
    
    # EVA = 7,350,000 - 12,240,000 = -4,890,000 (Negative!)
    assert res.eva == -4890000.0
    assert res.is_value_creating is False
    
    # ROIC = 7,350,000 / 120,000,000 = 6.125% -> 6.12%
    assert res.roic == pytest.approx(6.125, 0.01)
    
    # Value Spread = 6.13 - 10.2 = -4.07%
    assert res.value_spread == -4.07
    
    # Score should be < 45 ("Value Destructive")
    assert res.shareholder_value_score < 45
    assert res.score_classification == "Value Destructive"

def test_safe_division_by_zero_and_edge_cases():
    """
    Validates that zero denominators never raise ZeroDivisionError and produce safe numeric results.
    """
    inp = FinancialEngineInput(
        revenue=0.0,
        operating_profit=0.0,
        net_profit=0.0,
        tax_rate=0.0,
        total_debt=0.0,
        shareholders_equity=0.0,
        invested_capital=0.0,
        wacc=0.0,
        prev_revenue=None,
        prev_net_profit=None
    )
    res = FinancialEngine.calculate(inp)
    
    assert res.nopat == 0.0
    assert res.capital_charge == 0.0
    assert res.eva == 0.0
    assert res.is_value_creating is False
    assert res.roic == 0.0
    assert res.roi == 0.0
    assert res.roe == 0.0
    assert res.debt_ratio == 0.0
    assert res.debt_to_equity == 0.0
    assert res.operating_margin == 0.0
    assert res.net_profit_margin == 0.0
    assert res.revenue_growth is None
    assert 0 <= res.shareholder_value_score <= 100

def test_score_attribution_bounds():
    """
    Checks that the score breakdown attribution correctly clamps within [0, 100].
    """
    # Highly extreme positive scenario
    breakdown_high = compute_score_breakdown(
        value_spread=50.0,
        roe=100.0,
        revenue_growth=80.0,
        debt_to_equity=0.1
    )
    assert breakdown_high.final_score == 100
    assert breakdown_high.classification == "Strong Value Creator"

    # Highly extreme negative scenario
    breakdown_low = compute_score_breakdown(
        value_spread=-50.0,
        roe=-50.0,
        revenue_growth=-50.0,
        debt_to_equity=10.0
    )
    assert breakdown_low.final_score == 0
    assert breakdown_low.classification == "Value Destructive"
