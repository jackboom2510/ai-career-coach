from langchain_core.tools import tool
from agent.tools.search_tools import search_web, search_job_listings, get_salary_insights
from agent.tools.resource_tools import validate_resource, suggest_topic_resources
from agent.tools.memory_tools import retrieve_memories, get_conversation_context, store_learning


@tool
def calculate_pace_adjustment(
    total_tasks: int,
    completed_tasks: int,
    weeks_elapsed: int,
    timeline_months: int
) -> str:
    """Calculate if the user's learning pace matches their timeline.
    
    Use this to help users understand if they're on track, ahead, or behind
    in their learning journey.
    
    Args:
        total_tasks: Total number of tasks in the roadmap
        completed_tasks: Number of tasks completed so far
        weeks_elapsed: Number of weeks since starting
        timeline_months: Original timeline in months
        
    Returns:
        Pace analysis with status and recommendations
    """
    expected_progress = (weeks_elapsed / (timeline_months * 4)) * 100
    actual_progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    pace_status = "on_track"
    message = ""
    
    if actual_progress < expected_progress - 15:
        pace_status = "behind"
        message = "You're a bit behind schedule, but don't worry! Let's adjust your pace."
    elif actual_progress > expected_progress + 15:
        pace_status = "ahead"
        message = "You're ahead of schedule! Great momentum - keep it up!"
    else:
        message = "You're on track! Steady progress is the key to success."
    
    return f"""Pace Analysis
================
Expected Progress: {expected_progress:.1f}%
Actual Progress: {actual_progress:.1f}%

Status: {pace_status.upper()}
{message}

Recommendation: {'Consider extending your timeline slightly' if pace_status == 'behind' else 'Continue at your current pace' if pace_status == 'on_track' else 'You may finish early - consider advancing to next topics'}"""


RESEARCH_TOOLS = [
    search_web,
    search_job_listings,
    get_salary_insights,
]

COACHING_TOOLS = [
    validate_resource,
    calculate_pace_adjustment,
    suggest_topic_resources,
]

MEMORY_TOOLS = [
    retrieve_memories,
    get_conversation_context,
    store_learning,
]

TOOLS = RESEARCH_TOOLS + COACHING_TOOLS + MEMORY_TOOLS
