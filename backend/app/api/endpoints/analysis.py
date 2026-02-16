"""
Analysis API Endpoints
Handles file upload and financial analysis
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from supabase import Client
from typing import Optional
import uuid
from datetime import datetime
import os

from app.db.database import get_db
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
import asyncio


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
    
    try:
        # Create initial report record with PENDING status
        report_record = {
            "id": report_id,
            "user_id": current_user['id'],
            "status": ProcessingStatus.PENDING.value,
        }
        
        document_text = ""
        company_name = ""
        
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
            document_text = file_result.data.get('extracted_text', '')
            company_name = file_result.data.get('metadata', {}).get('company_name', 'Unknown Company')
            
            if not document_text:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Document has no extracted text. Please reupload the file."
                )
            
        elif request.company_ticker or request.company_name:
            # For company ticker/name, we'd fetch from external API
            # For now, raise not implemented
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="Company ticker analysis not yet implemented. Please upload a financial document."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either file_id or company_ticker must be provided"
            )
        
        # Insert initial report
        db.table('reports').insert(report_record).execute()
        
        # Update status to PROCESSING
        db.table('reports')\
            .update({"status": ProcessingStatus.PROCESSING.value})\
            .eq('id', report_id)\
            .execute()
        
        # Initialize AI analyzer
        analyzer = AIAnalyzer()
        
        # Perform AI analysis (this may take a few seconds)
        analysis_result = await asyncio.to_thread(
            analyzer.analyze_financial_document,
            document_text=document_text,
            company_name=company_name,
            use_openai=(settings.OPENAI_API_KEY is not None and settings.OPENAI_API_KEY != "")
        )
        
        # Update report with analysis results
        update_data = {
            "status": ProcessingStatus.COMPLETED.value,
            "analysis_result": analysis_result,
            "completed_at": datetime.utcnow().isoformat()
        }
        
        db.table('reports')\
            .update(update_data)\
            .eq('id', report_id)\
            .execute()
        
        # Update user reports usage
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
        # Update report to FAILED
        try:
            db.table('reports')\
                .update({
                    "status": ProcessingStatus.FAILED.value,
                    "error": str(e)
                })\
                .eq('id', report_id)\
                .execute()
        except:
            pass
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete analysis: {str(e)}"
        )


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
