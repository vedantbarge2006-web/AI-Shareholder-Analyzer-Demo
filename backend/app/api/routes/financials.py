from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.company import Company
from app.models.financial_record import FinancialRecord
from app.schemas.financial import (
    FinancialInputSchema,
    FinancialRecordCreate,
    FinancialRecordResponse,
    ValueAnalysisOutputSchema,
)
from app.services.analysis_service import AnalysisService

router = APIRouter(tags=["Financials"])

@router.post("/analyze", response_model=ValueAnalysisOutputSchema)
def analyze_financials(payload: FinancialInputSchema, db: Session = Depends(get_db)):
    """
    Accepts financial data, computes NOPAT, Capital Charge, EVA, ROIC, ROE, ROI,
    Debt Ratio, Value Spread, and Shareholder Value Score with detailed attribution breakdown,
    and persists the record to the local SQLite database.
    """
    return AnalysisService.analyze_and_persist(db=db, inp=payload, save_record=True)

@router.post("/financials/calculate", response_model=ValueAnalysisOutputSchema)
def calculate_financials_stateless(payload: FinancialInputSchema):
    """
    Pure calculation endpoint: computes all valuation metrics and scores
    without saving records to the database. Useful for rapid client-side previews.
    """
    return AnalysisService.calculate_metrics_pure(inp=payload)

@router.post("/financial-records", response_model=FinancialRecordResponse, status_code=status.HTTP_201_CREATED)
def create_financial_record(payload: FinancialRecordCreate, db: Session = Depends(get_db)):
    """
    Creates a new financial statement record for an existing company and automatically
    runs and records shareholder value analysis.
    """
    company = db.query(Company).filter(Company.id == payload.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {payload.company_id} does not exist."
        )
        
    fin_record = FinancialRecord(
        company_id=payload.company_id,
        fiscal_year=payload.fiscal_year,
        revenue=payload.revenue,
        operating_profit=payload.operating_profit,
        net_profit=payload.net_profit,
        tax_rate=payload.tax_rate,
        total_debt=payload.total_debt,
        shareholders_equity=payload.shareholders_equity,
        invested_capital=payload.invested_capital,
        wacc=payload.wacc,
        prev_revenue=payload.prev_revenue,
        prev_operating_profit=payload.prev_operating_profit,
        prev_net_profit=payload.prev_net_profit,
        prev_total_debt=payload.prev_total_debt,
        prev_invested_capital=payload.prev_invested_capital,
        prev_shareholders_equity=payload.prev_shareholders_equity,
        prev_wacc=payload.prev_wacc,
    )
    db.add(fin_record)
    db.commit()
    db.refresh(fin_record)
    
    # Also trigger analysis calculation and save analysis history
    inp_schema = FinancialInputSchema(
        company_name=company.name,
        ticker=company.ticker,
        sector=company.sector,
        fiscal_year=payload.fiscal_year,
        revenue=payload.revenue,
        operating_profit=payload.operating_profit,
        net_profit=payload.net_profit,
        tax_rate=payload.tax_rate,
        total_debt=payload.total_debt,
        shareholders_equity=payload.shareholders_equity,
        invested_capital=payload.invested_capital,
        wacc=payload.wacc,
        prev_revenue=payload.prev_revenue,
        prev_operating_profit=payload.prev_operating_profit,
        prev_net_profit=payload.prev_net_profit,
        prev_total_debt=payload.prev_total_debt,
        prev_invested_capital=payload.prev_invested_capital,
        prev_shareholders_equity=payload.prev_shareholders_equity,
        prev_wacc=payload.prev_wacc,
    )
    AnalysisService.analyze_and_persist(db=db, inp=inp_schema, save_record=True)
    
    return fin_record

@router.get("/financial-records/{company_id}", response_model=List[FinancialRecordResponse])
def get_financial_records_by_company(company_id: int, db: Session = Depends(get_db)):
    """Retrieve all historical financial records for a given company."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} does not exist."
        )
    return (
        db.query(FinancialRecord)
        .filter(FinancialRecord.company_id == company_id)
        .order_by(FinancialRecord.created_at.desc())
        .all()
    )

@router.get("/financial-records/{record_id}/details", response_model=FinancialRecordResponse)
def get_financial_record_details(record_id: int, db: Session = Depends(get_db)):
    """Retrieve details of a single financial record."""
    record = db.query(FinancialRecord).filter(FinancialRecord.id == record_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Financial record with ID {record_id} not found."
        )
    return record
