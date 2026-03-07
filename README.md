# 📊 Fundamental Analysis Platform

AI-powered financial analysis platform for investors and analysts. Upload financial documents, get AI-generated insights, manage portfolios, and track stocks with real-time alerts.

## ✨ Features

- 🤖 **AI Document Analysis** - Upload annual reports, 10-Ks, earnings reports and get instant AI-powered analysis
- 💬 **Chat with Documents** - Ask questions about your financial documents with RAG-powered Q&A
- 📈 **Portfolio Management** - Track multiple portfolios with real-time performance metrics
- 👀 **Smart Watchlists** - Monitor stocks with custom alerts and price targets
- 🔔 **Price Alerts** - Get notified when stocks hit your target prices
- 📊 **Stock Scanner** - Filter and screen stocks by fundamental metrics
- 💳 **Subscription Plans** - Free tier + Premium plans with advanced features
- 🔒 **Secure Authentication** - Powered by Supabase Auth

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Supabase account
- OpenAI or Anthropic API key
- Stock market data API key (Alpha Vantage, FMP, or Polygon)

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/fundamental-analysis.git
cd fundamental-analysis
```

2. **Set up Frontend**
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
# VITE_API_URL=http://localhost:8080
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Start development server
npm run dev
```

3. **Set up Backend**
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your credentials (see backend/.env.example)

# Start backend server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

4. **Set up Database**
- Create Supabase project
- Run `COMPLETE_SETUP.sql` in SQL Editor
- Configure authentication settings

5. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- API Docs: http://localhost:8080/docs

## 🌐 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment instructions.

**Quick Deploy:**
- **Frontend:** Deploy to Vercel (see `vercel.json`)
- **Backend:** Deploy to Render (see `render.yaml`)
- **Database:** Supabase (managed PostgreSQL)

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT.md) - Complete deployment instructions
- [Quickstart Guide](QUICKSTART.md) - Get started quickly
- [Frontend Guide](FRONTEND_README.md) - Frontend architecture
- [Supabase Setup](SUPABASE_SETUP.md) - Database configuration
- [API Documentation](http://localhost:8080/docs) - Interactive API docs (when running)

## 🏗️ Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **UI Components:** shadcn/ui + Tailwind CSS
- **State Management:** Zustand
- **Routing:** React Router
- **HTTP Client:** Axios

### Backend
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL (Supabase)
- **Authentication:** Supabase Auth + JWT
- **AI:** OpenAI GPT-4 / Anthropic Claude
- **Vector DB:** ChromaDB (for RAG)
- **File Storage:** Supabase Storage
- **Task Queue:** Celery (optional)

## 📁 Project Structure

```
.
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── pages/              # Page components
│   ├── lib/                # Utilities and API client
│   ├── hooks/              # Custom React hooks
│   └── store/              # State management
├── backend/                # Backend source code
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Core functionality
│   │   ├── models/         # Data models
│   │   └── services/       # Business logic
│   └── migrations/         # Database migrations
├── public/                 # Static assets
├── DEPLOYMENT.md           # Deployment guide
├── vercel.json             # Vercel configuration
└── render.yaml             # Render configuration
```

## 🔑 Environment Variables

### Frontend
```bash
VITE_API_URL=http://localhost:8080
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_key
```

### Backend
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
OPENAI_API_KEY=sk-...
ALPHA_VANTAGE_API_KEY=your_key
```

See `.env.example` files for complete list.

## 🧪 Testing

```bash
# Frontend tests
npm run test

# Backend tests
cd backend
pytest
```

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines first.

## 📧 Support

- Documentation: See `/docs` folder
- Issues: [GitHub Issues](https://github.com/yourusername/fundamental-analysis/issues)
- Email: support@yourdomain.com

---

**Built with ❤️ for investors and analysts**
- Tailwind CSS

## How can I deploy this project?

Open your deployment dashboard and click Share -> Publish (or follow your hosting provider's publish workflow).

## Can I connect a custom domain to my project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more in your hosting provider's documentation for custom domains.
