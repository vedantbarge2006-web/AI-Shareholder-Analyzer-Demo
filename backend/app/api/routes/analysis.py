from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.company import Company
from app.models.analysis_history import AnalysisHistory
from app.schemas.analysis import AnalysisHistoryResponse
from app.services.analysis_service import AnalysisService

router = APIRouter(prefix="/analysis", tags=["Analysis"])

@router.get("/history/{company_id}", response_model=List[AnalysisHistoryResponse])
def get_analysis_history(company_id: int, db: Session = Depends(get_db)):
    """Retrieve all historical shareholder value creation audits for a company."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} does not exist."
        )
    return AnalysisService.get_history_by_company(db, company_id)

@router.get("/{analysis_id}", response_model=AnalysisHistoryResponse)
def get_analysis_record(analysis_id: int, db: Session = Depends(get_db)):
    """Retrieve a single shareholder value creation analysis record."""
    record = AnalysisService.get_analysis_by_id(db, analysis_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis record with ID {analysis_id} not found."
        )
    return record
