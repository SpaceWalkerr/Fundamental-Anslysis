"""
Chat API Endpoints
Handles Q&A with RAG (Retrieval Augmented Generation)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from datetime import datetime
from typing import List
import uuid

from app.db.database import get_db
from app.models.schemas import (
    ChatMessageRequest,
    ChatMessageResponse,
    ChatSessionResponse,
    ChatSource,
)
from app.core.security import get_current_active_user


router = APIRouter()


@router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(
    request: ChatMessageRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Send a message and get AI response with sources
    Uses RAG to retrieve relevant document chunks
    """
    # Verify report belongs to user
    report_result = db.table('reports')\
        .select('*')\
        .eq('id', request.report_id)\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not report_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    report = report_result.data
    
    # TODO: Implement actual RAG logic
    # 1. Convert question to embedding
    # 2. Search vector database for relevant chunks
    # 3. Send chunks + question to LLM
    # 4. Get response with citations
    
    # Mock response for now
    mock_sources = [
        ChatSource(
            document=f"{report.get('company', 'Company')} 10-K Annual Report (FY2024)",
            page=24,
            excerpt="Total net sales increased to $394.3B in fiscal 2024, driven by strong Services and iPhone segment performance.",
            similarity_score=0.92
        ),
        ChatSource(
            document=f"{report.get('company', 'Company')} Investor Presentation Q1 2025",
            page=8,
            excerpt="Services revenue continues to grow at double-digit rates, with 15%+ YoY growth in the latest quarter.",
            similarity_score=0.88
        ),
    ]
    
    # Generate mock response based on question
    if "revenue" in request.message.lower():
        response_content = f"Based on the financial statements, {report.get('company', 'the company')}'s revenue has shown consistent growth driven by Services and core product segments. The company reported strong performance with double-digit growth in key areas."
    elif "debt" in request.message.lower():
        response_content = f"{report.get('company', 'The company')}'s debt levels have increased but remain manageable given robust cash flow generation. The company's interest coverage ratio remains strong, indicating ability to service debt obligations comfortably."
    else:
        response_content = "I'd be happy to help you understand that aspect better. Looking at the financial data, the company maintains strong fundamentals across most metrics. Could you be more specific about what you'd like to know?"
        mock_sources = []
    
    # Save chat message to database
    chat_record = {
        "id": str(uuid.uuid4()),
        "report_id": request.report_id,
        "user_id": current_user['id'],
        "role": "user",
        "message": request.message,
    }
    
    db.table('chat_messages').insert(chat_record).execute()
    
    # Save assistant response
    assistant_record = {
        "id": str(uuid.uuid4()),
        "report_id": request.report_id,
        "user_id": current_user['id'],
        "role": "assistant",
        "message": response_content,
        "sources": [source.dict() for source in mock_sources] if mock_sources else []
    }
    
    db.table('chat_messages').insert(assistant_record).execute()
    
    return ChatMessageResponse(
        role="assistant",
        content=response_content,
        sources=mock_sources,
        timestamp=datetime.utcnow()
    )


@router.get("/history/{report_id}", response_model=ChatSessionResponse)
async def get_chat_history(
    report_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Get chat history for a report
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
    
    # Get chat messages
    messages_result = db.table('chat_messages')\
        .select('*')\
        .eq('report_id', report_id)\
        .order('created_at', desc=False)\
        .execute()
    
    messages = []
    for msg in messages_result.data:
        messages.append(ChatMessageResponse(
            role=msg['role'],
            content=msg['message'],
            sources=[ChatSource(**src) for src in msg.get('sources', [])] if msg.get('sources') else [],
            timestamp=msg['created_at']
        ))
    
    return ChatSessionResponse(
        session_id=report_id,
        report_id=report_id,
        messages=messages
    )
