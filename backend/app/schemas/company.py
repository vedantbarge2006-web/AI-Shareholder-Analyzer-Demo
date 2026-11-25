from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class CompanyBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, json_schema_extra={"example": "Apex Global Technologies"})
    ticker: str = Field(..., min_length=1, max_length=50, json_schema_extra={"example": "APEX"})
    sector: str = Field(..., min_length=2, max_length=100, json_schema_extra={"example": "Enterprise Software & Cloud"})
    tagline: Optional[str] = Field(None, max_length=255, json_schema_extra={"example": "Enterprise SaaS & Cloud Infrastructure"})
    currency: str = Field("USD", min_length=3, max_length=10, json_schema_extra={"example": "USD"})

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    ticker: Optional[str] = Field(None, min_length=1, max_length=50)
    sector: Optional[str] = Field(None, min_length=2, max_length=100)
    tagline: Optional[str] = None
    currency: Optional[str] = None

class CompanyResponse(CompanyBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
