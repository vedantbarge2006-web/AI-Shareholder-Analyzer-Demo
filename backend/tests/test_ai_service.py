import json
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import GEMINI_KEY_FILE
from app.models.company import Company
from app.models.financial_record import FinancialRecord
from app.models.analysis_history import AnalysisHistory
from conftest import TestingSessionLocal

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_ai_test_environment(monkeypatch):
    # Ensure GEMINI_KEY_FILE is isolated during tests
    test_key_file = GEMINI_KEY_FILE.parent / ".gemini_key_test"
    monkeypatch.setattr("app.core.config.GEMINI_KEY_FILE", test_key_file)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    if test_key_file.exists():
        test_key_file.unlink()
    
    # Seed a test company and financial record
    db = TestingSessionLocal()
    company = Company(name="Test Software Corp", ticker="TSTC", sector="Enterprise Software")
    db.add(company)
    db.commit()
    db.refresh(company)

    record = FinancialRecord(
        company_id=company.id,
        fiscal_year="FY2024",
        revenue=100000000.0,
        operating_profit=20000000.0,
        net_profit=15000000.0,
        tax_rate=25.0,
        total_debt=20000000.0,
        shareholders_equity=80000000.0,
        invested_capital=90000000.0,
        wacc=8.0
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    analysis = AnalysisHistory(
        company_id=company.id,
        financial_record_id=record.id,
        period="FY2024",
        nopat=15000000.0,
        capital_charge=7200000.0,
        eva=7800000.0,
        is_value_creating=True,
        roic=16.67,
        roi=16.67,
        roe=18.75,
        value_spread=8.67,
        debt_ratio=20.0,
        debt_to_equity=0.25,
        operating_margin=20.0,
        net_profit_margin=15.0,
        shareholder_value_score=85,
        score_classification="Strong Value Creator"
    )
    db.add(analysis)
    db.commit()
    db.close()

    yield

    if test_key_file.exists():
        test_key_file.unlink()

def test_ai_status_unconfigured():
    response = client.get("/api/v1/ai/status")
    assert response.status_code == 200
    data = response.json()
    assert data["is_configured"] is False
    assert data["masked_key"] is None
    assert data["service_status"] == "unconfigured"

def test_ai_settings_invalid_key():
    with patch("app.services.gemini_service.genai.Client") as mock_client_cls:
        mock_instance = MagicMock()
        mock_instance.models.generate_content.side_effect = Exception("API key not valid. Please pass a valid API key.")
        mock_client_cls.return_value = mock_instance

        response = client.post("/api/v1/ai/settings", json={"api_key": "invalid_api_key_12345"})
        assert response.status_code == 400
        assert "Invalid Gemini API key" in response.json()["detail"]

def test_ai_settings_save_and_delete():
    with patch("app.services.gemini_service.genai.Client") as mock_client_cls:
        mock_instance = MagicMock()
        mock_resp = MagicMock()
        mock_resp.text = "Pong"
        mock_instance.models.generate_content.return_value = mock_resp
        mock_client_cls.return_value = mock_instance

        # Save valid key
        valid_key = "AIzaSyD_TestValidKey_123456789"
        res_save = client.post("/api/v1/ai/settings", json={"api_key": valid_key})
        assert res_save.status_code == 200
        data = res_save.json()
        assert data["is_configured"] is True
        assert data["masked_key"] is not None
        assert "AIzaSy" in data["masked_key"]
        assert data["service_status"] == "ready"

        # Check status endpoint
        res_status = client.get("/api/v1/ai/status")
        assert res_status.status_code == 200
        assert res_status.json()["is_configured"] is True

        # Delete key
        res_del = client.delete("/api/v1/ai/settings")
        assert res_del.status_code == 200
        assert res_del.json()["is_configured"] is False

def test_ai_analyze_missing_config():
    response = client.post("/api/v1/ai/analyze/1")
    assert response.status_code == 503
    assert "Gemini API key is not configured" in response.json()["detail"]

def test_ai_nonexistent_company():
    response = client.post("/api/v1/ai/analyze/9999")
    assert response.status_code == 404

def test_ai_analyze_with_mocked_gemini(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "AIzaSyTestKey_999888777")

    mock_analysis_data = {
        "company_name": "Test Software Corp",
        "ticker": "TSTC",
        "fiscal_year": "FY2024",
        "executive_summary": "Test Software Corp is executing a disciplined capital allocation strategy yielding positive EVA.",
        "shareholder_value_assessment": "Value Accretive with strong ROIC-WACC spread of 8.67%.",
        "financial_strengths": ["ROIC of 16.67% exceeds hurdle rate", "Conservative Debt-to-Equity of 0.25x"],
        "financial_weaknesses": ["Working capital intensity could be optimized"],
        "risk_assessment": ["Potential tech sector valuation compressions"],
        "growth_opportunities": ["SaaS expansion in enterprise segment"],
        "capital_allocation_recommendations": [
            {
                "recommendation": "Expand organic high-margin cloud services",
                "reason": "ROIC exceeds WACC by over 800 basis points",
                "expected_impact": "+$2.5M EVA annually",
                "priority": "High",
                "suggested_timeframe": "0-6 months"
            }
        ],
        "debt_management_recommendations": [
            {
                "recommendation": "Maintain conservative debt level",
                "reason": "Debt ratio of 20% provides strong liquidity buffer",
                "expected_impact": "Preserves investment-grade credit profile",
                "priority": "Medium",
                "suggested_timeframe": "6-12 months"
            }
        ],
        "profitability_recommendations": [
            {
                "recommendation": "Target 22% operating margin via automation",
                "reason": "Expands bottom-line cash flow directly into NOPAT",
                "expected_impact": "+150 bps ROIC",
                "priority": "High",
                "suggested_timeframe": "6-12 months"
            }
        ],
        "prioritized_action_plan": [
            {
                "step_number": 1,
                "action": "Accelerate cloud enterprise contracts",
                "focus_area": "Operations",
                "target_metric": "Revenue Growth +12%",
                "timeline": "Q1-Q2"
            }
        ],
        "short_term_outlook": "Robust liquidity and positive EVA expansion expected.",
        "long_term_outlook": "Sustained economic profit compounding.",
        "model_used": "gemini-2.5-flash",
        "generated_at": "2026-11-22T12:00:00"
    }

    with patch("app.services.gemini_service.genai.Client") as mock_client_cls:
        mock_instance = MagicMock()
        mock_resp = MagicMock()
        mock_resp.text = json.dumps(mock_analysis_data)
        mock_instance.models.generate_content.return_value = mock_resp
        mock_client_cls.return_value = mock_instance

        response = client.post("/api/v1/ai/analyze/1")
        assert response.status_code == 200
        data = response.json()
        assert data["company_name"] == "Test Software Corp"
        assert data["ticker"] == "TSTC"
        assert len(data["financial_strengths"]) > 0
        assert len(data["capital_allocation_recommendations"]) > 0
        assert data["capital_allocation_recommendations"][0]["priority"] == "High"

def test_ai_chat_with_mocked_gemini(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "AIzaSyTestKey_999888777")

    with patch("app.services.gemini_service.genai.Client") as mock_client_cls:
        mock_instance = MagicMock()
        mock_resp = MagicMock()
        mock_resp.text = "Your ROIC of 16.67% significantly exceeds your 8.0% WACC, creating $7.8M in annual EVA."
        mock_instance.models.generate_content.return_value = mock_resp
        mock_client_cls.return_value = mock_instance

        chat_payload = {
            "message": "Why is our EVA positive?",
            "history": []
        }
        response = client.post("/api/v1/ai/chat/1", json=chat_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["company_id"] == 1
        assert data["company_name"] == "Test Software Corp"
        assert "EVA" in data["metrics_referenced"]
        assert "ROIC" in data["reply"]

def test_ai_scenario_explain_with_mocked_gemini(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "AIzaSyTestKey_999888777")

    mock_explain_data = {
        "headline": "Growth Capex Accretion: +$2.1M EVA Boost",
        "value_creation_verdict": "Value Accretive",
        "what_changed": "Revenue expanded by 10% alongside a $10M capital reinvestment.",
        "why_it_matters": "The incremental capital return exceeds the hurdle rate, creating net economic surplus.",
        "eva_roic_impact_analysis": "Projected EVA increases from $7.8M to $9.9M, expanding ROIC by 1.2% points.",
        "debt_solvency_implications": "Debt-to-Equity remains moderate at 0.31x, preserving solvency headroom.",
        "strategic_recommendations": [
            "Approve Phase 1 Capex allocation",
            "Monitor operating margins quarterly"
        ],
        "model_used": "gemini-2.5-flash"
    }

    with patch("app.services.gemini_service.genai.Client") as mock_client_cls:
        mock_instance = MagicMock()
        mock_resp = MagicMock()
        mock_resp.text = json.dumps(mock_explain_data)
        mock_instance.models.generate_content.return_value = mock_resp
        mock_client_cls.return_value = mock_instance

        explain_payload = {
            "scenario_name": "Organic Growth Reinvestment",
            "scenario_type": "reinvest",
            "assumptions": {
                "rev_delta_pct": 10.0,
                "margin_delta_pct": 1.0,
                "debt_delta": 5000000.0,
                "invested_capital_delta": 10000000.0,
                "wacc_delta": 0.1
            },
            "baseline_metrics": {
                "eva": 7800000.0,
                "roic": 16.67,
                "roe": 18.75,
                "debt_ratio": 20.0,
                "score": 85
            },
            "projected_metrics": {
                "projected_revenue": 110000000.0,
                "projected_eva": 9900000.0,
                "projected_roic": 17.87,
                "projected_roe": 20.10,
                "projected_debt_ratio": 23.5,
                "projected_score": 90,
                "eva_impact": 2100000.0
            }
        }
        response = client.post("/api/v1/ai/explain-scenario/1", json=explain_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["value_creation_verdict"] == "Value Accretive"
        assert len(data["strategic_recommendations"]) == 2
