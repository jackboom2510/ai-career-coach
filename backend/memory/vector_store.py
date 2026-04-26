import os
from typing import Optional, Any
from supabase import Client, create_client
from langchain_google_genai import GoogleGenerativeAIEmbeddings

_supabase_client: Optional[Client] = None
_embeddings: Optional[GoogleGenerativeAIEmbeddings] = None


def get_supabase_client() -> Optional[Client]:
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_KEY", "")
        if url and key:
            _supabase_client = create_client(url, key)
    return _supabase_client


def get_embeddings() -> Optional[GoogleGenerativeAIEmbeddings]:
    global _embeddings
    if _embeddings is None:
        api_key = os.getenv("GOOGLE_API_KEY", "")
        if api_key:
            _embeddings = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=api_key
            )
    return _embeddings


class VectorStore:
    def __init__(self):
        self.client = get_supabase_client()
        self.embeddings = get_embeddings()
    
    def is_configured(self) -> bool:
        return self.client is not None and self.embeddings is not None
    
    async def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        tool_name: Optional[str] = None,
        tool_output: Optional[str] = None
    ) -> Optional[dict]:
        if not self.is_configured():
            return None
        
        try:
            embedding = self.embeddings.embed_query(content)
            
            data = {
                "conversation_id": conversation_id,
                "role": role,
                "content": content,
                "embedding": embedding,
                "tool_name": tool_name,
                "tool_output": tool_output,
            }
            
            result = self.client.table("messages").insert(data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error adding message: {e}")
            return None
    
    async def get_conversation_history(
        self,
        conversation_id: str,
        limit: int = 20
    ) -> list[dict]:
        if not self.is_configured():
            return []
        
        try:
            result = self.client.table("messages").select("*").eq(
                "conversation_id", conversation_id
            ).order("created_at", desc=True).limit(limit).execute()
            
            return list(reversed(result.data)) if result.data else []
        except Exception as e:
            print(f"Error getting conversation history: {e}")
            return []
    
    async def search_similar_messages(
        self,
        query: str,
        conversation_id: str,
        limit: int = 5
    ) -> list[dict]:
        if not self.is_configured():
            return []
        
        try:
            query_embedding = self.embeddings.embed_query(query)
            
            result = self.client.rpc(
                "search_messages",
                {
                    "query_embedding": query_embedding,
                    "match_conversation_id": conversation_id,
                    "match_threshold": 0.7,
                    "match_count": limit
                }
            ).execute()
            
            return result.data if result.data else []
        except Exception as e:
            print(f"Error searching messages: {e}")
            return []
    
    async def add_memory(
        self,
        user_id: str,
        memory_type: str,
        content: str,
        metadata: Optional[dict] = None,
        importance_score: int = 5
    ) -> Optional[dict]:
        if not self.is_configured():
            return None
        
        try:
            embedding = self.embeddings.embed_query(content)
            
            data = {
                "user_id": user_id,
                "memory_type": memory_type,
                "content": content,
                "embedding": embedding,
                "metadata": metadata or {},
                "importance_score": importance_score
            }
            
            result = self.client.table("memory").insert(data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error adding memory: {e}")
            return None
    
    async def search_memories(
        self,
        query: str,
        user_id: str,
        memory_type: Optional[str] = None,
        limit: int = 5
    ) -> list[dict]:
        if not self.is_configured():
            return []
        
        try:
            query_embedding = self.embeddings.embed_query(query)
            
            query_builder = self.client.table("memory").select("*").eq("user_id", user_id)
            
            if memory_type:
                query_builder = query_builder.eq("memory_type", memory_type)
            
            all_memories = query_builder.execute().data
            
            scored = []
            for mem in all_memories:
                if mem.get("embedding"):
                    similarity = self._cosine_similarity(query_embedding, mem["embedding"])
                    if similarity > 0.7:
                        scored.append((similarity, mem))
            
            scored.sort(key=lambda x: x[0], reverse=True)
            return [m for _, m in scored[:limit]]
        except Exception as e:
            print(f"Error searching memories: {e}")
            return []
    
    def _cosine_similarity(self, a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(x * x for x in b) ** 0.5
        return dot / (norm_a * norm_b) if norm_a and norm_b else 0


vector_store = VectorStore()