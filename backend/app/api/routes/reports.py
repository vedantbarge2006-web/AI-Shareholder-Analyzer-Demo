import re
from fastapi import APIRouter, Depends, HTTPException, status, Response, Body
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List

from app.core.database import get_db
from app.models.company import Company
from app.models.financial_record import FinancialRecord
from app.models.analysis_history import AnalysisHistory
from app.schemas.financial import FinancialInputSchema
from app.schemas.analysis import AnalysisHistoryResponse
from app.services.analysis_service import AnalysisService
from app.services.pdf_report_service import PdfReportService
from app.services.excel_report_service import ExcelReportService
from app.services.gemini_service import GeminiService

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])


def _clean_filename_part(text: str) -> str:
    """Removes special characters to produce safe HTTP header filenames."""
    return re.sub(r"[^a-zA-Z0-9_\-]", "_", text).strip("_")


def _get_company_and_record(db: Session, company_id: int):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} does not exist."
        )

    # Get latest financial record
    record = (
        db.query(FinancialRecord)
        .filter(FinancialRecord.company_id == company_id)
        .order_by(FinancialRecord.created_at.desc(), FinancialRecord.id.desc())
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Company '{company.name}' has no financial records. Please input financial statements before generating reports."
        )

    return company, record


def _get_analysis_output(company: Company, record: FinancialRecord):
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
    return AnalysisService.calculate_metrics_pure(inp)


@router.get("/{company_id}/pdf")
def export_pdf_report(
    company_id: int,
    include_ai: bool = True,
    db: Session = Depends(get_db)
):
    """
    Generates and returns an auditor-grade PDF Shareholder Value Creation Report.
    Includes visual charts, executive valuation scorecard, Stern Stewart EVA decomposition,
    and Gemini AI strategic advisory when configured.
    """
    company, record = _get_company_and_record(db, company_id)
    analysis = _get_analysis_output(company, record)
    history = AnalysisService.get_history_by_company(db, company_id)

    ai_data = None
    if include_ai and GeminiService.is_configured():
        try:
            # Generate AI analysis if configured
            ai_resp = GeminiService.generate_financial_analysis(analysis)
            ai_data = ai_resp.model_dump()
        except Exception:
            ai_data = None  # Graceful fallback to non-AI report

    pdf_bytes = PdfReportService.generate_report(
        company=company,
        record=record,
        analysis=analysis,
        ai_data=ai_data,
        history=history,
    )

    clean_ticker = _clean_filename_part(company.ticker or "CORP")
    clean_period = _clean_filename_part(record.fiscal_year or "FY2024")
    filename = f"VALORA_Report_{clean_ticker}_{clean_period}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )


@router.post("/{company_id}/pdf")
def export_pdf_report_with_payload(
    company_id: int,
    payload: Optional[Dict[str, Any]] = Body(default=None),
    db: Session = Depends(get_db)
):
    """
    Generates PDF report accepting client-cached AI insights to avoid duplicate LLM queries.
    """
    company, record = _get_company_and_record(db, company_id)
    analysis = _get_analysis_output(company, record)
    history = AnalysisService.get_history_by_company(db, company_id)

    ai_data = payload.get("ai_data") if payload else None
    if not ai_data and GeminiService.is_configured():
        try:
            ai_resp = GeminiService.generate_financial_analysis(analysis)
            ai_data = ai_resp.model_dump()
        except Exception:
            ai_data = None

    pdf_bytes = PdfReportService.generate_report(
        company=company,
        record=record,
        analysis=analysis,
        ai_data=ai_data,
        history=history,
    )

    clean_ticker = _clean_filename_part(company.ticker or "CORP")
    clean_period = _clean_filename_part(record.fiscal_year or "FY2024")
    filename = f"VALORA_Report_{clean_ticker}_{clean_period}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )


@router.get("/{company_id}/excel")
def export_excel_report(
    company_id: int,
    db: Session = Depends(get_db)
):
    """
    Generates and returns a professional, styled multi-tab Excel workbook (.xlsx)
    containing executive scorecard, statement inputs, and score attribution.
    """
    company, record = _get_company_and_record(db, company_id)
    analysis = _get_analysis_output(company, record)
    history = AnalysisService.get_history_by_company(db, company_id)

    xlsx_bytes = ExcelReportService.generate_workbook(
        company=company,
        record=record,
        analysis=analysis,
        history=history,
    )

    clean_ticker = _clean_filename_part(company.ticker or "CORP")
    clean_period = _clean_filename_part(record.fiscal_year or "FY2024")
    filename = f"VALORA_Financial_Model_{clean_ticker}_{clean_period}.xlsx"

    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )


@router.post("/{company_id}/excel")
def export_excel_report_post(
    company_id: int,
    db: Session = Depends(get_db)
):
    """
    POST variant for Excel export.
    """
    return export_excel_report(company_id=company_id, db=db)


@router.get("/{company_id}/history", response_model=List[AnalysisHistoryResponse])
def get_company_reports_history(
    company_id: int,
    db: Session = Depends(get_db)
):
    """
    Returns the complete list of historical audit reports archived in SQLite for a company.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} does not exist."
        )

    return AnalysisService.get_history_by_company(db, company_id)
