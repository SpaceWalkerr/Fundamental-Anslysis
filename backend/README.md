# FastAPI Backend - FundaVision

AI-powered fundamental analysis platform backend built with FastAPI, Supabase, and LangChain.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

**Required credentials:**
- Supabase URL and keys (from your Supabase dashboard)
- OpenAI API key or Anthropic API key
- JWT secret key (generate a secure random string)

### 3. Run the Server

```bash
# Development mode (with auto-reload)
python -m app.main

# Or using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server will start at: **http://localhost:8000**

API Documentation: **http://localhost:8000/api/docs**

---

## 📁 Project Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app entry point
│   ├── api/
│   │   └── endpoints/          # API route handlers
│   │       ├── auth.py         # Authentication endpoints
│   │       ├── analysis.py     # File upload & analysis
│   │       ├── chat.py         # RAG Q&A endpoints
│   │       ├── stocks.py       # Company search & screener
│   │       └── reports.py      # Report retrieval
│   ├── core/
│   │   ├── config.py           # Configuration management
│   │   └── security.py         # JWT & auth utilities
│   ├── db/
│   │   └── database.py         # Supabase connection
│   ├── models/
│   │   └── schemas.py          # Pydantic models
│   ├── services/               # Business logic (TODO)
│   │   ├── file_processor.py  # PDF/Excel extraction
│   │   ├── ai_analyzer.py     # LLM report generation
│   │   └── rag_engine.py      # Vector search & RAG
│   └── utils/                  # Helper functions
├── tests/                      # Unit tests
├── uploads/                    # Temporary file storage
├── data/                       # ChromaDB vector storage
├── requirements.txt            # Python dependencies
├── .env.example                # Environment template
└── README.md                   # This file
```

---

## 🔐 Authentication Flow

1. **Register:** `POST /api/auth/register`
2. **Login:** `POST /api/auth/login` → Returns JWT token
3. **Use token:** Add `Authorization: Bearer <token>` to all requests
4. **Get profile:** `GET /api/auth/me`

---

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout

### Analysis
- `POST /api/analysis/upload` - Upload financial document
- `POST /api/analysis/analyze` - Start analysis
- `GET /api/analysis/status/{report_id}` - Get processing status

### Chat (RAG Q&A)
- `POST /api/chat/message` - Send message, get AI response with sources
- `GET /api/chat/history/{report_id}` - Get chat history

### Stocks
- `GET /api/stocks/search?query={ticker}` - Search companies
- `POST /api/stocks/screener` - Run stock screener (Premium)
- `GET /api/stocks/details/{ticker}` - Get stock details

### Reports
- `GET /api/reports/list` - Get all reports
- `GET /api/reports/{report_id}` - Get specific report
- `DELETE /api/reports/{report_id}` - Delete report

---

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py
```

---

## 🔧 Development

### Code Style
```bash
# Format code
black app/

# Lint code
flake8 app/
```

### Database Migrations
The app uses Supabase, so database schema is managed through SQL:
- Schema file: `../supabase-schema.sql`
- Run in Supabase SQL editor to create tables

---

## 📦 Dependencies

### Core
- **FastAPI** - Modern web framework
- **Supabase** - Database & auth
- **Pydantic** - Data validation

### AI & ML
- **OpenAI/Anthropic** - LLM for analysis
- **LangChain** - LLM orchestration
- **ChromaDB** - Vector database
- **sentence-transformers** - Embeddings

### Document Processing
- **PyPDF2/pdfplumber** - PDF extraction
- **openpyxl** - Excel files
- **pandas** - Data manipulation

### Background Tasks
- **Celery** - Task queue
- **Redis** - Message broker

---

## 🚀 Deployment

### Production Checklist
- [ ] Set `ENVIRONMENT=production` in .env
- [ ] Set `DEBUG=False`
- [ ] Use strong `SECRET_KEY`
- [ ] Configure CORS origins
- [ ] Set up Redis for caching
- [ ] Configure Celery workers
- [ ] Set up monitoring (Sentry, etc.)

### Deploy to Cloud
```bash
# Using Docker (coming soon)
docker build -t fundavision-api .
docker run -p 8000:8000 fundavision-api

# Using Railway/Render/etc.
# Push to GitHub and connect repository
```

---

## 🐛 Troubleshooting

### Error: "Failed to connect to Supabase"
- Check SUPABASE_URL and SUPABASE_KEY in .env
- Verify database schema is created

### Error: "Token has expired"
- Tokens expire after 30 minutes
- Re-login to get a new token

### Error: "File too large"
- Max upload size: 25MB
- Compress files before uploading

---

## 📝 TODO

- [ ] Implement actual file processing pipeline
- [ ] Add LLM integration for report generation
- [ ] Implement RAG with ChromaDB
- [ ] Add Celery background tasks
- [ ] Add Redis caching
- [ ] Add comprehensive tests
- [ ] Add rate limiting
- [ ] Add API key management
- [ ] Add webhook notifications

---

## 📄 License

MIT License - See LICENSE file

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

---

**Built with ❤️ using FastAPI, Supabase, and OpenAI**
