from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class ScenarioHistory(Base):
    __tablename__ = "scenario_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    
    scenario_name = Column(String(255), nullable=False)
    scenario_type = Column(String(50), nullable=False)  # 'reinvest', 'debt_repayment', 'dividend', 'custom'
    description = Column(String(500), nullable=True)
    
    # Assumptions
    rev_delta_pct = Column(Float, nullable=False)
    margin_delta_pct = Column(Float, nullable=False)
    debt_delta = Column(Float, nullable=False)
    invested_capital_delta = Column(Float, nullable=False)
    wacc_delta = Column(Float, nullable=False)
    
    # Projections
    projected_revenue = Column(Float, nullable=False)
    projected_net_profit = Column(Float, nullable=False)
    projected_eva = Column(Float, nullable=False)
    projected_roe = Column(Float, nullable=False)
    projected_roic = Column(Float, nullable=False)
    projected_debt_ratio = Column(Float, nullable=False)
    projected_score = Column(Integer, nullable=False)
    eva_impact = Column(Float, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    company = relationship("Company", back_populates="scenario_records")
