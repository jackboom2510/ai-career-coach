# 🏗️ Architecture Overview

## Before vs After

### ❌ BEFORE: Direct Gemini SDK
```
Frontend (ChatAssistant.tsx)
    │
    └──> chatWithCoach()
            │
            └──> Google Gemini SDK (Direct)
                    │
                    └──> Response (No tools, no memory)
```

---

### ✅ AFTER: Backend LangGraph

```
Frontend (ChatAssistant.tsx)
    │
    └──> chatWithCoachBackend()
            │ POST /agent/chat
            ↓
Backend (FastAPI)
    │
    ├──> run_agent() [LangGraph]
    │
    ├─── select_agent()
    │    ├─ Keyword detection
    │    └─ Choose: research/coaching/memory
    │
    ├─── reasoning_node()
    │    ├─ System prompt (role-specific)
    │    ├─ User context (profile, roadmap)
    │    └─ Bind tools (permitted set)
    │
    ├─── LLM (gemini-3.1-pro-preview)
    │    └─ Decides which tool to call
    │
    └─── ToolNode
         ├─ search_web()
         ├─ get_salary_insights()
         ├─ store_learning()
         └─ validate_resource()
              ↓
              Supabase (Memory, conversations)
              ↓
Response ← {response, conversation_id, tools_called}
    │
    └──> Frontend: Display + Save conversationId
```

---

## Agent Selection Logic

```python
User Message: "What's the salary for React developers?"
                ↓
            select_agent()
                ↓
        Keyword Detection: "salary" → RESEARCH
                ↓
        System Prompt: "You are a research-focused agent..."
                ↓
        Permitted Tools: search_web, search_job_listings, get_salary_insights
                ↓
        LLM Response: [Tool call: get_salary_insights("React")]
                ↓
        ToolNode Execution
                ↓
        Final Response: "React devs earn $X-$Y..."
```

---

## Tool Categories

### 🔍 RESEARCH_TOOLS (Job market focused)
```python
[
  search_web,                # General web search
  search_job_listings,       # Job board scraping
  get_salary_insights        # Salary data
]
```

**Trigger Keywords:** salary, job market, hiring, pay, demand, remote

---

### 🎓 COACHING_TOOLS (Learning focused)
```python
[
  validate_resource,         # Check if URL is good resource
  calculate_pace_adjustment, # Track learning speed
  suggest_topic_resources    # Recommend learning materials
]
```

**Trigger Keywords:** learn, stuck, task, difficulty, pace, help

---

### 💾 MEMORY_TOOLS (Memory focused)
```python
[
  retrieve_memories,         # Recall past conversations
  get_conversation_context,  # Load previous messages
  store_learning             # Save new insights
]
```

**Trigger Keywords:** remember, previous, past, history, learned, saved

---

## Message Flow Example

### Query: "I'm struggling with TypeScript, what should I do?"

```
1. FRONTEND
   chatWithCoachBackend("I'm struggling with...", 
     userProfile={target:"DevOps", current:"Linux Admin"},
     userId="user_123",
     conversationId="conv_456")

2. BACKEND /agent/chat endpoint receives request

3. select_agent()
   Keywords: "struggling" → COACHING agent selected

4. reasoning_node()
   System: "You are a coaching-focused agent who helps users..."
   Available tools: validate_resource, calculate_pace, suggest_resources

5. LLM (gemini-3.1-pro-preview)
   Input: "I'm struggling with TypeScript..."
   Decision: Call suggest_topic_resources("TypeScript", "Intermediate")

6. ToolNode Execution
   suggest_topic_resources returns:
   - Udemy: "Complete TypeScript Course" 
   - FreeCodeCamp: "TypeScript Handbook"
   - Official: "TypeScript Docs"

7. LLM Final Response
   "I see you're working on TypeScript. Here are the best resources..."
   
8. BACKEND RESPONSE
   {
     "response": "...",
     "conversation_id": "conv_456",
     "tools_called": [
       { "name": "suggest_topic_resources", 
         "args": {"topic": "TypeScript", "difficulty": "Intermediate"} }
     ]
   }

9. FRONTEND
   Display message in ChatBox
   Save conversationId for next message
```

---

## State Management

```python
# backend/agent/state.py
AgentState TypedDict:
  ├─ messages              # [HumanMessage, AIMessage, ToolMessage, ...]
  ├─ user_profile          # {target_role, current_role, timeline_months}
  ├─ roadmap_state         # [{weekNumber, theme, tasks, ...}]
  ├─ current_week          # int
  ├─ selected_agent        # "research" | "coaching" | "memory"
  ├─ tools_called          # [{name, args}]
  ├─ should_replan         # bool
  ├─ iteration_count       # int (prevents infinite loops)
  ├─ user_id               # str
  ├─ conversation_id       # str (persistent across messages)
  └─ user_language         # "Vietnamese" | "English"
```

---

## API Contract

### Request to `/agent/chat`
```json
{
  "message": "string",
  "user_profile": {
    "target_role": "string",
    "current_role": "string", 
    "timeline_months": number
  },
  "roadmap_state": [
    {
      "weekNumber": number,
      "theme": "string",
      "tasks": [{"description": "string", "completed": boolean}]
    }
  ],
  "current_week": number,
  "user_id": "string",
  "conversation_id": "string (optional)",
  "user_language": "Vietnamese" | "English"
}
```

### Response from `/agent/chat`
```json
{
  "response": "string",
  "conversation_id": "string (UUID)",
  "tools_called": [
    {
      "name": "tool_name",
      "args": { "key": "value" }
    }
  ]
}
```

---

## Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Tools** | ❌ None | ✅ 9 tools |
| **Memory** | ❌ Session only | ✅ Persistent Supabase |
| **Agent Type** | ❌ Single | ✅ 3 types (auto-select) |
| **Context** | ❌ Basic | ✅ Full user profile |
| **Job Data** | ❌ Static | ✅ Real-time search |
| **Conversation** | ❌ No persistence | ✅ Full history |
| **Response Quality** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Response Time** | ⚡ 1-2s | 🐢 3-5s (worth it) |

---

## Environment Setup

```bash
# Backend
export GOOGLE_API_KEY="your-key"
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_KEY="your-key"
export TAVILY_API_KEY="your-key"

# Frontend
VITE_API_URL=http://localhost:8000
VITE_CLERK_PUBLISHABLE_KEY="your-key"
```

---

## Testing

```bash
# Integration test
cd backend && PYTHONPATH=. python test_integration.py

# Unit test agent selection
python -c "
from agent.graph import select_agent
msg = type('M',(object,),{'content':'What salary?'})()
print(select_agent({'messages':[msg]}))
"

# Check tools
python -c "
from agent.tools import RESEARCH_TOOLS, COACHING_TOOLS, MEMORY_TOOLS
print('Total tools:', len(RESEARCH_TOOLS + COACHING_TOOLS + MEMORY_TOOLS))
"
```

---

**Last Updated:** 2026-06-09
**Status:** 🟢 Production Ready
