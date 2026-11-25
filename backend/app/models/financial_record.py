from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class FinancialRecord(Base):
    __tablename__ = "financial_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    fiscal_year = Column(String(50), nullable=False)
    
    # Financial Statement Inputs
    revenue = Column(Float, nullable=False)
    operating_profit = Column(Float, nullable=False)  # EBIT
    net_profit = Column(Float, nullable=False)
    tax_rate = Column(Float, nullable=False)          # in % (e.g. 22.0)
    total_debt = Column(Float, nullable=False)
    shareholders_equity = Column(Float, nullable=False)
    invested_capital = Column(Float, nullable=False)
    wacc = Column(Float, nullable=False)              # in % (e.g. 8.4)
    
    # Prior Year Comparison Figures
    prev_revenue = Column(Float, nullable=True)
    prev_operating_profit = Column(Float, nullable=True)
    prev_net_profit = Column(Float, nullable=True)
    prev_total_debt = Column(Float, nullable=True)
    prev_shareholders_equity = Column(Float, nullable=True)
    prev_invested_capital = Column(Float, nullable=True)
    prev_wacc = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    company = relationship("Company", back_populates="financial_records")
    analysis_records = relationship("AnalysisHistory", back_populates="financial_record", cascade="all, delete-orphan")
