from typing import Literal, Any
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI

from agent.state import AgentState, ToolCall
from agent.tools import TOOLS


llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0.7,
)

SYSTEM_PROMPT = """You are an expert AI Career Coach agent helping users transition into tech careers.

You have access to tools that allow you to:
- Search job listings to validate skill demand (search_job_listings)
- Validate learning resources (validate_resource)
- Calculate learning pace adjustments (calculate_pace_adjustment)
- Suggest topic resources (suggest_topic_resources)

Your approach:
1. Understand the user's request
2. If research is needed, use appropriate tools
3. Provide actionable advice based on gathered data

Always be encouraging but specific. Reference their target role and current progress when relevant.
"""

intent_categories = {
    "research": ["research", "search", "find", "look up", "job market", "demand", "skills needed"],
    "roadmap_update": ["change", "update", "modify", "add task", "remove task", "regenerate"],
    "pace": ["pace", "progress", "time", "hours", "adjust"],
    "resource": ["resource", "link", "tutorial", "course", "documentation", "valid"],
    "general": [],
}


def classify_intent(message: str) -> str:
    message_lower = str(message).lower()
    for category, keywords in intent_categories.items():
        if any(kw in message_lower for kw in keywords):
            return category
    return "general"


def analyze_intent(state: AgentState) -> AgentState:
    return state


def build_context_for_llm(state: AgentState) -> str:
    context_parts = []
    profile = state.get("user_profile")
    if profile:
        context_parts.append(f"Target Role: {profile.get('target_role', 'Not set')}")
        context_parts.append(f"Current Role: {profile.get('current_role', 'Not set')}")
        context_parts.append(f"Timeline: {profile.get('timeline_months', 0)} months")

    roadmap = state.get("roadmap_state")
    if roadmap:
        current_week = state.get("current_week", 1)
        week = next((w for w in roadmap if w["week_number"] == current_week), None)
        if week:
            context_parts.append(f"Current Week {current_week}: {week.get('theme', 'N/A')}")
            tasks = [t["description"] for t in week.get("tasks", []) if not t.get("completed", False)]
            if tasks:
                context_parts.append(f"Remaining tasks: {', '.join(tasks[:3])}")

    return "\n".join(context_parts) if context_parts else "No context available"


def llm_reasoner(state: AgentState) -> AgentState:
    context = build_context_for_llm(state)
    conversation = "\n".join(
        [f"{'User' if isinstance(m, HumanMessage) else 'Assistant'}: {m.content}"
         for m in state["messages"][-5:]]
    )

    prompt = f"""Context:
{context}

Available tools:
- search_job_listings(skill: str)
- validate_resource(url: str, topic: str)
- calculate_pace_adjustment(total_tasks: int, completed_tasks: int, weeks_elapsed: int, timeline_months: int)
- suggest_topic_resources(topic: str, difficulty: str)

Recent conversation:
{conversation}

Based on the context and conversation, determine if you need to use any tools.

If you need to use a tool, respond ONLY with a JSON object:
{{"tool_name": "tool_name", "input_data": {{"param": "value"}}}}

If no tool is needed, respond with:
{{"tool_name": null, "response": "your helpful response here"}}
"""

    response = llm.invoke([HumanMessage(content=prompt)])
    response_text = response.content if hasattr(response, "content") else str(response)

    tool_call: ToolCall | None = None
    user_response = ""

    import json
    try:
        parsed = json.loads(response_text)
        if parsed.get("tool_name"):
            tool_call = {
                "tool_name": parsed["tool_name"],
                "input_data": parsed.get("input_data", {}),
                "output": None,
            }
    except (json.JSONDecodeError, ValueError):
        user_response = response_text

    if tool_call:
        state["messages"].append(AIMessage(content=f"Using tool: {tool_call['tool_name']}"))
        state["tools_called"].append(tool_call)
    else:
        state["messages"].append(AIMessage(content=user_response or response_text))

    state["iteration_count"] = state.get("iteration_count", 0) + 1
    return state


def tool_executor(state: AgentState) -> AgentState:
    if not state.get("tools_called"):
        return state

    last_tool = state["tools_called"][-1]
    tool_name = last_tool.get("tool_name")
    input_data = last_tool.get("input_data", {})

    for t in TOOLS:
        if t.name == tool_name:
            try:
                result = t.invoke(input_data)
                state["tools_called"][-1]["output"] = str(result)
                state["messages"].append(AIMessage(content=f"Tool result: {result}"))
            except Exception as e:
                state["messages"].append(AIMessage(content=f"Tool error: {str(e)}"))
            break

    return state


def update_memory(state: AgentState) -> AgentState:
    # Memory update will be implemented with Supabase in Phase 4
    return state


def should_continue(state: AgentState) -> Literal["llm_reasoner", "tool_executor", "update_memory", "end"]:
    MAX_ITERATIONS = 5
    iteration_count = state.get("iteration_count", 0)

    if iteration_count >= MAX_ITERATIONS:
        return "end"

    if not state.get("tools_called"):
        return "end"

    last_tool = state["tools_called"][-1]
    if last_tool.get("output") is None:
        return "tool_executor"

    return "end"