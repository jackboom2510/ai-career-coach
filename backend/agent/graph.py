import os
from typing import Optional, Literal, Any
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import HumanMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from agent.state import AgentState
from agent.tools import TOOLS

_api_key = os.getenv("GOOGLE_API_KEY", "")
_llm = None
_llm_with_tools = None


def get_llm():
    global _llm, _llm_with_tools
    if _llm is None:
        _llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.7, google_api_key=_api_key)
        _llm_with_tools = _llm.bind_tools(TOOLS)
    return _llm, _llm_with_tools


def shouldContinue(state: AgentState) -> Literal["tools", "__end__"]:
    messages = state.get("messages", [])
    if not messages:
        return "__end__"
    
    last_message = messages[-1]
    if isinstance(last_message, AIMessage) and last_message.tool_calls:
        return "tools"
    
    return "__end__"


async def get_memory_context(conversation_id: str, user_id: str, current_message: str) -> str:
    """Retrieve relevant memory context for the agent."""
    try:
        from memory.manager import memory_manager
        
        memories = await memory_manager.retrieve_relevant_memories(user_id, current_message, limit=3)
        
        if memories:
            return f"\n\nRelevant memories from past conversations:\n{memories}"
    except Exception:
        pass
    return ""


def reasoning_node(state: AgentState) -> dict[str, Any]:
    messages = state.get("messages", [])

    profile = state.get("user_profile")
    roadmap = state.get("roadmap_state")
    current_week = state.get("current_week", 1)
    user_id = state.get("user_id", "default")
    conversation_id = state.get("conversation_id", "default")

    context_parts = []
    if isinstance(profile, dict):
        context_parts.append(f"Target Role: {profile.get('target_role', 'N/A')}")
        context_parts.append(f"Current Role: {profile.get('current_role', 'N/A')}")
        context_parts.append(f"Timeline: {profile.get('timeline_months', 0)} months")

    if roadmap:
        week = next(
            (
                w
                for w in roadmap
                if isinstance(w, dict) and w.get("weekNumber") == current_week
            ),
            None,
        )
        if week:
            context_parts.append(f"Current Week {current_week}: {week.get('theme', 'N/A')}")
            tasks = [
                t["description"]
                for t in week.get("tasks", [])
                if isinstance(t, dict) and not t.get("completed", False)
            ]
            if tasks:
                context_parts.append(f"Remaining tasks: {', '.join(tasks[:3])}")

    context = "\n".join(context_parts) if context_parts else ""

    current_msg = messages[-1].content if messages else ""
    memory_context = ""

    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    if user_id and user_id != "default":
        try:
            memory_context = loop.run_until_complete(
                get_memory_context(conversation_id, user_id, current_msg)
            )
        except Exception:
            pass

    user_language = state.get("user_language", "Vietnamese")

    language_instruction = "Respond in Vietnamese."
    if user_language == "English" or user_language == "en":
        language_instruction = "Respond in English."

    system_msg = HumanMessage(content=f"""You are an expert AI Career Coach agent. 

{language_instruction}

Context about the user:
{context}{memory_context}

Available tools:
- search_web(query): Search the web for current information
- search_job_listings(skill, location): Search job listings for a skill
- get_salary_insights(role): Get salary information for a role
- validate_resource(url, topic): Validate a learning resource
- calculate_pace_adjustment(total_tasks, completed_tasks, weeks_elapsed, timeline_months): Calculate learning pace
- suggest_topic_resources(topic, difficulty): Get resource suggestions
- retrieve_memories(query, user_id): Recall past conversations and learnings
- get_conversation_context(conversation_id): Get conversation history
- store_learning(user_id, learning, context): Store important learnings

Be encouraging, specific, and reference their progress. Use tools when appropriate for research or validation.""")

    _, llm_with_tools = get_llm()
    if llm_with_tools is None:
        return {"messages": [AIMessage(content="Agent not configured. Please set GOOGLE_API_KEY.")]}
    response = llm_with_tools.invoke([system_msg] + messages)

    iteration_count = state.get("iteration_count", 0) + 1

    return {
        "messages": [response],
        "iteration_count": iteration_count,
    }


workflow = StateGraph(AgentState)

workflow.add_node("reasoning", reasoning_node)
workflow.add_node("tools", ToolNode(TOOLS))

workflow.set_entry_point("reasoning")

workflow.add_conditional_edges(
    "reasoning",
    shouldContinue,
    {
        "tools": "tools",
        "__end__": END,
    },
)

workflow.add_edge("tools", "reasoning")

graph = workflow.compile()

agent_graph = graph


async def run_agent(
    user_message: str,
    user_profile: Optional[dict] = None,
    roadmap_state: Optional[list] = None,
    current_week: int = 1,
    user_id: str = "default",
    conversation_id: str = "default",
    user_language: str = "Vietnamese",
) -> dict[str, Any]:
    initial_state: AgentState = {
        "messages": [HumanMessage(content=user_message)],
        "user_profile": user_profile,
        "roadmap_state": roadmap_state,
        "current_week": current_week,
        "current_task": None,
        "tools_called": [],
        "should_replan": False,
        "iteration_count": 0,
        "user_id": user_id,
        "conversation_id": conversation_id,
        "user_language": user_language,
    }

    result = await agent_graph.ainvoke(initial_state)
    return result
