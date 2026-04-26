import os
import asyncio

os.chdir(os.path.dirname(__file__) or ".")

from dotenv import load_dotenv
load_dotenv()

async def test_agent():
    print("=" * 60)
    print("Testing Agent Backend")
    print("=" * 60)
    
    print("\n1. Testing imports...")
    from agent.graph import run_agent
    from agent.tools import TOOLS
    print(f"   OK - {len(TOOLS)} tools loaded")
    
    print("\n2. Testing API keys...")
    print(f"   GOOGLE_API_KEY: {'Set' if os.getenv('GOOGLE_API_KEY') else 'Missing'}")
    print(f"   TAVILY_API_KEY: {'Set' if os.getenv('TAVILY_API_KEY') else 'Missing'}")
    print(f"   SUPABASE_URL: {'Set' if os.getenv('SUPABASE_URL') else 'Missing'}")
    
    print("\n3. Testing memory module...")
    from memory.manager import memory_manager, conversation_manager
    print(f"   Memory manager configured: {memory_manager.is_configured()}")
    print(f"   Conversation manager configured: {conversation_manager.is_configured()}")
    
    print("\n4. Testing agent with simple query...")
    try:
        result = await run_agent(
            user_message="I want to become a React developer. What skills do I need?",
            user_profile={
                "target_role": "React Developer",
                "current_role": "Marketing",
                "timeline_months": 6
            },
            current_week=1
        )
        
        messages = result.get("messages", [])
        print(f"   Response messages: {len(messages)}")
        
        for msg in messages:
            role = "user" if hasattr(msg, "type") and "human" in str(msg.type) else "assistant"
            content = msg.content[:100] if len(msg.content) > 100 else msg.content
            print(f"   [{role}]: {content}...")
        
        print("\n5. Testing tool calls...")
        tool_calls_count = 0
        for msg in messages:
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                tool_calls_count += len(msg.tool_calls)
                for tc in msg.tool_calls:
                    print(f"   Tool used: {tc.get('name', 'unknown')}")
        print(f"   Total tool calls: {tool_calls_count}")
        
        print("\n" + "=" * 60)
        print("TEST PASSED!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n   ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_agent())