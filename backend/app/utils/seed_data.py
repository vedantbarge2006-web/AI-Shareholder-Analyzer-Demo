from sqlalchemy.orm import Session
from app.models.company import Company
from app.models.financial_record import FinancialRecord
from app.models.analysis_history import AnalysisHistory
from app.schemas.financial import FinancialInputSchema
from app.services.analysis_service import AnalysisService

SAMPLE_COMPANIES = [
    {
        "name": "Apex Global Technologies Inc.",
        "ticker": "APEX",
        "sector": "Enterprise Software & Cloud",
        "tagline": "Enterprise SaaS & Cloud Infrastructure",
        "currency": "USD",
        "financials": {
            "fiscal_year": "FY 2024",
            "revenue": 142500000.0,
            "operating_profit": 33480000.0,
            "net_profit": 25110000.0,
            "tax_rate": 22.0,
            "total_debt": 38000000.0,
            "shareholders_equity": 122000000.0,
            "invested_capital": 136000000.0,
            "wacc": 8.4,
            "prev_revenue": 122800000.0,
            "prev_operating_profit": 27500000.0,
            "prev_net_profit": 20600000.0,
            "prev_total_debt": 42000000.0,
            "prev_invested_capital": 121000000.0,
            "prev_shareholders_equity": 104000000.0,
            "prev_wacc": 8.6,
        }
    },
    {
        "name": "Nexus Supply & Freight Corp.",
        "ticker": "NXSF",
        "sector": "Supply Chain & Logistics",
        "tagline": "Logistics & Multimodal Distribution",
        "currency": "USD",
        "financials": {
            "fiscal_year": "FY 2024",
            "revenue": 215000000.0,
            "operating_profit": 26800000.0,
            "net_profit": 17400000.0,
            "tax_rate": 24.0,
            "total_debt": 82000000.0,
            "shareholders_equity": 135000000.0,
            "invested_capital": 185000000.0,
            "wacc": 7.8,
            "prev_revenue": 198000000.0,
            "prev_operating_profit": 23200000.0,
            "prev_net_profit": 15100000.0,
            "prev_total_debt": 86000000.0,
            "prev_invested_capital": 174000000.0,
            "prev_shareholders_equity": 126000000.0,
            "prev_wacc": 7.9,
        }
    },
    {
        "name": "Titan Heavy Materials PLC",
        "ticker": "TTHM",
        "sector": "Industrial Manufacturing",
        "tagline": "Industrial Manufacturing & Extrusion",
        "currency": "USD",
        "financials": {
            "fiscal_year": "FY 2024",
            "revenue": 96000000.0,
            "operating_profit": 9800000.0,
            "net_profit": 4200000.0,
            "tax_rate": 25.0,
            "total_debt": 78000000.0,
            "shareholders_equity": 54000000.0,
            "invested_capital": 120000000.0,
            "wacc": 10.2,
            "prev_revenue": 104000000.0,
            "prev_operating_profit": 12400000.0,
            "prev_net_profit": 6800000.0,
            "prev_total_debt": 72000000.0,
            "prev_invested_capital": 126000000.0,
            "prev_shareholders_equity": 58000000.0,
            "prev_wacc": 9.8,
        }
    }
]

def seed_sample_companies(db: Session) -> None:
    """
    Seeds initial sample companies and baseline valuation records
    if the companies table is empty or does not have them.
    Ensures existing user-created records are preserved.
    """
    for item in SAMPLE_COMPANIES:
        existing = db.query(Company).filter(Company.name == item["name"]).first()
        if existing:
            continue
        
        # Create company
        company = Company(
            name=item["name"],
            ticker=item["ticker"],
            sector=item["sector"],
            tagline=item["tagline"],
            currency=item["currency"]
        )
        db.add(company)
        db.commit()
        db.refresh(company)

        # Run analysis service to calculate and store initial financial & analysis records
        fin = item["financials"]
        input_data = FinancialInputSchema(
            company_name=company.name,
            ticker=company.ticker,
            sector=company.sector,
            fiscal_year=fin["fiscal_year"],
            revenue=fin["revenue"],
            operating_profit=fin["operating_profit"],
            net_profit=fin["net_profit"],
            tax_rate=fin["tax_rate"],
            total_debt=fin["total_debt"],
            shareholders_equity=fin["shareholders_equity"],
            invested_capital=fin["invested_capital"],
            wacc=fin["wacc"],
            prev_revenue=fin["prev_revenue"],
            prev_operating_profit=fin["prev_operating_profit"],
            prev_net_profit=fin["prev_net_profit"],
            prev_total_debt=fin["prev_total_debt"],
            prev_invested_capital=fin["prev_invested_capital"],
            prev_shareholders_equity=fin["prev_shareholders_equity"],
            prev_wacc=fin["prev_wacc"],
        )
        AnalysisService.analyze_and_persist(db, input_data, save_record=True)
