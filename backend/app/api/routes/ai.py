from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.config import save_gemini_api_key, delete_gemini_api_key
from app.models.company import Company
from app.models.financial_record import FinancialRecord
from app.models.analysis_history import AnalysisHistory
from app.schemas.ai import (
    AiStatusResponse,
    AiKeyUpdateRequest,
    AiFinancialAnalysisResponse,
    AiChatRequest,
    AiChatResponse,
    AiScenarioExplainRequest,
    AiScenarioExplainResponse,
)
from app.services.gemini_service import GeminiService, GeminiNotConfiguredError, GeminiApiError

router = APIRouter(prefix="/ai", tags=["Gemini AI Analyst"])

@router.get("/status", response_model=AiStatusResponse)
def get_ai_status():
    """
    Returns the current operational status of the Gemini AI Financial Analyst,
    including masked API key and configured model.
    """
    return GeminiService.get_status()

@router.post("/settings", response_model=AiStatusResponse)
def update_ai_settings(payload: AiKeyUpdateRequest):
    """
    Validates and securely saves a new Gemini API key in local backend storage.
    Tests connectivity to Google Gemini before saving.
    """
    is_valid, error = GeminiService.validate_key(payload.api_key)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Gemini API key: {error}"
        )
    
    try:
        save_gemini_api_key(payload.api_key)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist API key: {str(e)}"
        )
    
    return GeminiService.get_status()

@router.delete("/settings", response_model=AiStatusResponse)
def remove_ai_settings():
    """
    Removes the saved Gemini API key from backend storage.
    """
    delete_gemini_api_key()
    return GeminiService.get_status()

@router.post("/analyze/{company_id}", response_model=AiFinancialAnalysisResponse)
def analyze_company_with_ai(company_id: int, db: Session = Depends(get_db)):
    """
    Generates comprehensive executive valuation commentary, strengths, weaknesses,
    risks, capital allocation recommendations, and prioritized action plan using Gemini.
    Strictly grounded in backend-calculated metrics.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} does not exist."
        )

    # Fetch latest financial record
    record = (
        db.query(FinancialRecord)
        .filter(FinancialRecord.company_id == company_id)
        .order_by(FinancialRecord.id.desc())
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No financial records found for {company.name}. Please submit financial statement inputs first."
        )

    # Fetch latest analysis record if available
    analysis = (
        db.query(AnalysisHistory)
        .filter(AnalysisHistory.company_id == company_id)
        .order_by(AnalysisHistory.id.desc())
        .first()
    )

    try:
        return GeminiService.analyze_company(company=company, record=record, analysis=analysis)
    except GeminiNotConfiguredError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except GeminiApiError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )

@router.post("/chat/{company_id}", response_model=AiChatResponse)
def chat_with_ai_analyst(company_id: int, payload: AiChatRequest, db: Session = Depends(get_db)):
    """
    Interactive financial copilot inquiry grounded exclusively in the selected company's
    verified valuation metrics. Enforces company context isolation.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} does not exist."
        )

    record = (
        db.query(FinancialRecord)
        .filter(FinancialRecord.company_id == company_id)
        .order_by(FinancialRecord.id.desc())
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No financial records found for {company.name}."
        )

    analysis = (
        db.query(AnalysisHistory)
        .filter(AnalysisHistory.company_id == company_id)
        .order_by(AnalysisHistory.id.desc())
        .first()
    )

    try:
        return GeminiService.chat(
            company=company,
            record=record,
            analysis=analysis,
            user_message=payload.message,
            history=payload.history or []
        )
    except GeminiNotConfiguredError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except GeminiApiError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )

@router.post("/explain-scenario/{company_id}", response_model=AiScenarioExplainResponse)
def explain_scenario_with_ai(company_id: int, payload: AiScenarioExplainRequest, db: Session = Depends(get_db)):
    """
    Interprets a simulated strategic capital allocation scenario calculated by
    the Valora Financial Engine. Gemini explains value impact without modifying numbers.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} does not exist."
        )

    try:
        return GeminiService.explain_scenario(company=company, request=payload)
    except GeminiNotConfiguredError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except GeminiApiError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )
