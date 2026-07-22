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


class ProfileUpdate(BaseModel):
    """Editable profile fields (all optional; at least one required)."""
    name: Optional[str] = None
    avatar_url: Optional[str] = None


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
    # Personalization: how this investor thinks, so the report speaks to them.
    # One of: beginner | value | growth | income | trader | balanced
    investor_style: Optional[str] = "balanced"
    # long_term | medium | short
    horizon: Optional[str] = "long_term"
    # Reader's region (IN|US|GB|EU|AE|SG|GLOBAL) so the report uses the right
    # currency symbol and market conventions. Falls back to the ticker's market.
    region: Optional[str] = None


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
    # Personalised one-liner verdict (all tiers when generated)
    plain_english: Optional[str] = None
    # Pro-only deeper sections
    personalized_take: Optional[str] = None
    bull_case: Optional[List[str]] = None
    bear_case: Optional[List[str]] = None
    what_to_watch: Optional[List[str]] = None
    peer_context: Optional[str] = None
    data_confidence: Optional[dict] = None


# ============= Chat Models =============

class ChatSource(BaseModel):
    """Document source for RAG"""
    document: str
    page: int
    excerpt: str
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
    pe_ratio: float
    revenue_growth: float
    profit_margin: float
    market_cap: str


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
    market: Optional[str] = "india"  # india | us


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
