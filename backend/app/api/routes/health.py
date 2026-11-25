from fastapi import APIRouter
from app.core.database import check_db_health
from app.core.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
def get_health():
    """
    Returns API health status, version, and database connectivity.
    """
    db_ok = check_db_health()
    return {
        "status": "healthy" if db_ok else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database_connected": db_ok,
    }
