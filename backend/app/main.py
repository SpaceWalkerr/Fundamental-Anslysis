"""
FastAPI Application Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time

from app.core.config import settings
from app.api.endpoints import auth, analysis, chat, stocks, reports, alerts, market_ws, history, technicals, payments, portfolios, watchlists  # pdf_export disabled (missing system deps)
from app.db.database import init_db
from app.utils.market_data_streamer import get_market_streamer, get_alert_checker


import logging
import re

class TokenMaskingFilter(logging.Filter):
    def filter(self, record):
        if isinstance(record.msg, str):
            record.msg = re.sub(r'token=[^&\s"\']+', 'token=***[MASKED]***', record.msg)
        if record.args:
            new_args = []
            for arg in record.args:
                if isinstance(arg, str):
                    new_args.append(re.sub(r'token=[^&\s"\']+', 'token=***[MASKED]***', arg))
                else:
                    new_args.append(arg)
            record.args = tuple(new_args)
        return True

# Apply the masking filter to all uvicorn and app loggers
for logger_name in ("uvicorn", "uvicorn.access", "uvicorn.error", "fastapi"):
    logging.getLogger(logger_name).addFilter(TokenMaskingFilter())


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for FastAPI app
    Handles startup and shutdown events
    """
    # Startup
    print("🚀 Starting FundaKaMental API...")
    await init_db()
    print("✅ Database initialized")
    
    # Start real-time services
    market_streamer = get_market_streamer()
    await market_streamer.start()
    print("📡 Market data streamer started")
    
    from app.db.database import get_supabase_admin_client
    alert_checker = get_alert_checker(get_supabase_admin_client())
    await alert_checker.start()
    print("🔔 Price alert checker started")
    
    # Start daily stock populator cron task (runs at 4:00 PM IST / 16:00 Asia/Kolkata every day)
    import asyncio
    import datetime
    import pytz
    from populate_stocks import run_population

    async def schedule_daily_populator():
        while True:
            try:
                ist = pytz.timezone("Asia/Kolkata")
                now = datetime.datetime.now(ist)
                
                # Target time is 4:00 PM IST today
                target = now.replace(hour=16, minute=0, second=0, microsecond=0)
                if now >= target:
                    # If already past 4:00 PM, target is 4:00 PM tomorrow
                    target += datetime.timedelta(days=1)
                
                sleep_seconds = (target - now).total_seconds()
                print(f"🕒 Daily Stock Populator cron scheduled. Next run: {target} IST (sleeping for {sleep_seconds:.1f}s)")
                
                await asyncio.sleep(sleep_seconds)
                
                print("⚡ Executing scheduled daily stock database population...")
                admin_db = get_supabase_admin_client()
                await run_population(admin_db)
                print("✅ Daily stock database population complete.")
            except asyncio.CancelledError:
                break
            except Exception as cron_err:
                print(f"❌ Error in daily stock database populator cron: {cron_err}")
                await asyncio.sleep(300)  # Wait 5 minutes before retrying on failure

    populator_task = asyncio.create_task(schedule_daily_populator())
    print("🕒 Daily Stock Populator background scheduler initialized")

    print(f"📊 Environment: {settings.ENVIRONMENT}")
    print(f"🔐 Debug mode: {settings.DEBUG}")
    
    yield
    
    # Shutdown
    print("👋 Shutting down FundaKaMental API...")
    populator_task.cancel()
    try:
        await populator_task
    except asyncio.CancelledError:
        pass
    
    await market_streamer.stop()
    await alert_checker.stop()
    print("✅ Background services stopped")


# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered fundamental analysis platform for stocks",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add processing time to response headers"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc) if settings.DEBUG else "Something went wrong",
            "path": str(request.url),
        },
    )


# Health check endpoint
@app.get("/health", tags=["System"])
async def health_check():
    """Check if API is running"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


# Root endpoint
@app.get("/", tags=["System"])
async def root():
    """API root endpoint"""
    return {
        "message": "Welcome to FundaKaMental API",
        "version": settings.APP_VERSION,
        "docs": "/api/docs",
        "health": "/health",
    }


# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(stocks.router, prefix="/api/stocks", tags=["Stocks"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(history.router, prefix="/api", tags=["Historical Data"])
app.include_router(technicals.router, prefix="/api", tags=["Technical Analysis"])
app.include_router(payments.router, prefix="/api", tags=["Payments"])
# app.include_router(pdf_export.router, prefix="/api/pdf", tags=["PDF Export"])  # Disabled - missing system deps
app.include_router(portfolios.router, prefix="/api/portfolios", tags=["Portfolio Tracking"])
app.include_router(watchlists.router, prefix="/api/watchlists", tags=["Watchlist Manager"])
app.include_router(market_ws.router, prefix="/api", tags=["Market Data"])


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.API_PORT,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning",
    )
