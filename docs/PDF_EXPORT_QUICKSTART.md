# PDF Export System - Quick Start Guide

## Overview

The PDF Export system allows premium users to download professional PDF reports for fundamental analysis, stock screening results, and technical analysis. Reports are generated using WeasyPrint (HTML to PDF) and Jinja2 templates.

## Features

✅ **Analysis Reports** - Comprehensive fundamental analysis with metrics, valuation, strengths/weaknesses, AI insights  
✅ **Screening Reports** - Stock screening results with matched stocks table, filters, and sector breakdown  
✅ **Technical Reports** - Technical analysis with indicators (RSI, MACD, SMA, Bollinger Bands, Stochastic)  
✅ **Premium Feature** - Protected by subscription feature gates and usage limits  
✅ **Professional Design** - Modern, color-coded templates with inline CSS styling  
✅ **Automatic Cleanup** - Old PDFs deleted after 7 days to save disk space  

---

## Installation

### 1. Install Python Dependencies

```bash
cd backend
source venv/bin/activate
pip install weasyprint jinja2
```

### 2. Install System Dependencies (macOS)

WeasyPrint requires system libraries for rendering:

```bash
brew install cairo pango gdk-pixbuf libffi
```

**For Linux (Ubuntu/Debian):**
```bash
sudo apt-get install libcairo2-dev libpango1.0-dev libgdk-pixbuf2.0-dev
```

### 3. Verify Installation

```bash
python -c "import weasyprint; print('WeasyPrint installed successfully!')"
```

### 4. Test PDF Generation

Start the backend server and visit:
```
GET http://localhost:8000/api/pdf/export/health
```

Expected response:
```json
{
  "status": "healthy",
  "pdf_generator": "operational",
  "template_system": "jinja2",
  "pdf_engine": "weasyprint",
  "test_pdf_size": "X KB"
}
```

---

## API Endpoints

### 📄 Export Analysis Report

**POST** `/api/pdf/export/analysis`

Export fundamental analysis as PDF.

**Request Body:**
```json
{
  "ticker": "AAPL",
  "analysis_data": {
    "ticker": "AAPL",
    "company_name": "Apple Inc.",
    "current_price": 175.50,
    "recommendation": "BUY",
    "score": 85,
    "metrics": {
      "pe_ratio": 28.5,
      "eps": 6.15,
      "market_cap": "2.8T",
      "revenue_growth": 2.8,
      "profit_margin": 25.3,
      "roe": 89.6
    },
    "valuation": {
      "fair_value": 185.0,
      "upside_potential": 5.4,
      "valuation_rating": "Fair Value"
    },
    "strengths": ["Strong ecosystem", "High margins"],
    "weaknesses": ["High debt", "Slowing growth"],
    "ai_summary": "Apple demonstrates strong fundamentals...",
    "ai_recommendation": "Suitable for long-term investors...",
    "risk_level": "Medium",
    "risk_factors": ["Regulatory risk", "China exposure"]
  }
}
```

**Response:** PDF file download

**Convenience Endpoint:**  
`GET /api/pdf/export/analysis/{ticker}` - Fetches latest analysis from DB and exports

---

### 📊 Export Screening Report

**POST** `/api/pdf/export/screening`

Export stock screening results as PDF.

**Request Body:**
```json
{
  "preset_name": "Tech Growth Stocks",
  "description": "High-growth technology companies",
  "total_matches": 5,
  "stocks": [
    {
      "ticker": "MSFT",
      "name": "Microsoft Corporation",
      "price": 415.25,
      "market_cap": "3.1T",
      "pe_ratio": 28.5,
      "score": 95
    }
  ],
  "filters": [
    {"field": "Sector", "operator": "=", "value": "Technology"},
    {"field": "Market Cap", "operator": ">=", "value": "10B"}
  ],
  "average_score": 88.5,
  "top_sectors": [
    {"name": "Technology", "count": 5}
  ]
}
```

**Response:** PDF file download

---

