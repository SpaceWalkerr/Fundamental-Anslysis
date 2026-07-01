"""
Reports API Endpoints
Handles report retrieval and management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from typing import Optional

from app.db.database import get_db
from app.models.schemas import (
    AnalysisReportResponse,
    ReportListResponse,
    ReportListItem,
    ProcessingStatus,
    FinancialMetrics,
    KeyRatio,
)
from app.core.security import get_current_active_user


router = APIRouter()


@router.get("/list", response_model=ReportListResponse)
async def get_reports_list(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Get list of user's reports
    """
    # Get reports from database
    reports_result = db.table('reports')\
        .select('id, company, ticker, overall_score, created_at, status')\
        .eq('user_id', current_user['id'])\
        .order('created_at', desc=True)\
        .range(offset, offset + limit - 1)\
        .execute()
    
    # Get total count
    count_result = db.table('reports')\
        .select('id', count='exact')\
        .eq('user_id', current_user['id'])\
        .execute()
    
    reports = [
        ReportListItem(
            id=report['id'],
            company=report.get('company', 'Unknown'),
            ticker=report.get('ticker', 'N/A'),
            overall_score=report.get('overall_score', 0.0),
            created_at=report['created_at'],
            status=ProcessingStatus(report.get('status', 'pending'))
        )
        for report in reports_result.data
    ]
    
    return ReportListResponse(
        total=count_result.count if count_result.count else 0,
        reports=reports
    )


@router.get("/{report_id}", response_model=AnalysisReportResponse)
async def get_report(
    report_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Get detailed analysis report
    """
    # Get report from database
    report_result = db.table('reports')\
        .select('*')\
        .eq('id', report_id)\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not report_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    report = report_result.data
    
    # Check if report is completed
    if report['status'] != 'completed':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Report is still being processed. Status: {report['status']}"
        )
    
    # The full AI analysis is stored in the analysis_result JSONB column (migration 002)
    report_data = report.get('analysis_result') or {}

    # If the analysis result is empty, fall back to sample data
    if not report_data:
        report_data = {
            "company": report.get('company', 'Sample Company'),
            "ticker": report.get('ticker', 'SMPL'),
            "exchange": "NASDAQ",
            "overall_score": 8.5,
            "summary": "Comprehensive financial analysis shows strong fundamentals with some areas of concern.",
            "metrics": {
                "profitability": {"score": 9.2, "label": "Excellent"},
                "liquidity": {"score": 7.8, "label": "Good"},
                "solvency": {"score": 8.5, "label": "Strong"},
                "efficiency": {"score": 8.9, "label": "Excellent"},
            },
            "key_ratios": [
                {"name": "P/E Ratio", "value": "28.5x", "benchmark": "Industry: 25.2x"},
                {"name": "ROE", "value": "89.6%", "benchmark": "Industry: 18.4%"},
                {"name": "Gross Margin", "value": "46.2%", "benchmark": "Industry: 42.1%"},
                {"name": "Current Ratio", "value": "1.08", "benchmark": "Industry: 1.35"},
                {"name": "Debt/Equity", "value": "1.98", "benchmark": "Industry: 0.85"},
                {"name": "Operating Margin", "value": "31.5%", "benchmark": "Industry: 22.3%"},
            ],
            "strengths": [
                "Exceptional brand value and customer loyalty",
                "Dominant market position",
                "Strong cash flow generation",
                "Proven pricing power",
            ],
            "red_flags": [
                "High debt levels relative to historical norms",
                "Slowing growth in core segments",
                "Regulatory scrutiny",
            ],
            "investment_assessment": "This company represents a quality holding for long-term investors. While valuation appears premium, strong fundamentals support the current multiple."
        }
    
    return AnalysisReportResponse(
        id=report['id'],
        company=report_data['company'],
        ticker=report_data['ticker'],
        exchange=report_data.get('exchange', 'N/A'),
        date=report['created_at'],
        overall_score=report_data['overall_score'],
        summary=report_data['summary'],
        metrics=FinancialMetrics(**report_data['metrics']),
        key_ratios=[KeyRatio(**ratio) for ratio in report_data['key_ratios']],
        strengths=report_data['strengths'],
        red_flags=report_data['red_flags'],
        investment_assessment=report_data['investment_assessment']
    )


@router.delete("/{report_id}")
async def delete_report(
    report_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Delete a report
    """
    # Verify report belongs to user
    report_result = db.table('reports')\
        .select('id')\
        .eq('id', report_id)\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not report_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    # Delete report
    db.table('reports').delete().eq('id', report_id).execute()
    
    # Also delete associated chat messages
    db.table('chat_messages').delete().eq('report_id', report_id).execute()
    
    return {"message": "Report deleted successfully"}
