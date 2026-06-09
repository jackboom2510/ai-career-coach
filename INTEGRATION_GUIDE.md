# 🔄 Frontend ↔ Backend LangGraph Integration - Complete

## ✅ What Was Done

### 1. **Resolved Merge Conflict** (`backend/api/routes.py`)
- ✅ Merged both HEAD (memory persistence) and feature branch (push notifications)
- ✅ Unified `/agent/chat` endpoint with conversation tracking + tool execution
- ✅ All classes (ResetRequest, PushSubscription, etc.) now coexist

### 2. **Multi-Agent Architecture** (`backend/agent/`)
```python
# Tool categorization:
RESEARCH_TOOLS      # search_web, search_job_listings, get_salary_insights
COACHING_TOOLS      # validate_resource, calculate_pace, suggest_resources  
MEMORY_TOOLS        # retrieve_memories, store_learning, get_context
```

- `select_agent()` node: Auto-selects agent type based on keywords
- `reasoning_node()`: Generates response with agent-specific system prompt
- Agent roles: Research | Coaching | Memory

### 3. **Frontend-Backend Connection**

#### **Before:**
```typescript
// ❌ Frontend → Gemini SDK (Direct, no tools)
const response = await chatWithCoach(message, context, history);
```

#### **After:**
```typescript
// ✅ Frontend → Backend LangGraph (With tools & memory)
const response = await chatWithCoachBackend(
  message,
  userProfile,
  roadmapState,
  currentWeek,
  userId,
  conversationId,
  userLanguage
);
```

#### **Backend Flow:**
```
Frontend POST /agent/chat
    ↓
Backend ChatRequest (message + context)
    ↓
run_agent() → LangGraph execution
    ├─ select_agent()      [Keyword detection]
    ├─ reasoning_node()    [LLM + tool binding]
    └─ tools ToolNode      [Tool execution]
    ↓
ChatResponse (response + conversation_id + tools_called)
```

### 4. **Configuration**

#### `.env` (Frontend)
```bash
VITE_API_URL=http://localhost:8000
```

#### `ChatAssistant.tsx` - Updated Props:
```typescript
interface Props {
  currentWeek?: RoadmapWeek;
  targetRole?: string;
  userProfile?: { target_role, current_role, timeline_months };
  userId?: string;
  userLanguage?: string;
}
```

---

## 🚀 How to Use

### **1. Start Backend Server**
```bash
cd backend
source .venv/Scripts/activate  # or .venv/bin/activate on Linux

# Make sure env vars are set:
export GOOGLE_API_KEY="your-api-key"
export SUPABASE_URL="your-db-url"
export SUPABASE_KEY="your-db-key"

# Run FastAPI server
uvicorn api.main:app --reload --port 8000
```

### **2. Start Frontend Dev Server**
```bash
cd frontend
npm run dev
# Opens at http://localhost:5173
```

### **3. Test Integration**
```bash
cd backend
PYTHONPATH=. python test_integration.py
```

**Output:**
```
🧪 Testing Backend LangGraph Integration
============================================================
✅ Agent Execution Successful!
🤖 Response: [...]
🔧 Tool Calls Analysis:
   ✅ Tools were invoked: 1 call(s)
      - search_job_listings
✅ Integration test PASSED!
```

---

## 📊 Example Flow

### **User Input:** "What's the job market for Python developers?"

**Step 1: Frontend**
```typescript
await chatWithCoachBackend(
  "What's the job market...",
  { target_role: "Senior Python Dev", ... },
  roadmapState,
  1,
  "user_123",
  "conv_123",
  "English"
)
```

**Step 2: Backend Select Agent**
- Keyword: "job market" → Detected as RESEARCH agent
- Agent selected: `research`

**Step 3: Backend Reasoning**
- System prompt: "You are a research-focused agent..."
- Permitted tools: search_web, search_job_listings, get_salary_insights
- LLM decides: Call `search_job_listings("Python developer")`

**Step 4: Tool Execution**
- ToolNode executes `search_job_listings`
- Returns current job data + salary info

**Step 5: Final Response**
```json
{
  "response": "Based on search, Python developers are in HIGH demand...",
  "conversation_id": "conv_123",
  "tools_called": [
    { "name": "search_job_listings", "args": {"skill": "Python", ...} }
  ]
}
```

**Step 6: Frontend Display**
- Message shown in ChatBox
- Conversation ID persisted for follow-up messages
- Tool calls can be logged/tracked