### 📈 Export Technical Report

**POST** `/api/pdf/export/technical`

Export technical analysis as PDF.

**Request Body:**
```json
{
  "ticker": "AAPL",
  "technical_data": {
    "ticker": "AAPL",
    "current_price": 175.50,
    "overall_signal": "BUY",
    "signal_strength": 75,
    "indicators": {
      "rsi": 45.2,
      "sma_20": 172.30,
      "sma_50": 168.50,
      "sma_200": 165.00,
      "macd": 2.15,
      "macd_signal": 1.80,
      "bb_upper": 180.50,
      "bb_lower": 168.20,
      "stoch_k": 55.5
    },
    "buy_signals": ["RSI oversold", "MACD crossover"],
    "sell_signals": [],
    "period": "1y"
  }
}
```

**Response:** PDF file download

**Convenience Endpoint:**  
`GET /api/pdf/export/technical/{ticker}?period=1y` - Calculates indicators and exports

---

### ℹ️ Get Export Info

**GET** `/api/pdf/export/info`

Get information about PDF export feature and user's usage.

**Response:**
```json
{
  "has_access": true,
  "usage": {
    "pdf_exports": 5,
    "limit": 50,
    "remaining": 45,
    "reset_date": "2026-02-01T00:00:00Z"
  },
  "supported_formats": ["analysis", "screening", "technical", "watchlist", "comparison"],
  "max_file_size": "10 MB",
  "format": "PDF (A4, portrait)"
}
```

---

## Frontend Integration

### Import API Functions

```typescript
import { api, downloadBlob } from '@/lib/api';
```

### Export Analysis PDF

```typescript
const handleExportAnalysis = async (ticker: string, analysisData: any) => {
  try {
    const blob = await api.pdf.exportAnalysis(ticker, analysisData);
    downloadBlob(blob, `analysis_${ticker}.pdf`);
    
    toast({
      title: "PDF Exported",
      description: "Your analysis report has been downloaded.",
    });
  } catch (error: any) {
    toast({
      title: "Export Failed",
      description: error.message,
      variant: "destructive",
    });
  }
};
```

### Export Screening PDF

```typescript
const handleExportScreening = async (screeningData: any) => {
  try {
    const blob = await api.pdf.exportScreening(
      "Stock Screening Results",
      screeningData
    );
    downloadBlob(blob, `screening_results.pdf`);
    
    toast({
      title: "PDF Exported",
      description: "Your screening results have been downloaded.",
    });
  } catch (error: any) {
    toast({
      title: "Export Failed",
      description: error.message,
      variant: "destructive",
    });
  }
};
```

### Export Technical PDF (Convenience)

```typescript
const handleExportTechnical = async (ticker: string, period: string = '1y') => {
  try {
    const blob = await api.pdf.exportTechnicalByTicker(ticker, period);
    downloadBlob(blob, `technical_${ticker}.pdf`);
    
    toast({
      title: "PDF Exported",
      description: "Your technical analysis has been downloaded.",
    });
  } catch (error: any) {
    toast({
      title: "Export Failed",
      description: error.message,
      variant: "destructive",
    });
  }
};
```

---

## Feature Gates

PDF export is a **premium feature** protected by:

1. **Subscription Check** - `require_pdf_export` dependency checks if user has `enable_pdf_export` feature
2. **Usage Limits** - `check_pdf_limit` tracks and limits PDF exports per month
3. **Auto-increment** - Each export automatically increments the usage counter

### Usage Limits by Plan

| Plan | PDF Exports/Month |
|------|-------------------|
| Free | 0 (disabled) |
| Premium | 50 |

---

## Template System

### Available Templates

- `analysis_report.html` - Fundamental analysis report (350+ lines)
- `screening_report.html` - Stock screening results (200+ lines)
- `technical_report.html` - Technical analysis report (250+ lines)
- `watchlist_report.html` - Watchlist summary (todo)
- `comparison_report.html` - Stock comparison (todo)

### Template Location

