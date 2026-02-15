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


router = APIRouter()


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Upload a financial document (PDF, Excel, CSV)
    """
    # Validate file type
    allowed_extensions = ['.pdf', '.xlsx', '.xls', '.csv']
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not supported. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Validate file size
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Generate unique file ID
    file_id = str(uuid.uuid4())
    file_path = f"{current_user['id']}/{file_id}{file_ext}"
    
    try:
        # Upload to Supabase Storage
        db.storage.from_('financial-documents').upload(
            file_path,
            file_content,
            {
                "content-type": file.content_type,
                "upsert": "false"
            }
        )
        
        # Save file metadata to database
        file_record = {
            "id": file_id,
            "user_id": current_user['id'],
            "file_name": file.filename,
            "file_path": file_path,
            "file_size": file_size,
            "file_type": file_ext,
            "status": ProcessingStatus.PENDING.value,
        }
        
        db.table('source_documents').insert(file_record).execute()
        
        return FileUploadResponse(
            file_id=file_id,
            file_name=file.filename,
            file_size=file_size,
            uploaded_at=datetime.utcnow()
        )
        
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
    This triggers the background processing job
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
        # Create report record
        report_record = {
            "id": report_id,
            "user_id": current_user['id'],
            "status": ProcessingStatus.PENDING.value,
        }
        
        # Add file or company info
        if request.file_id:
            # Verify file belongs to user
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
            
        elif request.company_ticker or request.company_name:
            report_record['company'] = request.company_name
            report_record['ticker'] = request.company_ticker
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either file_id or company_ticker must be provided"
            )
        
        # Insert report
        db.table('reports').insert(report_record).execute()
        
        # TODO: Trigger background Celery task for processing
        # from app.services.analysis import process_analysis_task
        # process_analysis_task.delay(report_id)
        
        # For now, return immediately
        return {
            "report_id": report_id,
            "status": ProcessingStatus.PENDING.value,
            "message": "Analysis started. Check status using /api/analysis/status/{report_id}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start analysis: {str(e)}"
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
