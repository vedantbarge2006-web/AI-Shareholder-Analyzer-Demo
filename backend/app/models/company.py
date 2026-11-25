from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    ticker = Column(String(50), nullable=False, index=True)
    sector = Column(String(100), nullable=False)
    tagline = Column(String(255), nullable=True)
    currency = Column(String(10), default="USD", nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now(), nullable=False)

    # Relationships
    financial_records = relationship("FinancialRecord", back_populates="company", cascade="all, delete-orphan")
    analysis_records = relationship("AnalysisHistory", back_populates="company", cascade="all, delete-orphan")
    scenario_records = relationship("ScenarioHistory", back_populates="company", cascade="all, delete-orphan")
