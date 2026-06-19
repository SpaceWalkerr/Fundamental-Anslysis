"""
Chat API Endpoints
Handles Q&A with RAG (Retrieval Augmented Generation)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from datetime import datetime
import re
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
        .select('*, source_documents!reports_source_document_id_fkey(*)')\
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
    # Use the report's source document if available; otherwise fall back to
    # a known document id ("17") for general knowledge retrieval.
    source_document_id = report.get('source_document_id') or "17"
    
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
    
    # Build additional context from report metrics and analysis to ground answers
    report_metrics = report.get('metrics') or {}
    key_ratios = report.get('key_ratios') or []
    report_summary = report.get('summary') or report.get('report_data', {}).get('summary', '')

    metrics_parts = []
    if isinstance(report_metrics, dict):
        for k, v in report_metrics.items():
            metrics_parts.append(f"{k}: {v}")

    if key_ratios:
        ratios_str = ", ".join(f"{r.get('name')}={r.get('value')}" for r in key_ratios if isinstance(r, dict))
        if ratios_str:
            metrics_parts.append(f"Key ratios: {ratios_str}")

    additional_context = "".join([report_summary + "\n\n"] if report_summary else []) + ("; ".join(metrics_parts) if metrics_parts else "")

    # Get AI response with RAG (include additional context)
    rag_response = rag_service.chat(
        question=request.message,
        document_id=source_document_id,
        conversation_history=conversation_history,
        n_context_chunks=5,
        additional_context=additional_context,
        use_openai=False  # Prefer Claude by default when configured
    )
    
    response_content = rag_response["answer"]
    
    # Format sources for response
    sources_data = []
    for i, source in enumerate(rag_response.get("sources", [])):
        # Prefer explicit page metadata when available (e.g. "Page 3" or "Pages 3,4");
        # otherwise fall back to chunk_index+1 so UI has a sensible integer.
        page_num = None
        page_info = source.get("page_info")
        if page_info:
            m = re.search(r"(\d+)", str(page_info))
            if m:
                try:
                    page_num = int(m.group(1))
                except Exception:
                    page_num = None

        if page_num is None:
            page_num = source.get("chunk_index", 0) + 1

        sources_data.append(ChatSource(
            document=source.get("document_id", "Document"),
            page=page_num,
            excerpt=source.get("excerpt", ""),
            report_id=source.get("report_id", ""),
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
    
    # Save assistant response
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
            sources=[],
            timestamp=msg['created_at']
        ))
    
    return ChatSessionResponse(
        session_id=report_id,
        report_id=report_id,
        messages=messages
    )
