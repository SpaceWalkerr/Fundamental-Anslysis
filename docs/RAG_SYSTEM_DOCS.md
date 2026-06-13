# RAG (Retrieval-Augmented Generation) System Documentation

## Overview

The RAG system enables intelligent Q&A on financial documents by combining:
1. **Vector embeddings** for semantic search
2. **ChromaDB** for efficient similarity search
3. **OpenAI GPT-4 / Anthropic Claude** for answer generation

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     File Upload Flow                         │
└─────────────────────────────────────────────────────────────┘
  PDF/Excel Upload
       ↓
  Text Extraction (pdfplumber, openpyxl)
       ↓
  Text Chunking (overlapping chunks)
       ↓
  Embedding Generation (sentence-transformers)
       ↓
  Vector Storage (ChromaDB)


┌─────────────────────────────────────────────────────────────┐
│                     RAG Chat Flow                            │
└─────────────────────────────────────────────────────────────┘
  User Question
       ↓
  Question Embedding
       ↓
  Semantic Search (ChromaDB)
       ↓
  Retrieve Top-K Chunks
       ↓
  Context + Question → LLM
       ↓
  AI-Generated Answer + Sources
```

## Component Details

### 1. Vector Store Service (`app/utils/vector_store.py`)

**Purpose**: Manages document embeddings and semantic search

**Key Features**:
- Uses `sentence-transformers/all-MiniLM-L6-v2` for embeddings (384 dimensions)
- ChromaDB with HNSW index for fast similarity search
- Persistent storage in `backend/chroma_db/`
- Cosine similarity for relevance scoring

**Methods**:
- `add_document_chunks()` - Store document chunks with embeddings
- `search()` - Semantic search for relevant chunks
- `delete_document()` - Remove document from index
- `get_collection_stats()` - Collection metrics

### 2. RAG Chat Service (`app/utils/rag_chat.py`)

**Purpose**: Handles retrieval-augmented generation for Q&A

**Key Features**:
- Retrieves top-K relevant chunks for context
- Supports conversation history (last 3 exchanges)
- Prompt engineering for financial analysis
- Fallback between OpenAI and Anthropic

**Methods**:
- `chat()` - Answer question with RAG
- `generate_summary()` - Create executive summary
- `_build_context()` - Format retrieved chunks
- `_create_system_prompt()` - System instructions for LLM

### 3. File Processor (`app/utils/file_processor.py`)

**Enhanced with**:
- Automatic embedding generation after text extraction
- `add_to_vector_store()` method for chunk indexing
- Metadata preservation for filtering

### 4. Chat API Endpoint (`app/api/endpoints/chat.py`)

**POST /api/chat/message**
```json
Request:
{
  "report_id": "uuid",
  "message": "What is the company's revenue growth?"
}

