"""
Dashboard API endpoints.
"""
from fastapi import APIRouter
from app.schemas.dashboard import DashboardStats, RiskDistribution
from app.services.dashboard_service import dashboard_service

router = APIRouter()


@router.get(
    "/stats",
    response_model=DashboardStats,
    summary="Get dashboard statistics",
    description="Get comprehensive statistics for the main dashboard including cases, AI metrics, and risk distribution"
)
async def get_dashboard_stats():
    """
    Get comprehensive dashboard statistics calculated from real case and document data.

    Returns:
        DashboardStats: Complete dashboard statistics including:
        - Total cases and monthly count
        - Status breakdown (in review, approved, escalated)
        - HITL and rejection counts
        - Average completion time
        - AI classification accuracy
        - Screening false positive rate
        - Risk distribution
    """
    return await dashboard_service.get_dashboard_stats()
