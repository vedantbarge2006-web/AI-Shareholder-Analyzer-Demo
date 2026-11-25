from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.scenario_history import ScenarioHistory
from app.schemas.scenario import (
    ScenarioCompareRequest,
    ScenarioCompareResponse,
    ScenarioSimulationResponse,
    ScenarioAssumptionsSchema,
)
from app.services.financial_engine import FinancialEngine, FinancialEngineInput, compute_score_breakdown

class ScenarioService:
    @staticmethod
    def simulate_scenario(
        baseline_revenue: float,
        baseline_ebit: float,
        baseline_net_profit: float,
        tax_rate: float,
        baseline_debt: float,
        baseline_equity: float,
        baseline_invested_cap: float,
        baseline_wacc: float,
        baseline_eva: float,
        assumption: ScenarioAssumptionsSchema,
    ) -> ScenarioSimulationResponse:
        """
        Projects future financial metrics under user-defined operational and capital levers.
        """
        # Revenue projection
        proj_rev = baseline_revenue * (1.0 + assumption.rev_delta_pct / 100.0)
        
        # Operating profit projection
        curr_op_margin = (baseline_ebit / baseline_revenue * 100.0) if baseline_revenue > 0 else 0.0
        proj_op_margin = max(1.0, curr_op_margin + assumption.margin_delta_pct)
        proj_ebit = proj_rev * (proj_op_margin / 100.0)
        
        # Taxes & NOPAT
        tax_decimal = (tax_rate / 100.0) if tax_rate > 1.0 else tax_rate
        proj_nopat = proj_ebit * (1.0 - tax_decimal)
        
        # Capital Structure & Hurdle
        proj_invested_cap = max(1_000_000.0, baseline_invested_cap + assumption.invested_capital_delta)
        wacc_base = baseline_wacc if baseline_wacc > 1.0 else baseline_wacc * 100.0
        proj_wacc = max(1.0, wacc_base + assumption.wacc_delta)
        proj_cap_charge = proj_invested_cap * (proj_wacc / 100.0)
        
        # EVA
        proj_eva = proj_nopat - proj_cap_charge
        
        # Balance sheet projections
        proj_debt = max(0.0, baseline_debt + assumption.debt_delta)
        proj_equity = max(1_000_000.0, baseline_equity + (assumption.invested_capital_delta - assumption.debt_delta))
        
        # Net Profit (accounting for interest expense)
        approx_interest = proj_debt * 0.05 * (1.0 - tax_decimal)
        proj_net_profit = max(50_000.0, proj_nopat - approx_interest)
        
        # Ratios
        proj_roe = (proj_net_profit / proj_equity * 100.0) if proj_equity > 0 else 0.0
        proj_roic = (proj_nopat / proj_invested_cap * 100.0) if proj_invested_cap > 0 else 0.0
        total_proj_cap = proj_debt + proj_equity
        proj_debt_ratio = (proj_debt / total_proj_cap * 100.0) if total_proj_cap > 0 else 0.0
        proj_debt_to_equity = (proj_debt / proj_equity) if proj_equity > 0 else 0.0
        proj_spread = proj_roic - proj_wacc
        
        # Score Attribution
        score_breakdown = compute_score_breakdown(
            value_spread=proj_spread,
            roe=proj_roe,
            revenue_growth=assumption.rev_delta_pct,
            debt_to_equity=proj_debt_to_equity
        )
        
        eva_impact = proj_eva - baseline_eva
        
        return ScenarioSimulationResponse(
            scenario_name=assumption.name,
            scenario_type=assumption.scenario_type,
            description=assumption.description,
            rev_delta_pct=assumption.rev_delta_pct,
            margin_delta_pct=assumption.margin_delta_pct,
            debt_delta=assumption.debt_delta,
            invested_capital_delta=assumption.invested_capital_delta,
            wacc_delta=assumption.wacc_delta,
            projected_revenue=round(proj_rev, 2),
            projected_net_profit=round(proj_net_profit, 2),
            projected_eva=round(proj_eva, 2),
            projected_roe=round(proj_roe, 2),
            projected_roic=round(proj_roic, 2),
            projected_debt_ratio=round(proj_debt_ratio, 2),
            projected_score=score_breakdown.final_score,
            eva_impact=round(eva_impact, 2)
        )

    @staticmethod
    def compare_scenarios(
        db: Optional[Session],
        request: ScenarioCompareRequest,
        save_records: bool = False
    ) -> ScenarioCompareResponse:
        # Calculate baseline metrics
        baseline_input = FinancialEngineInput(
            revenue=request.revenue,
            operating_profit=request.operating_profit,
            net_profit=request.net_profit,
            tax_rate=request.tax_rate,
            total_debt=request.total_debt,
            shareholders_equity=request.shareholders_equity,
            invested_capital=request.invested_capital,
            wacc=request.wacc
        )
        baseline_out = FinancialEngine.calculate(baseline_input)
        
        results: List[ScenarioSimulationResponse] = []
        for assumption in request.scenarios:
            sim = ScenarioService.simulate_scenario(
                baseline_revenue=request.revenue,
                baseline_ebit=request.operating_profit,
                baseline_net_profit=request.net_profit,
                tax_rate=request.tax_rate,
                baseline_debt=request.total_debt,
                baseline_equity=request.shareholders_equity,
                baseline_invested_cap=request.invested_capital,
                baseline_wacc=request.wacc,
                baseline_eva=baseline_out.eva,
                assumption=assumption
            )
            
            # Save to database if company_id is provided and save_records is True
            if save_records and db and request.company_id:
                history_record = ScenarioHistory(
                    company_id=request.company_id,
                    scenario_name=sim.scenario_name,
                    scenario_type=sim.scenario_type,
                    description=sim.description,
                    rev_delta_pct=sim.rev_delta_pct,
                    margin_delta_pct=sim.margin_delta_pct,
                    debt_delta=sim.debt_delta,
                    invested_capital_delta=sim.invested_capital_delta,
                    wacc_delta=sim.wacc_delta,
                    projected_revenue=sim.projected_revenue,
                    projected_net_profit=sim.projected_net_profit,
                    projected_eva=sim.projected_eva,
                    projected_roe=sim.projected_roe,
                    projected_roic=sim.projected_roic,
                    projected_debt_ratio=sim.projected_debt_ratio,
                    projected_score=sim.projected_score,
                    eva_impact=sim.eva_impact
                )
                db.add(history_record)
                db.commit()
                db.refresh(history_record)
                sim.id = history_record.id
                sim.created_at = history_record.created_at
                
            results.append(sim)
            
        return ScenarioCompareResponse(
            baseline_eva=baseline_out.eva,
            baseline_roe=baseline_out.roe,
            baseline_roic=baseline_out.roic,
            baseline_debt_ratio=baseline_out.debt_ratio,
            baseline_score=baseline_out.shareholder_value_score,
            scenarios=results
        )

    @staticmethod
    def get_history_by_company(db: Session, company_id: int) -> List[ScenarioHistory]:
        return (
            db.query(ScenarioHistory)
            .filter(ScenarioHistory.company_id == company_id)
            .order_by(ScenarioHistory.created_at.desc())
            .all()
        )

    @staticmethod
    def delete_scenario(db: Session, scenario_id: int) -> bool:
        rec = db.query(ScenarioHistory).filter(ScenarioHistory.id == scenario_id).first()
        if rec:
            db.delete(rec)
            db.commit()
            return True
        return False
