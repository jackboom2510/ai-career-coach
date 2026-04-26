from langchain_core.tools import tool
from memory.manager import memory_manager, conversation_manager


@tool
def retrieve_memories(query: str, user_id: str) -> str:
    """Retrieve relevant memories or past interactions for a user.
    
    Use this to recall previous conversations, learned preferences,
    or important context about the user.
    
    Args:
        query: Search query to find relevant memories
        user_id: The user's unique identifier
        
    Returns:
        Relevant memories and past interactions
    """
    import asyncio
    
    async def _get_memories():
        return await memory_manager.retrieve_relevant_memories(user_id, query, limit=5)
    
    try:
        memories = asyncio.run(_get_memories())
        if not memories:
            return "No relevant memories found for this query."
        return f"Relevant memories:\n{memories}"
    except Exception as e:
        return f"Memory retrieval error: {str(e)}"


@tool
def get_conversation_context(conversation_id: str, limit: int = 10) -> str:
    """Get the conversation history for a specific session.
    
    Args:
        conversation_id: The conversation/session ID
        limit: Maximum number of messages to retrieve
        
    Returns:
        Formatted conversation history
    """
    import asyncio
    
    async def _get_context():
        return await memory_manager.get_context(conversation_id, limit)
    
    try:
        context = asyncio.run(_get_context())
        if not context:
            return "No conversation history found."
        return f"Recent conversation:\n{context}"
    except Exception as e:
        return f"Context retrieval error: {str(e)}"


@tool
def store_learning(user_id: str, learning: str, context: str) -> str:
    """Store a key learning or insight about the user.
    
    Use this to remember important things like:
    - User preferences
    - Learning pace observations
    - Goals and milestones achieved
    
    Args:
        user_id: The user's unique identifier
        learning: What to remember
        context: When/why this learning applies
        
    Returns:
        Confirmation of storage
    """
    import asyncio
    
    async def _store():
        success = await memory_manager.store_user_preference(user_id, learning, context)
        return success
    
    try:
        success = asyncio.run(_store())
        if success:
            return f"Learning stored successfully: '{learning}'"
        return "Failed to store learning (database not configured)."
    except Exception as e:
        return f"Storage error: {str(e)}"