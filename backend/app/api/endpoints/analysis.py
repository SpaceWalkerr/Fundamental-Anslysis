"""
Analysis API Endpoints
Handles file upload and financial analysis
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from supabase import Client
import logging
import traceback
import uuid
from datetime import datetime

from app.db.database import get_db

logger = logging.getLogger(__name__)
from app.models.schemas import (
    FileUploadResponse,
    AnalysisRequest,
    AnalysisStatusResponse,
    ProcessingStatus,
    ProcessingStepResponse,
)
from app.core.security import get_current_active_user
from app.core.config import settings
from app.utils.file_processor import FileProcessor
from app.utils.ai_analyzer import AIAnalyzer


router = APIRouter()


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Upload and process a financial document (PDF, Excel)
    """
    # Read file content
    file_content = await file.read()
    file_size = len(file_content)
    
    # Initialize file processor
    processor = FileProcessor(db)
    
    # Validate file
    is_valid, error_msg = processor.validate_file(file.filename, file_size)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    try:
        # Upload to storage
        upload_result = await processor.upload_to_storage(
            file_content=file_content,
            filename=file.filename,
            user_id=current_user['id']
        )
        
        if not upload_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=upload_result.get("error", "Upload failed")
            )
        
        # Process file (extract text)
        processing_result = processor.process_file(file_content, file.filename)
        
        if not processing_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=processing_result.get("error", "File processing failed")
            )
        
        # Save document record with extracted text and metadata
        document = await processor.save_document_record(
            user_id=current_user['id'],
            filename=file.filename,
            file_size=file_size,
            file_type=processing_result["file_type"],
            storage_path=upload_result["storage_path"],
            extracted_text=processing_result["extracted_text"],
            metadata=processing_result["metadata"]
        )
        
        # Add chunks to vector store for RAG
        chunks_added = 0
        if processing_result["chunks"]:
            chunks_added = processor.add_to_vector_store(
                document_id=document['id'],
                chunks=processing_result["chunks"],
                user_id=current_user['id'],
                filename=file.filename
            )
        
        return FileUploadResponse(
            file_id=document['id'],
            file_name=file.filename,
            file_size=file_size,
            uploaded_at=datetime.utcnow(),
            metadata={
                "extracted_text_length": len(processing_result["extracted_text"]),
                "chunks_created": len(processing_result["chunks"]),
                "chunks_embedded": chunks_added,
                **processing_result["metadata"]
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )


@router.post("/analyze", response_model=dict)
async def start_analysis(
    request: AnalysisRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Start financial analysis on uploaded file or company ticker
    This performs AI-powered analysis and generates a report
    """
    # Check usage limits
    if current_user['reports_used'] >= current_user['reports_limit']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Report limit reached. Upgrade your plan to continue."
        )
    
    # Generate report ID
    report_id = str(uuid.uuid4())
    report_inserted = False
    
    try:
        logger.info(f"start_analysis called with report_id={report_id}, user_id={current_user['id']}, file_id={request.file_id}, company_ticker={request.company_ticker}, ticker={request.ticker}")

        # Create initial report record payload with PENDING status
        report_record = {
            "id": report_id,
            "user_id": current_user['id'],
            "status": ProcessingStatus.PENDING.value,
        }
        
        document_text = ""
        company_name = request.company_name or request.company or ""
        ticker = (request.company_ticker or request.ticker or "").upper()
        
        # Add file or company info
        if request.file_id:
            # Verify file belongs to user and get extracted text
            file_result = db.table('source_documents')\
                .select('*')\
                .eq('id', request.file_id)\
                .eq('user_id', current_user['id'])\
                .single()\
                .execute()
            
            if not file_result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="File not found"
                )
            
            report_record['source_document_id'] = request.file_id
            logger.info(f"Using existing source document {request.file_id} for report_id={report_id}")
            document_text = file_result.data.get('extracted_text', '')
            metadata = file_result.data.get('metadata') or {}
            company_name = company_name or metadata.get('company_name') or metadata.get('company') or 'Unknown Company'
            ticker = ticker or metadata.get('ticker') or 'N/A'
            
            if not document_text:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Document has no extracted text. Please reupload the file."
                )
            
        elif request.company_ticker or request.ticker or request.company_name or request.company:
            ticker = (request.company_ticker or request.ticker or "").upper()
            if not ticker:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ticker symbol must be provided for company analysis"
                )
                
            from app.utils.stock_data_service import get_stock_data_service
            stock_service = get_stock_data_service()
            company_data = None
            try:
                db_res = db.table('stocks').select('*').eq('ticker', ticker).single().execute()
                if db_res.data:
                    company_data = db_res.data
            except Exception:
                pass
                
                if not company_data:
                    logger.info(f"Fetching company overview for ticker={ticker}")
                    company_data = await stock_service.get_company_overview(ticker)
                    logger.info(f"Fetched company overview for ticker={ticker}: {bool(company_data)}")
                if company_data:
                    try:
                        db.table('stocks').upsert(company_data).execute()
                    except Exception as e:
                        print(f"Error caching stock data: {e}")
            
            if not company_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Company details for ticker {ticker} could not be retrieved"
                )
                
            company_name = company_data.get('name') or company_name or ticker
            report_record['company'] = company_name
            report_record['ticker'] = ticker
            
            document_text = f"""
Company Profile:
Ticker: {company_data.get('ticker')}
Name: {company_data.get('name')}
Sector: {company_data.get('sector')}
Industry: {company_data.get('industry')}
Country: {company_data.get('country')}
Currency: {company_data.get('currency')}
Exchange: {company_data.get('exchange')}

Business Description:
{company_data.get('description')}

Key Fundamental Metrics & Ratios:
Price: {company_data.get('price')}
Market Cap: {company_data.get('market_cap')}
P/E Ratio: {company_data.get('pe_ratio')}
P/B Ratio: {company_data.get('pb_ratio')}
PEG Ratio: {company_data.get('peg_ratio')}
Dividend Yield: {company_data.get('dividend_yield')}%
EPS: {company_data.get('eps')}
Profit Margin: {company_data.get('profit_margin')}%
Operating Margin: {company_data.get('operating_margin')}%
ROE (Return on Equity): {company_data.get('roe')}%
ROA (Return on Assets): {company_data.get('roa')}%
Revenue Growth: {company_data.get('revenue_growth')}%
Earnings Growth: {company_data.get('earnings_growth')}%
Current Ratio: {company_data.get('current_ratio')}
Debt to Equity: {company_data.get('debt_to_equity')}
Beta: {company_data.get('beta')}
52-Week High: {company_data.get('week_52_high')}
52-Week Low: {company_data.get('week_52_low')}
Average Volume: {company_data.get('avg_volume')}
Shares Outstanding: {company_data.get('shares_outstanding')}
"""
            
            # Create virtual source document for RAG chat session
            try:
                logger.info(f"Ensuring report exists before creating virtual source document for report_id={report_id}")
                if not report_inserted:
                    db.table('reports').insert(report_record).execute()
                    report_inserted = True
                    logger.info(f"Inserted initial report record report_id={report_id}")

                processor = FileProcessor(db)
                virtual_filename = f"{ticker}_profile.txt"
                logger.info(f"Saving virtual source document for report_id={report_id}, filename={virtual_filename}")
                document = await processor.save_document_record(
                    user_id=current_user['id'],
                    filename=virtual_filename,
                    file_size=len(document_text),
                    file_type=".txt",
                    storage_path=f"{current_user['id']}/virtual/{ticker}_profile.txt",
                    extracted_text=document_text,
                    metadata={"company_name": company_name, "ticker": ticker},
                    report_id=report_id
                )
                report_record['source_document_id'] = document['id']
                logger.info(f"Saved virtual document id={document.get('id')} for report_id={report_id}")
                logger.info(f"Created virtual source document id={document['id']} for report_id={report_id}")
                db.table('reports').update({"source_document_id": document['id']}).eq('id', report_id).execute()

                # Chunk and add to vector store
                from app.utils.text_chunker import chunk_text
                chunks = chunk_text(document_text)
                if chunks:
                    logger.info(f"Adding {len(chunks)} chunks to vector store for document_id={document.get('id')}")
                    processor.add_to_vector_store(
                        document_id=document['id'],
                        chunks=chunks,
                        user_id=current_user['id'],
                        filename=virtual_filename
                    )
            except Exception as e:
                logger.error(f"Error creating virtual document for RAG: report_id={report_id}, error={e}")
                if "does not exist" in str(e).lower():
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Report {report_id} does not exist"
                    )
                raise
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either file_id or company_ticker must be provided"
            )
        
        # Insert initial report if it was not already saved before source_documents creation
        if not report_inserted:
            logger.info(f"Inserting initial report record report_id={report_id}")
            db.table('reports').insert(report_record).execute()
            report_inserted = True
            logger.info(f"Inserted initial report record report_id={report_id}")

        # Update status to PROCESSING
        logger.info(f"Updating report status to PROCESSING for report_id={report_id}")
        db.table('reports')\
            .update({"status": ProcessingStatus.PROCESSING.value})\
            .eq('id', report_id)\
            .execute()
        
        # Initialize AI analyzer
        provider = "openai" if settings.OPENAI_API_KEY else "anthropic"
        analyzer = AIAnalyzer(provider=provider)

        # Allow fallback to mock report generator when AI keys are not configured
        # if not analyzer.is_available():
        #     raise HTTPException(
        #         status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        #         detail="AI service is not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY."
        #     )
        
        # Perform AI analysis (this may take a few seconds)
        logger.info(f"Starting AI analysis for report_id={report_id}, ticker={ticker}")
        analysis_result = await analyzer.analyze_financial_document(
            extracted_text=document_text,
            company_name=company_name,
            ticker=ticker
        )
        print("ANALYSIS RESULT:")
        print(analysis_result)
        logger.info(f"AI analysis completed for report_id={report_id}, success={analysis_result.get('success')}")

        if not analysis_result.get("success", False):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=analysis_result.get("error", "AI analysis failed")
            )
        
        # Update report with analysis results
        update_data = {
            "status": ProcessingStatus.COMPLETED.value,
            "analysis_result": analysis_result,
            "report_data": analysis_result,
            "company": analysis_result.get("company", company_name),
            "ticker": analysis_result.get("ticker", ticker),
            "exchange": analysis_result.get("exchange", "N/A"),
            "overall_score": analysis_result.get("overall_score"),
            "summary": analysis_result.get("summary"),
            "metrics": analysis_result.get("metrics"),
            "key_ratios": analysis_result.get("key_ratios"),
            "strengths": analysis_result.get("strengths"),
            "red_flags": analysis_result.get("red_flags"),
            "investment_assessment": analysis_result.get("investment_assessment"),
            "completed_at": datetime.utcnow().isoformat()
        }
        
        logger.info(f"Updating report with analysis results for report_id={report_id}")
        db.table('reports')\
            .update(update_data)\
            .eq('id', report_id)\
            .execute()
        
        # Update user reports usage
        logger.info(f"Incrementing reports_used for user_id={current_user['id']}")
        db.table('users')\
            .update({
                "reports_used": current_user['reports_used'] + 1,
                "updated_at": datetime.utcnow().isoformat()
            })\
            .eq('id', current_user['id'])\
            .execute()
        
        return {
            "report_id": report_id,
            "status": ProcessingStatus.COMPLETED.value,
            "message": "Analysis completed successfully",
            "analysis": analysis_result
        }
        
    except HTTPException:
        # Update report to FAILED if it exists
        try:
            db.table('reports')\
                .update({"status": ProcessingStatus.FAILED.value})\
                .eq('id', report_id)\
                .execute()
        except:
            pass
        raise
    except Exception as e:
        # Print full traceback for debugging and re-raise so it surfaces in the server logs
        print("\n" + "=" * 100)
        print("ANALYZE ENDPOINT ERROR")
        print(f"Error: {e}")
        traceback.print_exc()
        print("=" * 100 + "\n")

        # Update report to FAILED
        try:
            db.table('reports')\
                .update({
                    "status": ProcessingStatus.FAILED.value,
                    "error": str(e)
                })\
                .eq('id', report_id)\
                .execute()
        except Exception:
            pass

        # Re-raise to allow uvicorn to display full traceback
        raise


@router.get("/status/{report_id}", response_model=AnalysisStatusResponse)
async def get_analysis_status(
    report_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Get analysis processing status
    """
    # Get report
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
    
    # Mock processing steps (will be real in actual implementation)
    steps = [
        ProcessingStepResponse(
            name="Uploading file",
            status=ProcessingStatus.COMPLETED,
            progress=100.0
        ),
        ProcessingStepResponse(
            name="Extracting text from document",
            status=ProcessingStatus.COMPLETED,
            progress=100.0
        ),
        ProcessingStepResponse(
            name="Generating embeddings",
            status=ProcessingStatus.ANALYZING if report['status'] == 'analyzing' else ProcessingStatus.COMPLETED,
            progress=50.0 if report['status'] == 'analyzing' else 100.0
        ),
        ProcessingStepResponse(
            name="Analyzing financial data",
            status=ProcessingStatus.PENDING,
            progress=0.0
        ),
        ProcessingStepResponse(
            name="Generating report",
            status=ProcessingStatus.PENDING,
            progress=0.0
        ),
    ]
    
    overall_progress = sum(step.progress for step in steps) / len(steps)
    
    return AnalysisStatusResponse(
        report_id=report_id,
        status=ProcessingStatus(report['status']),
        overall_progress=overall_progress,
        steps=steps,
        estimated_time=30 if report['status'] != 'completed' else None
    )
