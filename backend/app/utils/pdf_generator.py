"""
PDF Generation Service
Generates professional PDF reports from HTML templates
Uses WeasyPrint for HTML-to-PDF conversion
"""

from jinja2 import Environment, FileSystemLoader
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path
import os
import base64

from ..core.config import settings


def _load_weasyprint_html():
    """
    Lazily import WeasyPrint's HTML class.

    WeasyPrint depends on native libraries (pango, cairo, gdk-pixbuf). Importing
    it at module load would crash the entire API on startup if those libraries
    are missing. Loading it here means PDF export degrades to a clean error while
    every other endpoint keeps working.
    """
    try:
        from weasyprint import HTML
        return HTML
    except Exception as exc:  # ImportError, or OSError from missing system libs
        raise RuntimeError(
            "PDF generation is unavailable: WeasyPrint and its system libraries "
            "(pango, cairo, gdk-pixbuf) are not installed on this server. "
            f"Original error: {exc}"
        )


class PDFGenerator:
    """Service for generating PDF reports from templates"""
    
    def __init__(self):
        # Set up Jinja2 template environment
        template_dir = Path(__file__).parent.parent / "templates" / "pdf"
        self.env = Environment(loader=FileSystemLoader(str(template_dir)))
        
        # Create output directory
        self.output_dir = Path(settings.UPLOAD_DIR) / "pdfs"
        os.makedirs(self.output_dir, exist_ok=True)
    
    # =========================================================================
    # CORE PDF GENERATION
    # =========================================================================
    
    def _render_template(self, template_name: str, context: Dict[str, Any]) -> str:
        """
        Render Jinja2 template with context data
        
        Args:
            template_name: Name of template file
            context: Data to pass to template
            
        Returns:
            Rendered HTML string
        """
        template = self.env.get_template(template_name)
        
        # Add common context variables
        context.update({
            "generated_at": datetime.now().strftime("%B %d, %Y at %I:%M %p"),
            "app_name": settings.APP_NAME,
            "current_year": datetime.now().year
        })
        
        return template.render(**context)
    
    def _generate_pdf(
        self, 
        html_content: str, 
        output_filename: str,
        save_file: bool = True
    ) -> bytes:
        """
        Convert HTML to PDF using WeasyPrint
        
        Args:
            html_content: Rendered HTML string
            output_filename: Name for output file
            save_file: Whether to save to disk
            
        Returns:
            PDF bytes
        """
        # Generate PDF from HTML (WeasyPrint loaded lazily; see _load_weasyprint_html)
        HTML = _load_weasyprint_html()
        pdf_bytes = HTML(string=html_content).write_pdf()
        
        # Optionally save to disk
        if save_file:
            output_path = self.output_dir / output_filename
            with open(output_path, 'wb') as f:
                f.write(pdf_bytes)
        
        return pdf_bytes
    
    # =========================================================================
    # ANALYSIS REPORT PDF
    # =========================================================================
    
    def generate_analysis_report(
        self, 
        analysis_data: Dict[str, Any],
        save_file: bool = False
    ) -> bytes:
        """
        Generate PDF for a fundamental analysis report
        
        Args:
            analysis_data: Analysis results including metrics, valuation, etc.
            save_file: Whether to save PDF to disk
            
        Returns:
            PDF bytes
        """
        # Prepare context data
        context = {
            "ticker": analysis_data.get("ticker", "Unknown"),
            "company_name": analysis_data.get("company_name", "Unknown Company"),
            "current_price": analysis_data.get("current_price", 0),
            "recommendation": analysis_data.get("recommendation", "HOLD"),
            "score": analysis_data.get("score", 50),
            
            # Financial Metrics
            "metrics": analysis_data.get("metrics", {}),
            
            # Valuation
            "valuation": analysis_data.get("valuation", {}),
            
            # Strengths & Weaknesses
            "strengths": analysis_data.get("strengths", []),
            "weaknesses": analysis_data.get("weaknesses", []),
            
            # AI Analysis
            "ai_summary": analysis_data.get("ai_summary", ""),
            "ai_recommendation": analysis_data.get("ai_recommendation", ""),
            
            # Risk Assessment
            "risk_level": analysis_data.get("risk_level", "Medium"),
            "risk_factors": analysis_data.get("risk_factors", [])
        }
        
        # Render HTML template
        html = self._render_template("analysis_report.html", context)
        
        # Generate PDF
        filename = f"analysis_{context['ticker']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return self._generate_pdf(html, filename, save_file)
    
    # =========================================================================
    # SCREENING RESULTS PDF
    # =========================================================================
    
    def generate_screening_report(
        self,
        screening_data: Dict[str, Any],
        save_file: bool = False
    ) -> bytes:
        """
        Generate PDF for stock screening results
        
        Args:
            screening_data: Screening results with matched stocks
            save_file: Whether to save PDF to disk
            
        Returns:
            PDF bytes
        """
        # Prepare context
        context = {
            "preset_name": screening_data.get("preset_name", "Custom Screen"),
            "description": screening_data.get("description", ""),
            "total_matches": screening_data.get("total_matches", 0),
            "filters_applied": screening_data.get("filters", []),
            
            # Matched stocks
            "stocks": screening_data.get("stocks", []),
            
            # Summary statistics
            "average_score": screening_data.get("average_score", 0),
            "top_sectors": screening_data.get("top_sectors", []),
        }
        
        # Render template
        html = self._render_template("screening_report.html", context)
        
        # Generate PDF
        filename = f"screening_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return self._generate_pdf(html, filename, save_file)
    
    # =========================================================================
    # TECHNICAL ANALYSIS PDF
    # =========================================================================
    
    def generate_technical_report(
        self,
        technical_data: Dict[str, Any],
        save_file: bool = False
    ) -> bytes:
        """
        Generate PDF for technical analysis report
        
        Args:
            technical_data: Technical indicators and signals
            save_file: Whether to save PDF to disk
            
        Returns:
            PDF bytes
        """
        # Prepare context
        context = {
            "ticker": technical_data.get("ticker", "Unknown"),
            "current_price": technical_data.get("current_price", 0),
            
            # Overall signal
            "overall_signal": technical_data.get("overall_signal", "NEUTRAL"),
            "signal_strength": technical_data.get("signal_strength", 50),
            
            # Indicators
            "indicators": technical_data.get("indicators", {}),
            
            # Buy/Sell signals
            "buy_signals": technical_data.get("buy_signals", []),
            "sell_signals": technical_data.get("sell_signals", []),
            
            # Period
            "period": technical_data.get("period", "1y")
        }
        
        # Render template
        html = self._render_template("technical_report.html", context)
        
        # Generate PDF
        filename = f"technical_{context['ticker']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return self._generate_pdf(html, filename, save_file)
    
    # =========================================================================
    # WATCHLIST PDF
    # =========================================================================
    
    def generate_watchlist_report(
        self,
        watchlist_data: Dict[str, Any],
        save_file: bool = False
    ) -> bytes:
        """
        Generate PDF summary of user's watchlist
        
        Args:
            watchlist_data: Watchlist stocks with metrics
            save_file: Whether to save PDF to disk
            
        Returns:
            PDF bytes
        """
        # Prepare context
        context = {
            "watchlist_name": watchlist_data.get("name", "My Watchlist"),
            "total_stocks": watchlist_data.get("total_stocks", 0),
            "stocks": watchlist_data.get("stocks", []),
            
            # Portfolio-level metrics
            "total_value": watchlist_data.get("total_value", 0),
            "average_performance": watchlist_data.get("average_performance", 0),
            "best_performer": watchlist_data.get("best_performer", {}),
            "worst_performer": watchlist_data.get("worst_performer", {})
        }
        
        # Render template
        html = self._render_template("watchlist_report.html", context)
        
        # Generate PDF
        filename = f"watchlist_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return self._generate_pdf(html, filename, save_file)
    
    # =========================================================================
    # COMPARISON REPORT PDF
    # =========================================================================
    
    def generate_comparison_report(
        self,
        comparison_data: Dict[str, Any],
        save_file: bool = False
    ) -> bytes:
        """
        Generate PDF comparing multiple stocks
        
        Args:
            comparison_data: Data for stocks being compared
            save_file: Whether to save PDF to disk
            
        Returns:
            PDF bytes
        """
        # Prepare context
        context = {
            "stocks": comparison_data.get("stocks", []),
            "comparison_metrics": comparison_data.get("metrics", []),
            "winner": comparison_data.get("winner", {}),
            "summary": comparison_data.get("summary", "")
        }
        
        # Render template
        html = self._render_template("comparison_report.html", context)
        
        # Generate PDF
        tickers = "_vs_".join([s.get("ticker", "") for s in context["stocks"][:3]])
        filename = f"comparison_{tickers}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return self._generate_pdf(html, filename, save_file)
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    def cleanup_old_pdfs(self, days: int = 7) -> int:
        """
        Delete PDF files older than specified days
        
        Args:
            days: Number of days to keep files
            
        Returns:
            Number of files deleted
        """
        deleted = 0
        cutoff_time = datetime.now().timestamp() - (days * 24 * 60 * 60)
        
        for pdf_file in self.output_dir.glob("*.pdf"):
            if pdf_file.stat().st_mtime < cutoff_time:
                pdf_file.unlink()
                deleted += 1
        
        return deleted
    
    def get_pdf_size(self, pdf_bytes: bytes) -> str:
        """
        Get human-readable size of PDF
        
        Args:
            pdf_bytes: PDF content
            
        Returns:
            Size string (e.g., "1.2 MB")
        """
        size_bytes = len(pdf_bytes)
        
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB"
        else:
            return f"{size_bytes / (1024 * 1024):.1f} MB"


# ============================================================================
# FACTORY FUNCTION
# ============================================================================

_pdf_generator: Optional[PDFGenerator] = None

def get_pdf_generator() -> PDFGenerator:
    """Get singleton PDFGenerator instance"""
    global _pdf_generator
    if _pdf_generator is None:
        _pdf_generator = PDFGenerator()
    return _pdf_generator