---

## 🔧 Endpoints

### `POST /agent/chat`
**Request:**
```json
{
  "message": "What tools should I learn?",
  "user_profile": {
    "target_role": "DevOps Engineer",
    "current_role": "Backend Dev",
    "timeline_months": 6
  },
  "roadmap_state": [...],
  "current_week": 1,
  "user_id": "user_123",
  "conversation_id": "conv_123",
  "user_language": "English"
}
```

**Response:**
```json
{
  "response": "Based on your goals...",
  "conversation_id": "conv_123",
  "tools_called": [
    { "name": "tool_name", "args": {...} }
  ]
}
```

### `GET /agent/health`
```json
{ "status": "agent_ready", "tools_count": 9 }
```

### `POST /agent/reset`
```json
{ "conversation_id": "conv_123" }
```

---

## 📈 Agent Behavior

| Query | Selected Agent | Tools | Behavior |
|-------|----------------|-------|----------|
| "What salary for React?" | Research | `get_salary_insights`, `search_web` | Researches job market data |
| "I'm stuck on this task" | Coaching | `calculate_pace_adjustment`, `validate_resource` | Analyzes progress, suggests resources |
| "Remember we discussed?" | Memory | `retrieve_memories`, `store_learning` | Recalls past conversations, learns |
| "Tell me about my progress" | Coaching | `calculate_pace_adjustment` | Evaluates learning pace |

---

## 🐛 Debug Tips

### View Agent Selection:
```python
result = await run_agent(...)
selected_agent = result.get("selected_agent")  # "research" | "coaching" | "memory"
```

### Track Tool Calls:
```python
for msg in result.get("messages", []):
    if hasattr(msg, "tool_calls"):
        for tc in msg.tool_calls:
            print(f"Tool: {tc['name']}, Args: {tc['args']}")
```

### Check Conversation Persistence:
```python
# Second message with same conversation_id reuses history
result = await run_agent(
    "Follow-up question...",
    conversation_id="conv_123"  # ← Same as first message
)
# Backend retrieves previous context from Supabase
```

---

## 📝 Files Changed

| File | Changes |
|------|---------|
| `backend/api/routes.py` | Merged conflict, unified endpoints |
| `backend/agent/graph.py` | Added `select_agent()`, multi-agent support |
| `backend/agent/tools/__init__.py` | Tool categorization (RESEARCH, COACHING, MEMORY) |
| `backend/agent/state.py` | Added `selected_agent` field |
| `frontend/services/geminiService.ts` | Added `chatWithCoachBackend()` function |
| `frontend/components/ChatAssistant.tsx` | Connected to backend LangGraph |
| `frontend/.env` | Added `VITE_API_URL` config |
| `backend/test_integration.py` | NEW: Integration test script |

---

## ✨ What's New

### Memory Persistence
- Conversations saved to Supabase with vector embeddings
- Auto-retrieved for context in follow-up messages
- `conversation_id` ensures conversation continuity

### Tool-Driven Responses
- Agent selects appropriate tools based on query
- Tools provide real-time data (job market, salaries, resources)
- Response includes `tools_called` metadata

### Multi-Agent Orchestration
- Keywords trigger agent selection (research/coaching/memory)
- Each agent has specific permitted tools
- Single LLM handles all agents with role-specific prompts

### Better Error Handling
- Backend catches exceptions, returns structured errors
- Frontend displays user-friendly messages
- Tool failures don't crash agent (graceful fallback)

---

## 🎯 Next Steps (Optional)

1. **Separate Agent Modules** - Move each agent to `backend/agent/agents/`
2. **Agent-to-Agent Communication** - Enable research agent to help coaching agent
3. **Streaming Responses** - Use SSE for real-time tool call updates
4. **Tool Monitoring** - Log all tool calls for analytics
5. **Conversation Analytics** - Track user patterns, success rates

---

## ✅ Testing Checklist

- [x] Backend compiles without errors
- [x] Frontend connects to backend
- [x] Agent selection works (research/coaching/memory)
- [x] Tools execute properly
- [x] Conversation persistence works
- [x] Merge conflict resolved
- [x] Integration test passes
- [ ] Load test with multiple concurrent users
- [ ] E2E test through frontend UI
- [ ] Production deployment

---

**Last Updated:** 2026-06-09
**Status:** 🟢 Ready for Testing
