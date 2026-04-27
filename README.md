<div align="center">
<img width="1200" height="475" alt="AI Career Coach" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Career Coach 🚀

A LangGraph-powered AI agent system for career coaching with React frontend.

## Features

- 🤖 **AI Agent** - LangGraph ReAct agent with 9 tools (web search, job research, memory)
- 🧠 **Interactive Thinking** - Animated AI thought visualization
- 🇻🇳 **Vietnamese Support** - Full i18n with EN/VI toggle
- 🐳 **Docker Ready** - CI/CD pipeline with GitHub Actions
- ⚡ **Fast** - React 19 + Vite + Gemini 2.5 Pro

## Quick Start

### With Docker (Recommended)

```bash
# Clone and start
cp .env.example .env
# Add your API keys to .env
docker compose up -d

# Visit
open http://localhost:3000
```

### Local Development

**Frontend:**
```bash
cd frontend
npm install
npm run dev     # http://localhost:3000
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
# Add your API keys to .env
uvicorn main:app --port 8000
```

## Project Structure

```
ai-career-coach/
├── frontend/          # React + Vite + Tailwind
│   ├── components/   # React components
│   ├── src/         # i18n, locales
│   ├── services/    # API services
│   └── Dockerfile   # Multi-stage build
├── backend/         # Python FastAPI
│   ├── agent/       # LangGraph agent
│   ├── memory/      # Supabase vector store
│   ├── api/         # REST API
│   └── Dockerfile   # Python 3.12
├── docker-compose.yml
├── .github/workflows/
│   └── ci.yml       # GitHub Actions
└── package.json     # Root scripts
```

## Environment Variables

Create `.env`:

```bash
# Frontend (optional - uses CDN by default)
GEMINI_API_KEY=your_key

# Backend (required)
GOOGLE_API_KEY=your_google_api_key
TAVILY_API_KEY=your_tavily_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

Get your API keys:
- [Google AI Studio](https://aistudio.google.com/apikey)
- [Tavily](https://tavily.com)
- [Supabase](https://supabase.com)

## Tech Stack

### Frontend
- React 19
- Vite 6
- Tailwind CSS
- i18next
- Gemini AI

### Backend
- FastAPI
- LangGraph (ReAct agent)
- Supabase PGvector
- Tavily web search
- Python 3.12

## Available Scripts

```bash
npm run dev          # Start both services
npm run dev:frontend  # Frontend only
npm run dev:backend  # Backend only  
npm run build       # Build both
npm run start       # Docker compose up
npm run stop        # Docker compose down
```

## CI/CD

Push to `main` branch triggers GitHub Actions:
1. Backend test & Docker build
2. Frontend build
3. Docker compose scan
4. Health checks
5. Deploy (configure in `.github/workflows/ci.yml`)

## License

MIT