```
backend/app/templates/pdf/
```

### Template Features

✅ **Inline CSS** - All styling inline (required for WeasyPrint)  
✅ **Jinja2 Templating** - Dynamic data rendering  
✅ **Color-Coded Sections** - Visual hierarchy with gradients  
✅ **Responsive Grids** - Professional layout  
✅ **Auto-Injected Variables** - `generated_at`, `app_name`, `current_year`  

### Customizing Templates

1. Edit HTML/CSS in template files
2. Use inline CSS only (external stylesheets don't work)
3. Test template rendering:

```python
from app.utils.pdf_generator import get_pdf_generator

pdf_gen = get_pdf_generator()
pdf_bytes = pdf_gen.generate_analysis_report(your_data)
with open("test.pdf", "wb") as f:
    f.write(pdf_bytes)
```

---

## File Management

### Output Directory

PDFs are saved to:
```
backend/uploads/pdfs/
```

### Filename Format

```
{report_type}_{ticker}_{user_id[:8]}_{timestamp}.pdf
```

Example: `analysis_AAPL_a1b2c3d4_20260128_143052.pdf`

### Automatic Cleanup

Old PDFs are automatically deleted after 7 days:

```python
from app.utils.pdf_generator import get_pdf_generator

pdf_gen = get_pdf_generator()
pdf_gen.cleanup_old_pdfs(days=7)  # Default: 7 days
```

---

## Troubleshooting

### ❌ "WeasyPrint not installed"

**Solution:**
```bash
pip install weasyprint
brew install cairo pango gdk-pixbuf  # macOS
```

### ❌ "Template not found"

**Solution:**  
Ensure templates exist in `backend/app/templates/pdf/`

### ❌ "CSS not rendering"

**Solution:**  
Use **inline CSS** only. External stylesheets don't work with WeasyPrint.

### ❌ "PDF too large"

**Solution:**  
- Reduce image sizes
- Limit table rows
- Compress generated PDFs with `pypdf` library

### ❌ "Feature access denied"

**Solution:**  
User needs Premium subscription with `enable_pdf_export` feature enabled.

### ❌ "Usage limit exceeded"

**Solution:**  
User has reached monthly PDF export limit. Resets at start of next billing period.

---

## Testing

### Manual Testing

1. Start backend: `cd backend && uvicorn app.main:app --reload`
2. Visit health check: `http://localhost:8000/api/pdf/export/health`
3. Test export from frontend: Click "Export PDF" on Analysis or Screening page
4. Check `backend/uploads/pdfs/` for generated files

### API Testing (curl)

```bash
# Health check
curl http://localhost:8000/api/pdf/export/health

# Export analysis (requires auth token)
curl -X POST http://localhost:8000/api/pdf/export/analysis \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ticker":"AAPL", "analysis_data":{...}}' \
  --output analysis.pdf
```

---

## Architecture

```
Frontend (React)
    ↓
API Request (POST /api/pdf/export/analysis)
    ↓
Feature Gate (require_pdf_export)
    ↓
Usage Check (check_pdf_limit)
    ↓
PDFGenerator Service
    ↓
Jinja2 Template (analysis_report.html)
    ↓
WeasyPrint (HTML → PDF)
    ↓
PDF Bytes (stream to client)
    ↓
Browser Download
```

---

## Next Steps

- [ ] Install WeasyPrint system dependencies
- [ ] Test PDF generation with health endpoint
- [ ] Try exporting from frontend (Analysis, Screening pages)
- [ ] Customize templates if needed
- [ ] Add watchlist and comparison templates (optional)
- [ ] Set up automatic PDF cleanup cron job (optional)

---

## Support

For issues, check:
1. WeasyPrint installation: `python -c "import weasyprint"`
2. System dependencies: `brew list | grep cairo`
3. Template files: `ls backend/app/templates/pdf/`
4. Feature access: `GET /api/pdf/export/info`
5. Backend logs: Look for PDF generation errors

Happy exporting! 📄✨
