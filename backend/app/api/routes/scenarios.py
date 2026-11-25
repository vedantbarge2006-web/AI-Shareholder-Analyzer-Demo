from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.company import Company
from app.models.scenario_history import ScenarioHistory
from app.schemas.scenario import (
    ScenarioCompareRequest,
    ScenarioCompareResponse,
    ScenarioSimulationResponse,
)
from app.services.scenario_service import ScenarioService

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

@router.post("/compare", response_model=ScenarioCompareResponse)
def compare_scenarios(
    payload: ScenarioCompareRequest,
    save_history: bool = Query(False, description="Persist simulated scenarios into the database"),
    db: Session = Depends(get_db)
):
    """
    Compares baseline financial metrics against multiple operational & capital allocation scenarios:
    - Organic Growth Reinvestment (Capex)
    - Debt Deleveraging
    - Share Buyback / Dividend Distribution
    - Custom user-defined levers
    """
    return ScenarioService.compare_scenarios(db=db, request=payload, save_records=save_history)

@router.get("/history/{company_id}", response_model=List[ScenarioSimulationResponse])
def get_scenario_history(company_id: int, db: Session = Depends(get_db)):
    """Retrieve all saved strategic scenarios for a company."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} does not exist."
        )
    return ScenarioService.get_history_by_company(db, company_id)

@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scenario(scenario_id: int, db: Session = Depends(get_db)):
    """Delete a saved scenario simulation."""
    success = ScenarioService.delete_scenario(db, scenario_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario with ID {scenario_id} not found."
        )
    return None
