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
from app.utils.rag_chat import RAGChatService


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
    # Verify report belongs to user and get source document
    report_result = db.table('reports')\
        .select('*, source_documents(*)')\
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
    source_document_id = report.get('source_document_id')
    
    if not source_document_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report has no associated document for chat"
        )
    
    # Get conversation history (last 10 messages)
    history_result = db.table('chat_messages')\
        .select('role, content')\
        .eq('report_id', request.report_id)\
        .order('created_at', desc=False)\
        .limit(10)\
        .execute()

    conversation_history = []
    if history_result.data:
        conversation_history = [
            {"role": msg["role"], "content": msg["content"]}
            for msg in history_result.data
        ]
    
    # Initialize RAG chat service
    rag_service = RAGChatService()
    
    # Get AI response with RAG
    rag_response = rag_service.chat(
        question=request.message,
        document_id=source_document_id,
        conversation_history=conversation_history,
        n_context_chunks=5,
        use_openai=True  # Can be made configurable
    )
    
    response_content = rag_response["answer"]
    
    # Format sources for response
    sources_data = []
    for i, source in enumerate(rag_response.get("sources", [])):
        sources_data.append(ChatSource(
            document=source.get("document_id", "Document"),
            page=source.get("chunk_index", 0) + 1,
            excerpt="Relevant excerpt from financial document",  # Could be enhanced
            similarity_score=source.get("relevance_score", 0.0)
        ))
    
    # Save user message to database
    chat_record = {
        "id": str(uuid.uuid4()),
        "report_id": request.report_id,
        "user_id": current_user['id'],
        "role": "user",
        "content": request.message,
    }

    db.table('chat_messages').insert(chat_record).execute()

    # Save assistant response. Sources are returned live in the response but not
    # persisted (the chat_messages table has no sources column).
    assistant_record = {
        "id": str(uuid.uuid4()),
        "report_id": request.report_id,
        "user_id": current_user['id'],
        "role": "assistant",
        "content": response_content,
    }

    db.table('chat_messages').insert(assistant_record).execute()
    
    return ChatMessageResponse(
        role="assistant",
        content=response_content,
        sources=sources_data,
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
            content=msg['content'],
            sources=[ChatSource(**src) for src in msg.get('sources', [])] if msg.get('sources') else [],
            timestamp=msg['created_at']
        ))
    
    return ChatSessionResponse(
        session_id=report_id,
        report_id=report_id,
        messages=messages
    )
