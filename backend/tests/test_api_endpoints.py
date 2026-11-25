import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "version" in data
    assert "database_connected" in data

def test_financials_calculate_stateless():
    payload = {
        "company_name": "Stateless Test Corp",
        "revenue": 100000000.0,
        "operating_profit": 20000000.0,
        "net_profit": 15000000.0,
        "tax_rate": 25.0,
        "total_debt": 20000000.0,
        "shareholders_equity": 80000000.0,
        "invested_capital": 90000000.0,
        "wacc": 8.0
    }
    response = client.post("/api/v1/financials/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["nopat"] == 15000000.0
    assert data["capital_charge"] == 7200000.0
    assert data["eva"] == 7800000.0
    assert data["is_value_creating"] is True
    assert "shareholder_value_score" in data
    assert "score_breakdown" in data

def test_analyze_and_persist():
    payload = {
        "company_name": "Integration Test Technologies",
        "ticker": "ITT",
        "sector": "Information Technology",
        "fiscal_year": "FY 2024",
        "revenue": 150000000.0,
        "operating_profit": 30000000.0,
        "net_profit": 22000000.0,
        "tax_rate": 20.0,
        "total_debt": 30000000.0,
        "shareholders_equity": 100000000.0,
        "invested_capital": 110000000.0,
        "wacc": 7.5,
        "prev_revenue": 130000000.0,
        "prev_operating_profit": 25000000.0,
        "prev_net_profit": 18000000.0,
        "prev_total_debt": 35000000.0,
        "prev_invested_capital": 100000000.0,
        "prev_shareholders_equity": 90000000.0,
        "prev_wacc": 8.0
    }
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["company_name"] == "Integration Test Technologies"
    assert data["nopat"] == 24000000.0
    assert data["capital_charge"] == 8250000.0
    assert data["eva"] == 15750000.0
    assert data["revenue_growth"] == 15.38

    # Verify company was created in DB
    comp_res = client.get("/api/v1/companies")
    assert comp_res.status_code == 200
    companies = comp_res.json()
    assert any(c["name"] == "Integration Test Technologies" for c in companies)

def test_invalid_input_validation():
    # Negative revenue and tax rate > 100% should fail validation
    payload = {
        "company_name": "Invalid Corp",
        "revenue": -1000.0,
        "operating_profit": 200.0,
        "net_profit": 100.0,
        "tax_rate": 150.0,
        "total_debt": 50.0,
        "shareholders_equity": 0.0,  # equity must be > 0
        "invested_capital": 100.0,
        "wacc": 5.0
    }
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 422

def test_company_crud_lifecycle():
    # 1. Create company
    create_payload = {
        "name": "Starlight Robotics Corp",
        "ticker": "STRB",
        "sector": "Industrial Robotics",
        "tagline": "Next-gen robotic automation",
        "currency": "USD"
    }
    res = client.post("/api/v1/companies", json=create_payload)
    assert res.status_code == 201
    created = res.json()
    cid = created["id"]
    assert created["ticker"] == "STRB"

    # 2. Get company
    res = client.get(f"/api/v1/companies/{cid}")
    assert res.status_code == 200
    assert res.json()["name"] == "Starlight Robotics Corp"

    # 3. Update company
    res = client.put(f"/api/v1/companies/{cid}", json={"tagline": "Updated robotic automation leader"})
    assert res.status_code == 200
    assert res.json()["tagline"] == "Updated robotic automation leader"

    # 4. Delete company
    res = client.delete(f"/api/v1/companies/{cid}")
    assert res.status_code == 204

    # 5. Confirm deletion
    res = client.get(f"/api/v1/companies/{cid}")
    assert res.status_code == 404

def test_scenarios_comparison():
    payload = {
        "revenue": 100000000.0,
        "operating_profit": 20000000.0,
        "net_profit": 14000000.0,
        "tax_rate": 25.0,
        "total_debt": 30000000.0,
        "shareholders_equity": 70000000.0,
        "invested_capital": 80000000.0,
        "wacc": 8.0,
        "scenarios": [
            {
                "name": "Aggressive Capex Expansion",
                "scenario_type": "reinvest",
                "description": "Deploy $10M Capex",
                "rev_delta_pct": 10.0,
                "margin_delta_pct": 1.0,
                "debt_delta": 5000000.0,
                "invested_capital_delta": 10000000.0,
                "wacc_delta": 0.2
            },
            {
                "name": "Debt Deleveraging",
                "scenario_type": "debt_repayment",
                "description": "Pay down $15M debt",
                "rev_delta_pct": 0.0,
                "margin_delta_pct": 0.5,
                "debt_delta": -15000000.0,
                "invested_capital_delta": -5000000.0,
                "wacc_delta": -0.5
            }
        ]
    }
    response = client.post("/api/v1/scenarios/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "baseline_eva" in data
    assert len(data["scenarios"]) == 2
    sc1 = data["scenarios"][0]
    assert sc1["scenario_name"] == "Aggressive Capex Expansion"
    assert "projected_eva" in sc1
    assert "eva_impact" in sc1
