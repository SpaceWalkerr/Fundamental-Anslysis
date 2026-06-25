#!/bin/bash

# FundaKaMental Backend - Development Server Start Script

echo "🚀 Starting FundaKaMental Backend API..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt --quiet

# Check if .env file exists for local development. Hosted deployments inject env vars.
if [ ! -f ".env" ] && [ -z "$SUPABASE_URL" ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your credentials!"
    exit 1
fi

# Create necessary directories
mkdir -p uploads
mkdir -p data/chroma

# Start the server
PORT="${PORT:-${API_PORT:-8080}}"

echo "✨ Starting FastAPI server on http://localhost:${PORT}"
echo "📚 API Docs: http://localhost:${PORT}/api/docs"
echo ""
python -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
