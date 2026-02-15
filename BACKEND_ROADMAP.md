# 🚀 Backend Development Roadmap

## Current Status
✅ Frontend: 100% Complete (4 new features just added)
✅ Database: Supabase schema deployed
⏳ Backend: Ready to start (FastAPI)

---

## 📋 Phase 1: Backend Core Setup (Week 1)

### Step 1.1: Initialize FastAPI Project
```bash
# Create project structure
mkdir backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn python-multipart python-dotenv
pip install sqlalchemy psycopg2-binary alembic
pip install python-jose passlib bcrypt
pip install celery redis
pip install requests httpx
```

### Step 1.2: Project Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app
│   ├── config.py            # Configuration
│   ├── dependencies.py      # Shared dependencies
│   ├── models/              # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── report.py
│   │   ├── document.py
│   │   ├── chat.py
│   │   └── stock.py
│   ├── schemas/             # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── report.py
│   │   ├── chat.py
│   │   └── stock.py
│   ├── routes/              # API endpoints
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── analysis.py
│   │   ├── chat.py
│   │   ├── stocks.py
│   │   └── health.py
│   ├── services/            # Business logic
│   │   ├── __init__.py
│   │   ├── file_processor.py    # PDF/Excel extraction
│   │   ├── embeddings.py         # Vector embeddings
│   │   ├── ai_analyzer.py        # Report generation
│   │   ├── rag_retriever.py      # RAG chat
│   │   └── stock_screener.py
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── storage.py       # Supabase storage
│   │   ├── db.py            # Database utils
│   │   └── validators.py
│   └── tasks/               # Celery tasks
│       ├── __init__.py
│       └── process_files.py
├── tests/
│   ├── __init__.py
│   ├── test_auth.py
│   ├── test_analysis.py
│   └── test_chat.py
├── .env.example
├── requirements.txt
├── docker-compose.yml       # Redis, PostgreSQL
├── Dockerfile
└── README.md
```

---

## 🔑 Phase 2: Authentication & Database (Days 1-2)

### Step 2.1: Supabase Integration
```python
# app/utils/storage.py
from supabase import create_client, Client

class SupabaseClient:
    def __init__(self):
        self.client: Client = create_client(
            supabase_url=os.getenv("SUPABASE_URL"),
            supabase_key=os.getenv("SUPABASE_KEY")
        )
    
    def upload_file(self, file_path, bucket="financial-documents"):
        with open(file_path, "rb") as f:
            self.client.storage.from_(bucket).upload(
                file_path.name, f
            )
    
    def get_file_url(self, file_path, bucket="financial-documents"):
        return self.client.storage.from_(bucket).get_public_url(file_path)
```

### Step 2.2: User Authentication
```python
# app/routes/auth.py
from fastapi import APIRouter, HTTPException
from app.services.auth import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register")
async def register(email: str, password: str, name: str):
    # Sign up with Supabase
    # Store in PostgreSQL users table
    pass

@router.post("/login")
async def login(email: str, password: str):
    # Authenticate with Supabase
    # Return JWT token
    pass

@router.post("/logout")
async def logout(token: str):
    # Invalidate token
    pass
```

---

## 📄 Phase 3: File Processing Pipeline (Days 3-5)

### Step 3.1: PDF & Excel Text Extraction
```python
# app/services/file_processor.py
import PyPDF2
import openpyxl
import pandas as pd
from pathlib import Path

class FileProcessor:
    """Extract text and tables from financial documents"""
    
    @staticmethod
    def extract_from_pdf(file_path: str) -> str:
        """Extract text from PDF"""
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            text = ""
            for page in reader.pages:
                text += page.extract_text()
        return text
    
    @staticmethod
    def extract_from_excel(file_path: str) -> str:
        """Extract text and tables from Excel"""
        df = pd.read_excel(file_path)
        return df.to_string()
    
    @staticmethod
    def extract_from_csv(file_path: str) -> str:
        """Extract text from CSV"""
        df = pd.read_csv(file_path)
        return df.to_string()
    
    @staticmethod
    def clean_text(text: str) -> str:
        """Clean and normalize text"""
        # Remove extra whitespace
        text = ' '.join(text.split())
        # Remove special characters
        text = text.replace('\x00', '')
        return text
