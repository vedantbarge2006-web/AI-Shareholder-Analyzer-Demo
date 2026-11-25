import io
import pytest
import openpyxl
from fastapi.testclient import TestClient

from app.main import app
from app.models.company import Company
from app.models.financial_record import FinancialRecord
from app.models.analysis_history import AnalysisHistory
from app.services.pdf_report_service import PdfReportService
from app.services.excel_report_service import ExcelReportService
from app.services.financial_engine import FinancialEngine, FinancialEngineInput
from app.services.analysis_service import AnalysisService
from app.schemas.financial import FinancialInputSchema
from conftest import TestingSessionLocal

client = TestClient(app)


@pytest.fixture
def sample_company_with_financials():
    db = TestingSessionLocal()
    company = Company(
        name="Enterprise Valuation Dynamics Inc.",
        ticker="EVD",
        sector="Industrial Automation",
        tagline="Smart Robotics & Control",
        currency="USD"
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    record = FinancialRecord(
        company_id=company.id,
        fiscal_year="FY 2024",
        revenue=120000000.0,
        operating_profit=24000000.0,
        net_profit=18000000.0,
        tax_rate=25.0,
        total_debt=25000000.0,
        shareholders_equity=75000000.0,
        invested_capital=85000000.0,
        wacc=8.0,
        prev_revenue=105000000.0,
        prev_operating_profit=20000000.0,
        prev_net_profit=15000000.0,
        prev_total_debt=28000000.0,
        prev_invested_capital=78000000.0,
        prev_shareholders_equity=68000000.0,
        prev_wacc=8.2
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Add historical audit record
    inp = FinancialInputSchema(
        company_name=company.name,
        ticker=company.ticker,
        sector=company.sector,
        fiscal_year=record.fiscal_year,
        revenue=record.revenue,
        operating_profit=record.operating_profit,
        net_profit=record.net_profit,
        tax_rate=record.tax_rate,
        total_debt=record.total_debt,
        shareholders_equity=record.shareholders_equity,
        invested_capital=record.invested_capital,
        wacc=record.wacc,
        prev_revenue=record.prev_revenue,
        prev_operating_profit=record.prev_operating_profit,
        prev_net_profit=record.prev_net_profit,
        prev_total_debt=record.prev_total_debt,
        prev_invested_capital=record.prev_invested_capital,
        prev_shareholders_equity=record.prev_shareholders_equity,
        prev_wacc=record.prev_wacc,
    )
    analysis_output = AnalysisService.analyze_and_persist(db, inp, save_record=True)

    yield {
        "company": company,
        "record": record,
        "analysis": analysis_output,
        "db": db
    }

    db.close()


def test_pdf_report_direct_service(sample_company_with_financials):
    company = sample_company_with_financials["company"]
    record = sample_company_with_financials["record"]
    analysis = sample_company_with_financials["analysis"]

    pdf_bytes = PdfReportService.generate_report(
        company=company,
        record=record,
        analysis=analysis,
        ai_data=None,
        history=None
    )

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 5000
    assert pdf_bytes.startswith(b"%PDF-")


def test_pdf_report_with_ai_data(sample_company_with_financials):
    company = sample_company_with_financials["company"]
    record = sample_company_with_financials["record"]
    analysis = sample_company_with_financials["analysis"]

    mock_ai = {
        "executive_summary": "EVD exhibits outstanding capital returns and value creation dynamics.",
        "financial_strengths": ["ROIC of 21.18% substantially beats 8.0% WACC", "Strong balance sheet"],
        "financial_weaknesses": ["Capex reinvestment pipeline needs prioritization"],
        "prioritized_action_plan": [
            {
                "step_number": 1,
                "action": "Accelerate high-margin software recurring revenue",
                "focus_area": "Revenue Mix",
                "target_metric": "+200 bps EBIT Margin",
                "timeline": "Months 1-3"
            }
        ],
        "short_term_outlook": "Positive quarterly cash flow trajectory.",
        "long_term_outlook": "Compounding shareholder wealth."
    }

    pdf_bytes = PdfReportService.generate_report(
        company=company,
        record=record,
        analysis=analysis,
        ai_data=mock_ai,
        history=None
    )

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 5000
    assert pdf_bytes.startswith(b"%PDF-")


def test_excel_report_direct_service(sample_company_with_financials):
    company = sample_company_with_financials["company"]
    record = sample_company_with_financials["record"]
    analysis = sample_company_with_financials["analysis"]

    xlsx_bytes = ExcelReportService.generate_workbook(
        company=company,
        record=record,
        analysis=analysis,
        history=None
    )

    assert isinstance(xlsx_bytes, bytes)
    assert len(xlsx_bytes) > 2000

    # Parse with openpyxl to verify structure
    wb = openpyxl.load_workbook(io.BytesIO(xlsx_bytes))
    sheet_names = wb.sheetnames
    assert "Executive Valuation" in sheet_names
    assert "Financial Statements" in sheet_names
    assert "Score Attribution" in sheet_names

    ws_exec = wb["Executive Valuation"]
    assert ws_exec["B4"].value == company.name
    assert ws_exec["E4"].value == company.ticker


def test_api_get_pdf_endpoint(sample_company_with_financials):
    company = sample_company_with_financials["company"]
    response = client.get(f"/api/v1/reports/{company.id}/pdf")
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "Content-Disposition" in response.headers
    assert f"VALORA_Report_{company.ticker}" in response.headers["Content-Disposition"]
    assert response.content.startswith(b"%PDF-")


def test_api_post_pdf_endpoint_with_custom_payload(sample_company_with_financials):
    company = sample_company_with_financials["company"]
    custom_payload = {
        "ai_data": {
            "executive_summary": "Client-cached AI summary verified.",
            "financial_strengths": ["ROIC beats hurdle rate by 13%"],
            "financial_weaknesses": ["Working capital cycles"],
        }
    }
    response = client.post(f"/api/v1/reports/{company.id}/pdf", json=custom_payload)
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF-")


def test_api_get_excel_endpoint(sample_company_with_financials):
    company = sample_company_with_financials["company"]
    response = client.get(f"/api/v1/reports/{company.id}/excel")
    
    assert response.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers["content-type"]
    assert "Content-Disposition" in response.headers
    assert f"VALORA_Financial_Model_{company.ticker}" in response.headers["Content-Disposition"]
    assert len(response.content) > 1000


def test_api_get_reports_history_endpoint(sample_company_with_financials):
    company = sample_company_with_financials["company"]
    response = client.get(f"/api/v1/reports/{company.id}/history")
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["period"] == "FY 2024"
    assert "eva" in data[0]
    assert "roic" in data[0]


def test_report_missing_company():
    response_pdf = client.get("/api/v1/reports/999999/pdf")
    assert response_pdf.status_code == 404
    assert "does not exist" in response_pdf.json()["detail"]

    response_excel = client.get("/api/v1/reports/999999/excel")
    assert response_excel.status_code == 404


def test_report_company_without_financial_records():
    db = TestingSessionLocal()
    empty_company = Company(name="Empty Shell Corp", ticker="ESHC", sector="Holding")
    db.add(empty_company)
    db.commit()
    db.refresh(empty_company)
    company_id = empty_company.id
    db.close()

    response = client.get(f"/api/v1/reports/{company_id}/pdf")
    assert response.status_code == 400
    assert "has no financial records" in response.json()["detail"]


def test_report_data_accuracy_matches_engine(sample_company_with_financials):
    record = sample_company_with_financials["record"]
    analysis = sample_company_with_financials["analysis"]

    # Calculate directly via FinancialEngine
    engine_inp = FinancialEngineInput(
        revenue=record.revenue,
        operating_profit=record.operating_profit,
        net_profit=record.net_profit,
        tax_rate=record.tax_rate,
        total_debt=record.total_debt,
        shareholders_equity=record.shareholders_equity,
        invested_capital=record.invested_capital,
        wacc=record.wacc,
        prev_revenue=record.prev_revenue,
        prev_operating_profit=record.prev_operating_profit,
        prev_net_profit=record.prev_net_profit,
        prev_total_debt=record.prev_total_debt,
        prev_shareholders_equity=record.prev_shareholders_equity,
        prev_invested_capital=record.prev_invested_capital,
        prev_wacc=record.prev_wacc,
    )
    direct_engine_out = FinancialEngine.calculate(engine_inp)

    # NOPAT = 24M * (1 - 0.25) = 18M
    assert direct_engine_out.nopat == 18000000.0
    assert analysis.nopat == direct_engine_out.nopat

    # Capital Charge = 85M * 0.08 = 6.8M
    assert direct_engine_out.capital_charge == 6800000.0
    assert analysis.capital_charge == direct_engine_out.capital_charge

    # EVA = 18M - 6.8M = 11.2M
    assert direct_engine_out.eva == 11200000.0
    assert analysis.eva == direct_engine_out.eva

    # ROIC = 18M / 85M * 100 = 21.18%
    assert direct_engine_out.roic == round(18000000.0 / 85000000.0 * 100, 2)
    assert analysis.roic == direct_engine_out.roic

    # Value spread = ROIC - 8.0 = 13.18%
    assert direct_engine_out.value_spread == round(direct_engine_out.roic - 8.0, 2)
    assert analysis.value_spread == direct_engine_out.value_spread
