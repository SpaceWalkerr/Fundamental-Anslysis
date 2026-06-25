"""
Pydantic Models for Request/Response Validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ============= Authentication Models =============

class UserRegister(BaseModel):
    """User registration request"""
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)


class UserLogin(BaseModel):
    """User login request"""
    email: EmailStr
    password: str


class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None
    user: Dict[str, Any]


class UserResponse(BaseModel):
    """User profile response"""
    id: str
    name: str
    email: str
    plan: str
    reports_used: int
    reports_limit: int
    created_at: datetime
    company: Optional[str] = ""
    email_notifications: Optional[bool] = True
    marketing_emails: Optional[bool] = False
    report_alerts: Optional[bool] = True


# ============= Analysis Models =============

class FileUploadResponse(BaseModel):
    """File upload response"""
    file_id: str
    file_name: str
    file_size: int
    uploaded_at: datetime
    metadata: Optional[Dict[str, Any]] = None


class ProcessingStatus(str, Enum):
    """Processing status enum"""
    PENDING = "pending"
    PROCESSING = "processing"
    UPLOADING = "uploading"
    EXTRACTING = "extracting"
    EMBEDDING = "embedding"
    ANALYZING = "analyzing"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalysisRequest(BaseModel):
    """Analysis request"""
    file_id: Optional[str] = None
    company_ticker: Optional[str] = None
    company_name: Optional[str] = None
    # Backward-compatible aliases used by the current frontend helper.
    ticker: Optional[str] = None
    company: Optional[str] = None


class ProcessingStepResponse(BaseModel):
    """Processing step status"""
    name: str
    status: ProcessingStatus
    progress: float = 0.0
    message: Optional[str] = None


class AnalysisStatusResponse(BaseModel):
    """Analysis status response"""
    report_id: str
    status: ProcessingStatus
    overall_progress: float
    steps: List[ProcessingStepResponse]
    estimated_time: Optional[int] = None


class FinancialMetrics(BaseModel):
    """Financial health metrics"""
    profitability: Dict[str, Any]
    liquidity: Dict[str, Any]
    solvency: Dict[str, Any]
    efficiency: Dict[str, Any]


class KeyRatio(BaseModel):
    """Financial ratio"""
    name: str
    value: str
    benchmark: str


class AnalysisReportResponse(BaseModel):
    """Complete analysis report"""
    id: str
    company: str
    ticker: str
    exchange: str
    date: datetime
    overall_score: float
    summary: str
    metrics: FinancialMetrics
    key_ratios: List[KeyRatio]
    strengths: List[str]
    red_flags: List[str]
    investment_assessment: str


# ============= Chat Models =============

class ChatSource(BaseModel):
    """Document source for RAG"""
    document: str
    page: int
    excerpt: str
    report_id: Optional[str] = None
    similarity_score: float


class ChatMessageRequest(BaseModel):
    """Chat message request"""
    report_id: str
    message: str


class ChatMessageResponse(BaseModel):
    """Chat message response"""
    role: str
    content: str
    sources: List[ChatSource]
    timestamp: datetime


class ChatSessionResponse(BaseModel):
    """Chat session with history"""
    session_id: str
    report_id: str
    messages: List[ChatMessageResponse]


# ============= Stock Models =============

class CompanySearch(BaseModel):
    """Company search response"""
    id: str
    name: str
    ticker: str
    sector: str
    price: float
    change_percent: float
    pe_ratio: Optional[float] = None
    revenue_growth: Optional[float] = None
    profit_margin: Optional[float] = None
    market_cap: str
    currency: Optional[str] = "USD"


class StockDetails(BaseModel):
    """Detailed stock details response"""
    ticker: str
    name: str
    description: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    exchange: Optional[str] = None
    currency: Optional[str] = "USD"
    country: Optional[str] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    peg_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    eps: Optional[float] = None
    profit_margin: Optional[float] = None
    operating_margin: Optional[float] = None
    roe: Optional[float] = None
    roa: Optional[float] = None
    revenue_growth: Optional[float] = None
    earnings_growth: Optional[float] = None
    current_ratio: Optional[float] = None
    debt_to_equity: Optional[float] = None
    beta: Optional[float] = None
    week_52_high: Optional[float] = None
    week_52_low: Optional[float] = None
    avg_volume: Optional[float] = None
    shares_outstanding: Optional[float] = None
    price: Optional[float] = None


class FilterOperator(str, Enum):
    """Filter operators"""
    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"
    EQ = "eq"


class StockFilter(BaseModel):
    """Stock screener filter"""
    field: str
    operator: FilterOperator
    value: Any


class StockScreenerRequest(BaseModel):
    """Stock screener request"""
    filters: List[StockFilter]
    sort_by: Optional[str] = "match_score"
    sort_order: Optional[str] = "desc"
    limit: Optional[int] = 50


class StockScreenerResult(BaseModel):
    """Stock screener result"""
    ticker: str
    company: str
    sector: str
    price: float
    market_cap: str
    pe_ratio: float
    revenue_growth: float
    profit_margin: float
    match_score: int


class StockScreenerResponse(BaseModel):
    """Stock screener response"""
    total: int
    results: List[StockScreenerResult]
    filters_applied: List[StockFilter]


class SaveScreenerRequest(BaseModel):
    """Save custom stock screener request"""
    name: str = Field(..., min_length=1)
    description: Optional[str] = ""
    filters: List[StockFilter]
    is_public: Optional[bool] = False


class WatchlistItemResponse(BaseModel):
    """Watchlist item with current prices"""
    watchlist_id: str
    ticker: str
    notes: Optional[str] = None
    target_price: Optional[float] = None
    added_at: datetime
    name: str
    price: Optional[float] = None
    change_percent: Optional[float] = None
    currency: str = "USD"


class WatchlistResponse(BaseModel):
    """List of watchlist items"""
    watchlist: List[WatchlistItemResponse]


# ============= Report Models =============

class ReportListItem(BaseModel):
    """Report list item"""
    id: str
    company: str
    ticker: str
    overall_score: float
    created_at: datetime
    status: ProcessingStatus


class ReportListResponse(BaseModel):
    """List of reports"""
    total: int
    reports: List[ReportListItem]


# ============= Error Models =============

class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None