```

### Step 3.2: Text Chunking
```python
# app/services/embeddings.py
from langchain.text_splitter import RecursiveCharacterTextSplitter

class TextChunker:
    """Split text into chunks for embeddings"""
    
    @staticmethod
    def chunk_text(text: str, chunk_size=1000, overlap=100):
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=overlap,
            separators=["\n\n", "\n", " ", ""]
        )
        chunks = splitter.split_text(text)
        return chunks
```

### Step 3.3: File Processing Endpoint
```python
# app/routes/analysis.py
from fastapi import APIRouter, UploadFile, File, Depends
from app.tasks.process_files import process_file_task

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    1. Save file to Supabase storage
    2. Queue Celery task for processing
    3. Return task ID for polling
    """
    # Save to temporary location
    file_path = f"/tmp/{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())
    
    # Upload to Supabase
    supabase.upload_file(file_path)
    
    # Queue background task
    task = process_file_task.delay(file.filename)
    
    return {
        "task_id": task.id,
        "file_name": file.filename,
        "status": "processing"
    }

@router.get("/status/{task_id}")
async def get_task_status(task_id: str):
    """Get status of file processing"""
    task = process_file_task.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": task.status,
        "progress": task.info.get("progress", 0) if task.info else 0
    }
```

---

## 🤖 Phase 4: AI Report Generation (Days 6-8)

### Step 4.1: OpenAI/Claude Integration
```python
# app/services/ai_analyzer.py
from langchain.llms import OpenAI  # or Claude
from langchain.prompts import PromptTemplate

class FinancialAnalyzer:
    """Generate equity research reports"""
    
    def __init__(self):
        self.llm = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            model_name="gpt-4"
        )
    
    def generate_report(self, document_text: str) -> dict:
        """Generate comprehensive financial analysis"""
        
        prompt = PromptTemplate(
            template="""
            You are a professional equity research analyst with 15+ years experience.
            Analyze the following financial statements and provide:
            
            1. **Profitability Analysis**
               - Net margins, operating margins, ROE
               - Trend over last 3 years
            
            2. **Liquidity & Solvency Analysis**
               - Current ratio, quick ratio
               - Debt levels, debt-to-equity ratio
               - Interest coverage
            
            3. **Key Financial Ratios**
               - P/E ratio with benchmark
               - ROA, ROE, ROIC
               - Asset turnover
            
            4. **Performance Drivers**
               - Revenue growth drivers
               - Margin trends
               - Cost structure
            
            5. **Red Flags**
               - Declining revenues
               - Rising debt
               - Falling margins
            
            6. **Strengths**
               - Competitive advantages
               - Brand value
               - Market position
            
            7. **Investment Assessment**
               - Risk vs reward
               - Valuation recommendation (without financial advice)
            
            Document Text:
            {text}
            
            Provide structured JSON output.
            """,
            input_variables=["text"]
        )
        
        chain = prompt | self.llm | self._parse_json
        report = chain.invoke({"text": document_text})
        
        return report
    
    @staticmethod
    def _parse_json(output: str) -> dict:
        """Parse LLM output to structured data"""
        import json
        try:
            return json.loads(output)
        except:
            # Fallback parsing
            return {"analysis": output}
```

### Step 4.2: Report Storage
```python
# Database model
from sqlalchemy import Column, String, JSON, DateTime

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    company_name = Column(String)
    ticker = Column(String)
    analysis_data = Column(JSON)  # Full AI analysis
    overall_score = Column(Float)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
```

---

## 💬 Phase 5: RAG Chat System (Days 9-11)

### Step 5.1: Vector Embeddings (Chroma/Pinecone)
```python
# app/services/embeddings.py
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma  # or Pinecone

class EmbeddingService:
    """Generate and store vector embeddings"""
    
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        self.vector_store = Chroma(
            collection_name="financial_documents",
            embedding_function=self.embeddings
        )
    
    def add_documents(self, chunks: list[str], document_id: str):
        """Add document chunks to vector store"""
        metadatas = [{"document_id": document_id, "index": i} 
                     for i in range(len(chunks))]
        
        self.vector_store.add_texts(
            texts=chunks,
            metadatas=metadatas
        )
    
    def search(self, query: str, k=5) -> list[tuple[str, float]]:
        """Semantic search for relevant chunks"""
        results = self.vector_store.similarity_search_with_score(query, k=k)
        return results
```

### Step 5.2: RAG Chat Implementation
```python
# app/services/rag_retriever.py
from langchain.chains import RetrievalQA

class RAGChatService:
    """Answer questions using document context (RAG)"""
    
    def __init__(self):
        self.embeddings = EmbeddingService()
        self.llm = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    def answer_question(self, question: str, document_id: str) -> dict:
        """
        1. Retrieve relevant document chunks
        2. Create context
        3. Generate answer
        4. Return answer + sources
        """
        
        # Retrieve relevant chunks
        qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.embeddings.vector_store.as_retriever()
        )
        
        response = qa_chain.run(question)
        
        # Get source documents
        sources = self.embeddings.search(question, k=3)
        
        return {
            "answer": response,
            "sources": [
                {
                    "text": source[0],
                    "relevance": source[1]
                }
                for source in sources
            ]
        }
```

### Step 5.3: Chat Endpoint
```python
# app/routes/chat.py
@router.post("/chat/{report_id}")
async def chat(report_id: str, message: str):
    """Answer questions about a report"""
    
    rag_service = RAGChatService()
    response = rag_service.answer_question(message, report_id)
    
    # Store in database
    chat_msg = ChatMessage(
        report_id=report_id,
        role="assistant",
        content=response["answer"],
        sources=response["sources"]
    )
    db.add(chat_msg)
    db.commit()
    
    return response
```

---

## 📊 Phase 6: Stock Screener Backend (Days 12-14)

### Step 6.1: Stock Data Model
```python
# app/models/stock.py
class Stock(Base):
    __tablename__ = "stocks"
    
    id = Column(String, primary_key=True)
    ticker = Column(String, unique=True)
    company_name = Column(String)
    sector = Column(String)
    
    # Financial metrics
    pe_ratio = Column(Float)
    revenue_growth = Column(Float)
    profit_margin = Column(Float)
    roe = Column(Float)
    debt_to_equity = Column(Float)
    dividend_yield = Column(Float)
    current_ratio = Column(Float)
    market_cap = Column(BigInteger)
    
    # Metadata
    last_updated = Column(DateTime)
```

### Step 6.2: Stock Screener Logic
```python
# app/services/stock_screener.py
from sqlalchemy import select, and_

class StockScreener:
    """Filter and rank stocks by criteria"""
    
    def scan(self, filters: list[dict]) -> list[dict]:
        """
        Filters format:
        [
            {"field": "pe_ratio", "operator": "<", "value": 30},
            {"field": "revenue_growth", "operator": ">", "value": 15},
            {"field": "sector", "operator": "=", "value": "Technology"}
        ]
        """
        
        query = select(Stock)
        
        for filter in filters:
            field = getattr(Stock, filter["field"])
            operator = filter["operator"]
            value = filter["value"]
            
            if operator == ">":
                query = query.where(field > value)
            elif operator == "<":
                query = query.where(field < value)
            elif operator == "=":
                query = query.where(field == value)
            # ... other operators
        
        results = db.execute(query).scalars().all()
        
        # Calculate match scores
        scored_results = self._calculate_match_scores(results, filters)
        
        return scored_results
    
    @staticmethod
    def _calculate_match_scores(stocks: list, filters: list) -> list:
        """Score each stock based on how well it matches filters"""
        # Implementation: score between 0-100
        pass
```

### Step 6.3: Stock Screener Endpoint
```python
# app/routes/stocks.py
@router.post("/screen")
async def screen_stocks(filters: list[FilterSchema]):
    """Run stock screener"""
    screener = StockScreener()
    results = screener.scan(filters)
    return {"results": results, "count": len(results)}
```

---

## 🔄 Background Tasks (Celery)

### Step 7.1: Celery Configuration
```python
# app/tasks/context.py
from celery import Celery

celery_app = Celery(
    "fund_vision",
    broker=os.getenv("REDIS_URL"),
    backend=os.getenv("REDIS_URL")
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
)
```

### Step 7.2: Background File Processing
```python
# app/tasks/process_files.py
@celery_app.task(bind=True)
def process_file_task(self, file_name: str):
    """Background task: upload → extract → embed → analyze"""
    
    # Step 1: Extract text (25%)
    processor = FileProcessor()
    text = processor.extract_from_pdf(file_name)
    self.update_state(state='PROGRESS', meta={'progress': 25})
    
    # Step 2: Chunk text (50%)
    chunker = TextChunker()
    chunks = chunker.chunk_text(text)
    self.update_state(state='PROGRESS', meta={'progress': 50})
    
    # Step 3: Generate embeddings (75%)
    embeddings = EmbeddingService()
    embeddings.add_documents(chunks, file_name)
    self.update_state(state='PROGRESS', meta={'progress': 75})
    
    # Step 4: Generate report (90%)
    analyzer = FinancialAnalyzer()
    report = analyzer.generate_report(text)
    self.update_state(state='PROGRESS', meta={'progress': 90})
    
    # Store in database (100%)
    report_record = Report(
        id=str(uuid.uuid4()),
        user_id=get_current_user(),
        analysis_data=report,
        overall_score=calculate_score(report)
    )
    db.add(report_record)
    db.commit()
    
    return {"status": "complete", "report_id": report_record.id}
```

---

## 📦 Dependencies to Install

```bash
# Core
pip install fastapi uvicorn python-multipart

# Database
pip install sqlalchemy psycopg2-binary alembic
pip install supabase

# Auth
pip install python-jose passlib bcrypt
pip install python-dotenv

# AI & NLP
pip install openai langchain
pip install chromadb pinecone-client

# File processing
pip install PyPDF2 openpyxl pandas

# Background tasks
pip install celery redis

# Testing
pip install pytest pytest-asyncio

# Validation
pip install pydantic

# Environment
pip install python-dotenv
```

---

## 🚀 Deployment Checklist

- [ ] Environment variables configured (.env)
- [ ] Database migrations run (Alembic)
- [ ] Redis running (for Celery)
- [ ] All tests passing
- [ ] OpenAI API key configured
- [ ] Supabase bucket configured
- [ ] CORS configured for frontend
- [ ] Rate limiting enabled
- [ ] Error handling implemented
- [ ] Logging configured

---

## 📅 Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| 1. Setup | 1 day | ⏳ To Do |
| 2. Auth & DB | 2 days | ⏳ To Do |
| 3. File Processing | 3 days | ⏳ To Do |
| 4. AI Reports | 3 days | ⏳ To Do |
| 5. RAG Chat | 3 days | ⏳ To Do |
| 6. Stock Screener | 3 days | ⏳ To Do |
| 7. Testing & Deploy | 2 days | ⏳ To Do |
| **Total** | **~2 weeks** | |

---

## 🎯 Success Criteria

✅ All API endpoints tested and working
✅ File processing pipeline functional
✅ AI reports generated successfully
✅ RAG chat with sources working
✅ Stock screener filtering correctly
✅ All tests passing (>80% coverage)
✅ Production-ready deployment

---

**Ready to build? Let's start with Phase 1! 🚀**
