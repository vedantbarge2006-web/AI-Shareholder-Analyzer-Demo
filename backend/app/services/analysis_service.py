from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.company import Company
from app.models.financial_record import FinancialRecord
from app.models.analysis_history import AnalysisHistory
from app.schemas.financial import FinancialInputSchema, ValueAnalysisOutputSchema, ScoreBreakdownSchema
from app.services.financial_engine import FinancialEngine, FinancialEngineInput

class AnalysisService:
    @staticmethod
    def calculate_metrics_pure(inp: FinancialInputSchema) -> ValueAnalysisOutputSchema:
        """Runs the financial engine without saving to the database."""
        engine_input = FinancialEngineInput(
            revenue=inp.revenue,
            operating_profit=inp.operating_profit,
            net_profit=inp.net_profit,
            tax_rate=inp.tax_rate,
            total_debt=inp.total_debt,
            shareholders_equity=inp.shareholders_equity,
            invested_capital=inp.invested_capital,
            wacc=inp.wacc,
            prev_revenue=inp.prev_revenue,
            prev_operating_profit=inp.prev_operating_profit,
            prev_net_profit=inp.prev_net_profit,
            prev_total_debt=inp.prev_total_debt,
            prev_shareholders_equity=inp.prev_shareholders_equity,
            prev_invested_capital=inp.prev_invested_capital,
            prev_wacc=inp.prev_wacc,
        )
        out = FinancialEngine.calculate(engine_input)
        
        breakdown_schema = ScoreBreakdownSchema(
            base_score=out.score_attribution.base_score,
            value_spread_points=out.score_attribution.value_spread_points,
            roe_points=out.score_attribution.roe_points,
            growth_points=out.score_attribution.growth_points,
            solvency_points=out.score_attribution.solvency_points,
            final_score=out.score_attribution.final_score,
            classification=out.score_attribution.classification,
            interpretation=out.score_attribution.interpretation,
        )
        
        return ValueAnalysisOutputSchema(
            company_name=inp.company_name,
            fiscal_year=inp.fiscal_year or "FY 2024",
            nopat=out.nopat,
            capital_charge=out.capital_charge,
            eva=out.eva,
            is_value_creating=out.is_value_creating,
            roic=out.roic,
            roi=out.roi,
            roe=out.roe,
            value_spread=out.value_spread,
            total_capital=out.total_capital,
            debt_to_equity=out.debt_to_equity,
            debt_ratio=out.debt_ratio,
            debt_ratio_change=out.debt_ratio_change,
            operating_margin=out.operating_margin,
            net_profit_margin=out.net_profit_margin,
            revenue_growth=out.revenue_growth,
            profit_growth=out.profit_growth,
            eva_growth=out.eva_growth,
            shareholder_value_score=out.shareholder_value_score,
            score_classification=out.score_classification,
            score_breakdown=breakdown_schema,
            prev_nopat=out.prev_nopat,
            prev_capital_charge=out.prev_capital_charge,
            prev_eva=out.prev_eva,
            prev_roic=out.prev_roic,
            prev_roi=out.prev_roi,
            prev_roe=out.prev_roe,
            prev_debt_ratio=out.prev_debt_ratio,
            prev_value_spread=out.prev_value_spread,
            prev_score=out.prev_score,
        )

    @staticmethod
    def analyze_and_persist(db: Session, inp: FinancialInputSchema, save_record: bool = True) -> ValueAnalysisOutputSchema:
        """
        Calculates valuation metrics and persists Company, FinancialRecord, and AnalysisHistory.
        """
        result = AnalysisService.calculate_metrics_pure(inp)
        
        if not save_record:
            return result

        # 1. Find or create company
        company = db.query(Company).filter(Company.name == inp.company_name).first()
        if not company:
            company = Company(
                name=inp.company_name,
                ticker=inp.ticker or "CUST",
                sector=inp.sector or "Corporate",
                currency="USD"
            )
            db.add(company)
            db.flush()

        # 2. Add financial record
        fiscal_year = inp.fiscal_year or "FY 2024"
        fin_record = FinancialRecord(
            company_id=company.id,
            fiscal_year=fiscal_year,
            revenue=inp.revenue,
            operating_profit=inp.operating_profit,
            net_profit=inp.net_profit,
            tax_rate=inp.tax_rate,
            total_debt=inp.total_debt,
            shareholders_equity=inp.shareholders_equity,
            invested_capital=inp.invested_capital,
            wacc=inp.wacc,
            prev_revenue=inp.prev_revenue,
            prev_operating_profit=inp.prev_operating_profit,
            prev_net_profit=inp.prev_net_profit,
            prev_total_debt=inp.prev_total_debt,
            prev_invested_capital=inp.prev_invested_capital,
            prev_shareholders_equity=inp.prev_shareholders_equity,
            prev_wacc=inp.prev_wacc,
        )
        db.add(fin_record)
        db.flush()

        # 3. Add analysis history record
        analysis_record = AnalysisHistory(
            company_id=company.id,
            financial_record_id=fin_record.id,
            period=fiscal_year,
            nopat=result.nopat,
            capital_charge=result.capital_charge,
            eva=result.eva,
            is_value_creating=result.is_value_creating,
            roic=result.roic,
            roi=result.roi,
            roe=result.roe,
            value_spread=result.value_spread,
            debt_ratio=result.debt_ratio,
            debt_to_equity=result.debt_to_equity,
            operating_margin=result.operating_margin,
            net_profit_margin=result.net_profit_margin,
            revenue_growth=result.revenue_growth,
            profit_growth=result.profit_growth,
            shareholder_value_score=result.shareholder_value_score,
            score_classification=result.score_classification,
            score_breakdown=result.score_breakdown.model_dump(),
        )
        db.add(analysis_record)
        db.commit()
        db.refresh(analysis_record)

        return result

    @staticmethod
    def get_history_by_company(db: Session, company_id: int) -> List[AnalysisHistory]:
        return (
            db.query(AnalysisHistory)
            .filter(AnalysisHistory.company_id == company_id)
            .order_by(AnalysisHistory.created_at.desc())
            .all()
        )

    @staticmethod
    def get_analysis_by_id(db: Session, analysis_id: int) -> Optional[AnalysisHistory]:
        return db.query(AnalysisHistory).filter(AnalysisHistory.id == analysis_id).first()
