from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    financial_record_id = Column(Integer, ForeignKey("financial_records.id", ondelete="SET NULL"), nullable=True)
    
    period = Column(String(50), nullable=False)
    
    # Valuation Metrics
    nopat = Column(Float, nullable=False)
    capital_charge = Column(Float, nullable=False)
    eva = Column(Float, nullable=False)
    is_value_creating = Column(Boolean, nullable=False)
    
    # Returns & Ratios
    roic = Column(Float, nullable=False)
    roi = Column(Float, nullable=False)
    roe = Column(Float, nullable=False)
    value_spread = Column(Float, nullable=False)
    debt_ratio = Column(Float, nullable=False)
    debt_to_equity = Column(Float, nullable=False)
    
    # Margins & Growth
    operating_margin = Column(Float, nullable=False)
    net_profit_margin = Column(Float, nullable=False)
    revenue_growth = Column(Float, nullable=True)
    profit_growth = Column(Float, nullable=True)
    
    # Scoring
    shareholder_value_score = Column(Integer, nullable=False)
    score_classification = Column(String(50), nullable=False)
    score_breakdown = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    company = relationship("Company", back_populates="analysis_records")
    financial_record = relationship("FinancialRecord", back_populates="analysis_records")
