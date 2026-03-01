"""
PDF Export API Endpoints
Generate and download PDF reports for analysis, screening, and technical analysis
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from typing import Optional
from pydantic import BaseModel

from app.core.security import get_current_user
from app.db.database import get_db
from app.utils.pdf_generator import PDFGenerator, get_pdf_generator
from app.utils.feature_gates import require_pdf_export, check_pdf_limit
from supabase import Client

router = APIRouter()

# ============================================================================
# REQUEST MODELS
# ============================================================================

class ExportAnalysisRequest(BaseModel):
    ticker: str
    analysis_data: dict  # Full analysis response

class ExportScreeningRequest(BaseModel):
    preset_name: str
    description: Optional[str] = None
    stocks: list
    filters: Optional[list] = None
    total_matches: int
    average_score: Optional[float] = None
    top_sectors: Optional[list] = None

class ExportTechnicalRequest(BaseModel):
    ticker: str
    technical_data: dict  # Full technical analysis response

# ============================================================================
# EXPORT ENDPOINTS
# ============================================================================

@router.post("/export/analysis")
async def export_analysis_pdf(
    request: ExportAnalysisRequest,
    current_user: dict = Depends(require_pdf_export),  # Premium only
    supabase: Client = Depends(get_db),
    pdf_generator: PDFGenerator = Depends(get_pdf_generator)
):
    """
    Export fundamental analysis report as PDF
    
    Premium Feature - Requires enable_pdf_export
    Checks and increments pdf_exports usage counter
    
    Returns PDF file for download
    """
    # Check usage limit (decorator already checks, but we need to increment)
    user_with_usage = await check_pdf_limit(current_user, supabase)
    
    try:
        # Generate PDF
        pdf_bytes = pdf_generator.generate_analysis_report(
            analysis_data=request.analysis_data,
            save_file=False
        )
        
        # Return PDF as downloadable file
        filename = f"analysis_{request.ticker}_{current_user['id'][:8]}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\"",
                "Content-Length": str(len(pdf_bytes))
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


@router.post("/export/screening")
async def export_screening_pdf(
    request: ExportScreeningRequest,
    current_user: dict = Depends(require_pdf_export),
    supabase: Client = Depends(get_db),
    pdf_generator: PDFGenerator = Depends(get_pdf_generator)
):
    """
    Export stock screening results as PDF
    
    Premium Feature - Requires enable_pdf_export
    """
    # Check usage limit
    user_with_usage = await check_pdf_limit(current_user, supabase)
    
    try:
        # Prepare screening data
        screening_data = {
            "preset_name": request.preset_name,
            "description": request.description,
            "total_matches": request.total_matches,
            "stocks": request.stocks,
            "filters": request.filters or [],
            "average_score": request.average_score,
            "top_sectors": request.top_sectors or []
        }
        
        # Generate PDF
        pdf_bytes = pdf_generator.generate_screening_report(
            screening_data=screening_data,
            save_file=False
        )
        
        # Return PDF
        filename = f"screening_{request.preset_name.replace(' ', '_')}_{current_user['id'][:8]}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\"",
                "Content-Length": str(len(pdf_bytes))
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


@router.post("/export/technical")
async def export_technical_pdf(
    request: ExportTechnicalRequest,
    current_user: dict = Depends(require_pdf_export),
   supabase: Client = Depends(get_db),
    pdf_generator: PDFGenerator = Depends(get_pdf_generator)
):
    """
    Export technical analysis report as PDF
    
    Premium Feature - Requires enable_pdf_export
    """
    # Check usage limit
    user_with_usage = await check_pdf_limit(current_user, supabase)
    
    try:
        # Generate PDF
        pdf_bytes = pdf_generator.generate_technical_report(
            technical_data=request.technical_data,
            save_file=False
        )
        
        # Return PDF
        filename = f"technical_{request.ticker}_{current_user['id'][:8]}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\"",
                "Content-Length": str(len(pdf_bytes))
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


@router.get("/export/analysis/{ticker}")
async def export_analysis_by_ticker(
    ticker: str,
    current_user: dict = Depends(require_pdf_export),
    supabase: Client = Depends(get_db),
    pdf_generator: PDFGenerator = Depends(get_pdf_generator)
):
    """
    Generate and export analysis PDF directly from ticker
    
    Convenience endpoint that fetches latest analysis and exports as PDF
    Premium Feature - Requires enable_pdf_export
    """
    # Check usage limit
    user_with_usage = await check_pdf_limit(current_user, supabase)
    
    try:
        # Fetch latest analysis for this ticker
        analysis_result = supabase.table("analysis_reports").select(
            "*"
        ).eq("ticker", ticker.upper()).eq(
            "user_id", current_user["id"]
        ).order("created_at", desc=True).limit(1).execute()
        
        if not analysis_result.data:
            raise HTTPException(
                status_code=404,
                detail=f"No analysis found for {ticker}. Please run analysis first."
            )
        
        analysis = analysis_result.data[0]
        
        # Prepare analysis data for PDF
        analysis_data = {
            "ticker": analysis["ticker"],
            "company_name": analysis.get("company_name", ""),
            "current_price": analysis.get("current_price", 0),
            "recommendation": analysis.get("recommendation", "HOLD"),
            "score": analysis.get("overall_score", 50),
            "metrics": analysis.get("metrics", {}),
            "valuation": analysis.get("valuation", {}),
            "strengths": analysis.get("strengths", []),
            "weaknesses": analysis.get("weaknesses", []),
            "ai_summary": analysis.get("ai_summary", ""),
            "ai_recommendation": analysis.get("ai_insights", ""),
            "risk_level": analysis.get("risk_level", "Medium"),
            "risk_factors": analysis.get("risk_factors", [])
        }
        
        # Generate PDF
        pdf_bytes = pdf_generator.generate_analysis_report(
            analysis_data=analysis_data,
            save_file=False
        )
        
        # Return PDF
        filename = f"analysis_{ticker}_{current_user['id'][:8]}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\"",
                "Content-Length": str(len(pdf_bytes))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


@router.get("/export/technical/{ticker}")
async def export_technical_by_ticker(
    ticker: str,
    period: str = "1y",
    current_user: dict = Depends(require_pdf_export),
    supabase: Client = Depends(get_db),
    pdf_generator: PDFGenerator = Depends(get_pdf_generator)
):
    """
    Generate and export technical analysis PDF directly from ticker
    
    Convenience endpoint that fetches technical indicators and exports as PDF
    Premium Feature - Requires enable_pdf_export
    """
    # Check usage limit
    user_with_usage = await check_pdf_limit(current_user, supabase)
    
    try:
        # Import technical indicators here to avoid circular imports
        from .technicals import get_technical_indicators
        
        # Fetch technical indicators
        technical_data = await get_technical_indicators(
            ticker=ticker,
            period=period,
            include_signals=True,
            current_user=current_user,
            supabase=supabase
        )
        
        # Add ticker to data
        technical_data["ticker"] = ticker
        technical_data["period"] = period
        
        # Generate PDF
        pdf_bytes = pdf_generator.generate_technical_report(
            technical_data=technical_data,
            save_file=False
        )
        
        # Return PDF
        filename = f"technical_{ticker}_{current_user['id'][:8]}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\"",
                "Content-Length": str(len(pdf_bytes))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


# ============================================================================
# PDF INFO & UTILITIES
# ============================================================================

@router.get("/export/info")
async def get_export_info(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Get information about PDF export feature and user's usage
    """
    from app.utils.stripe_service import get_stripe_service
    
    stripe_service = get_stripe_service(supabase)
    
    # Check feature access
    has_access = await stripe_service.check_feature_access(
        user_id=current_user["id"],
        feature_name="pdf_export"
    )
    
    # Check usage
    usage = await stripe_service.check_usage_limit(
        user_id=current_user["id"],
        limit_type="pdf_exports"
    )
    
    return {
        "has_access": has_access,
        "usage": usage,
        "supported_formats": ["analysis", "screening", "technical", "watchlist", "comparison"],
        "max_file_size": "10 MB",
        "format": "PDF (A4, portrait)"
    }


@router.get("/export/health")
async def export_health_check():
    """
    Health check for PDF export service
    """
    try:
        pdf_generator = get_pdf_generator()
        
        # Test PDF generation with minimal data
        test_data = {
            "ticker": "TEST",
            "company_name": "Test Company",
            "current_price": 100.0,
            "recommendation": "HOLD",
            "score": 50,
            "metrics": {},
            "valuation": {},
            "strengths": [],
            "weaknesses": [],
            "ai_summary": "",
            "risk_level": "Medium",
            "risk_factors": []
        }
        
        pdf_bytes = pdf_generator.generate_analysis_report(test_data, save_file=False)
        
        return {
            "status": "healthy",
            "pdf_generator": "operational",
            "template_system": "jinja2",
            "pdf_engine": "weasyprint",
            "test_pdf_size": pdf_generator.get_pdf_size(pdf_bytes)
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
