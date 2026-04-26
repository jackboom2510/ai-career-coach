from typing import TypedDict, Annotated, Optional, Any
from langchain_core.messages import BaseMessage
import operator


class AgentState(TypedDict, total=False):
    messages: Annotated[list[BaseMessage], operator.add]
    user_profile: Optional[dict[str, Any]]
    roadmap_state: Optional[list[dict[str, Any]]]
    current_week: int
    current_task: Optional[str]
    tools_called: Annotated[list[dict[str, Any]], operator.add]
    should_replan: bool
    iteration_count: int
    user_id: str
    conversation_id: str
    user_language: str