Response:
{
  "role": "assistant",
  "content": "Based on the financial statements...",
  "sources": [
    {
      "document": "Document ID",
      "page": 1,
      "similarity_score": 0.92
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

Key packages:
- `chromadb==0.4.22` - Vector database
- `sentence-transformers==2.3.1` - Embedding model
- `openai==2.21.0` - OpenAI API
- `anthropic==0.79.0` - Claude API

### 2. Configure Environment

Add to `backend/.env`:

```bash
# Required: Choose one or both
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Models (defaults shown)
OPENAI_MODEL=gpt-4-turbo-preview
ANTHROPIC_MODEL=claude-3-sonnet-20240229
```

### 3. Initialize Vector Store

The vector store is automatically initialized on first use. Data persists in:
```
backend/chroma_db/
```

### 4. Run Database Migration

Execute in Supabase SQL Editor:
```sql
-- See: backend/migrations/002_update_reports_schema.sql
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS source_document_id UUID;
-- ... (rest of migration)
```

## Usage Flow

### Complete Analysis Pipeline

1. **Upload Document**
   ```bash
   POST /api/analysis/upload
   Content-Type: multipart/form-data
   Authorization: Bearer <token>
   
   file: financial_report.pdf
   ```
   
   Response includes `file_id` and metadata:
   - `extracted_text_length`
   - `chunks_created`
   - `chunks_embedded` (new!)

2. **Generate AI Analysis**
   ```bash
   POST /api/analysis/analyze
   Content-Type: application/json
   Authorization: Bearer <token>
   
   {"file_id": "uuid"}
   ```
   
   Returns `report_id` and full analysis with scores, metrics, insights

3. **Chat with Document**
   ```bash
   POST /api/chat/message
   Content-Type: application/json
   Authorization: Bearer <token>
   
   {
     "report_id": "uuid",
     "message": "What are the key financial risks?"
   }
   ```

### Testing the System

Run the integration test:
```bash
cd backend
python test_rag_system.py
```

Test flow:
1. ✓ Authentication (register/login)
2. ✓ File upload & extraction
3. ✓ AI analysis generation
4. ✓ RAG chat with 3 sample questions
5. ✓ Vector store statistics

## Performance Characteristics

### Embedding Generation
- **Model**: all-MiniLM-L6-v2 (80MB)
- **Speed**: ~100 chunks/second on M1 Mac
- **Dimensions**: 384 (smaller than OpenAI ada-002)

### Vector Search
- **Algorithm**: HNSW (Hierarchical Navigable Small World)
- **Complexity**: O(log N) search time
- **Typical latency**: <50ms for 10k chunks

### RAG Response Time
- Embedding generation: ~50ms
- Vector search: ~50ms
- LLM generation: 1-3 seconds (depends on model)
- **Total**: ~1.5-4 seconds per question

## Customization

### Change Embedding Model

Edit `vector_store.py`:
```python
VectorStoreService(
    embedding_model="sentence-transformers/all-mpnet-base-v2"  # Better accuracy
)
```

Popular alternatives:
- `all-mpnet-base-v2` (768 dim, slower but more accurate)
- `paraphrase-multilingual` (multilingual support)

### Adjust Retrieval Settings

Edit `rag_chat.py`:
```python
relevant_chunks = self.vector_store.search(
    query=question,
    n_results=10,  # Retrieve more chunks (default: 5)
    document_id=document_id
)
```

### Tune LLM Parameters

In `_generate_answer_openai()`:
```python
response = self.openai_client.chat.completions.create(
    model=settings.OPENAI_MODEL,
    messages=messages,
    temperature=0.1,  # More deterministic (default: 0.3)
    max_tokens=1500,  # Longer responses (default: 1000)
    top_p=0.9
)
```

## Troubleshooting

### "AI service not configured"
- Add `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to `.env`
- Restart the backend server

### "No chunks found" / Low quality answers
- Check document extraction: verify `extracted_text_length > 0`
- Increase chunk overlap in `text_chunker.py`
- Try different chunking strategy: `chunk_by_pages()` vs `chunk_text()`

### ChromaDB permission errors
- Ensure `backend/chroma_db/` is writable
- Delete and recreate: `rm -rf chroma_db/`

### Slow embedding generation
- First run downloads model (~80MB) - subsequent runs are fast
- Consider using GPU-accelerated sentence-transformers
- Reduce chunk size to create fewer embeddings

## Advanced Features

### Document Filtering

Search within specific user's documents:
```python
results = vector_store.search(
    query="revenue growth",
    user_id="uuid",
    document_id="uuid"  # Optional: limit to one doc
)
```

### Conversation Memory

RAG service maintains last 3 message exchanges (6 messages) for context:
```python
conversation_history = [
    {"role": "user", "content": "What's the revenue?"},
    {"role": "assistant", "content": "$100M in 2024"},
    {"role": "user", "content": "How does that compare to 2023?"}
]
```

### Executive Summaries

Generate document overview:
```python
summary = rag_service.generate_summary(
    document_id="uuid",
    use_openai=True
)
```

## Cost Estimation

### Embedding Costs
- **FREE** - Runs locally with sentence-transformers
- One-time model download: 80MB

### LLM API Costs
**OpenAI GPT-4-turbo**
- Input: $10/1M tokens
- Output: $30/1M tokens
- Typical query: ~1,500 input + 500 output tokens
- **Cost per query**: ~$0.03

**Anthropic Claude 3 Sonnet**
- Input: $3/1M tokens
- Output: $15/1M tokens
- **Cost per query**: ~$0.01

### Storage Costs
- ChromaDB: Local storage, no cost
- Embeddings: ~1.5KB per chunk (384 dimensions × 4 bytes)
- 10,000 chunks = ~15MB

## Monitoring

### Vector Store Stats
```python
from app.utils.vector_store import get_vector_store

stats = get_vector_store().get_collection_stats()
print(stats)
# {'total_chunks': 1234, 'collection_name': 'financial_documents'}
```

### RAG Response Quality

Monitor in chat response:
```json
{
  "confidence": "high",  // high/medium/low
  "chunks_used": 5,
  "sources": [...]
}
```

## Security Considerations

1. **User Isolation**: Always filter by `user_id` in vector search
2. **API Keys**: Never commit keys to version control
3. **Document Access**: Verify ownership before chat
4. **Rate Limiting**: Implement on chat endpoint to prevent abuse

## Next Steps

Potential enhancements:
- [ ] Hybrid search (keyword + semantic)
- [ ] Re-ranking retrieved chunks
- [ ] Multi-document chat
- [ ] Citation linking to exact page/paragraph
- [ ] Support for images/charts extraction
- [ ] Fine-tuned embedding model for finance
- [ ] Streaming responses for real-time chat

## References

- ChromaDB: https://www.trychroma.com/
- Sentence Transformers: https://www.sbert.net/
- OpenAI API: https://platform.openai.com/docs
- Anthropic Claude: https://docs.anthropic.com/

---

**Questions?** Check logs in `backend/logs/` or enable debug mode in `.env`:
```bash
DEBUG=true
LOG_LEVEL=DEBUG
```
