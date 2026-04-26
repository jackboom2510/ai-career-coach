import uuid
import os
from typing import Optional
from datetime import datetime, timedelta
from supabase import Client, create_client


_supabase_client: Optional[Client] = None


def get_supabase() -> Optional[Client]:
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_KEY", "")
        if url and key:
            _supabase_client = create_client(url, key)
    return _supabase_client


class ConversationManager:
    def __init__(self):
        self.client = get_supabase()
        self.session_cache = {}
    
    def is_configured(self) -> bool:
        return self.client is not None
    
    def create_conversation(self, user_id: str, session_id: str, metadata: Optional[dict] = None) -> Optional[dict]:
        if not self.is_configured():
            return None
        
        try:
            data = {
                "user_id": user_id,
                "session_id": session_id,
                "metadata": metadata or {}
            }
            
            result = self.client.table("conversations").insert(data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error creating conversation: {e}")
            return None
    
    def get_or_create_conversation(self, user_id: str, session_id: str) -> Optional[str]:
        if not self.is_configured():
            return session_id
        
        try:
            result = self.client.table("conversations").select("id").eq(
                "user_id", user_id
            ).eq("session_id", session_id).execute()
            
            if result.data:
                return result.data[0]["id"]
            
            new_conv = self.create_conversation(user_id, session_id)
            return new_conv["id"] if new_conv else session_id
        except Exception as e:
            print(f"Error getting conversation: {e}")
            return session_id
    
    def update_conversation_summary(self, conversation_id: str, summary: str) -> bool:
        if not self.is_configured():
            return False
        
        try:
            self.client.table("conversations").update({
                "summary": summary,
                "updated_at": datetime.now().isoformat()
            }).eq("id", conversation_id).execute()
            return True
        except Exception as e:
            print(f"Error updating summary: {e}")
            return False
    
    def get_recent_conversations(self, user_id: str, limit: int = 10) -> list[dict]:
        if not self.is_configured():
            return []
        
        try:
            result = self.client.table("conversations").select(
                "id, session_id, created_at, summary"
            ).eq("user_id", user_id).order(
                "updated_at", desc=True
            ).limit(limit).execute()
            
            return result.data if result.data else []
        except Exception as e:
            print(f"Error getting conversations: {e}")
            return []
    
    def delete_conversation(self, conversation_id: str) -> bool:
        if not self.is_configured():
            return False
        
        try:
            self.client.table("conversations").delete().eq("id", conversation_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting conversation: {e}")
            return False


class MemoryManager:
    def __init__(self):
        self.client = get_supabase()
        self.conversation_manager = ConversationManager()
    
    def is_configured(self) -> bool:
        return self.client is not None
    
    async def store_interaction(
        self,
        conversation_id: str,
        role: str,
        content: str,
        tool_name: Optional[str] = None,
        tool_output: Optional[str] = None
    ) -> bool:
        if not self.is_configured():
            return False
        
        try:
            from memory.vector_store import vector_store
            
            result = await vector_store.add_message(
                conversation_id=conversation_id,
                role=role,
                content=content,
                tool_name=tool_name,
                tool_output=tool_output
            )
            
            return result is not None
        except Exception as e:
            print(f"Error storing interaction: {e}")
            return False
    
    async def get_context(self, conversation_id: str, limit: int = 10) -> str:
        if not self.is_configured():
            return ""
        
        try:
            from memory.vector_store import vector_store
            
            history = await vector_store.get_conversation_history(conversation_id, limit)
            
            if not history:
                return ""
            
            formatted = []
            for msg in history:
                role = msg.get("role", "unknown")
                content = msg.get("content", "")
                tool_name = msg.get("tool_name")
                
                if tool_name:
                    formatted.append(f"[Tool: {tool_name}] {content}")
                else:
                    formatted.append(f"{role}: {content}")
            
            return "\n".join(formatted[-limit:])
        except Exception as e:
            print(f"Error getting context: {e}")
            return ""
    
    async def store_user_preference(self, user_id: str, preference: str, context: str) -> bool:
        if not self.is_configured():
            return False
        
        try:
            from memory.vector_store import vector_store
            
            result = await vector_store.add_memory(
                user_id=user_id,
                memory_type="preference",
                content=f"{preference} (Context: {context})",
                metadata={"preference": preference, "context": context},
                importance_score=7
            )
            
            return result is not None
        except Exception as e:
            print(f"Error storing preference: {e}")
            return False
    
    async def retrieve_relevant_memories(self, user_id: str, query: str, limit: int = 3) -> str:
        if not self.is_configured():
            return ""
        
        try:
            from memory.vector_store import vector_store
            
            memories = await vector_store.search_memories(query, user_id, limit=limit)
            
            if not memories:
                return ""
            
            formatted = []
            for mem in memories:
                content = mem.get("content", "")
                memory_type = mem.get("memory_type", "general")
                formatted.append(f"[{memory_type}] {content}")
            
            return "\n".join(formatted)
        except Exception as e:
            print(f"Error retrieving memories: {e}")
            return ""


conversation_manager = ConversationManager()
memory_manager = MemoryManager()