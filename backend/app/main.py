from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api.routes import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup & shutdown events for the application.
    Initializes SQLite tables cleanly without fake or demo data.
    """
    # Initialize DB schema
    init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Production financial analysis API for VALORA AI. "
        "Provides deterministic valuation computations for Economic Value Added (EVA®), "
        "ROIC, ROE, ROI, Solvency, and composite Shareholder Value Creation Scoring."
    ),
    lifespan=lifespan
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API routes under /api/v1
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Root"])
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "documentation": "/docs",
        "health_check": f"{settings.API_V1_STR}/health"
    }
