#!/usr/bin/env python
"""Integration test: Frontend → Backend LangGraph flow"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agent.graph import run_agent


async def test_backend_chat():
    """Test the backend /agent/chat flow with LangGraph"""
    
    print("\n" + "="*60)
    print("🧪 Testing Backend LangGraph Integration")
    print("="*60)

    user_message = "What's the job market for Python developers?"
    
    user_profile = {
        "target_role": "Senior Python Developer",
        "current_role": "Junior Developer",
        "timeline_months": 6
    }
    
    roadmap_state = [
        {
            "weekNumber": 1,
            "theme": "Python Fundamentals",
            "tasks": [
                {"description": "Learn Python basics", "completed": False}
            ]
        }
    ]

    print(f"\n📝 Input Message: {user_message}")
    print(f"👤 User Profile: {user_profile['target_role']}")
    print(f"📊 Timeline: {user_profile['timeline_months']} months")
    print(f"🎯 Week: 1 - {roadmap_state[0]['theme']}\n")

    try:
        print("⏳ Running agent with LangGraph...")
        result = await run_agent(
            user_message=user_message,
            user_profile=user_profile,
            roadmap_state=roadmap_state,
            current_week=1,
            user_id="test_user_001",
            conversation_id="test_conv_001",
            user_language="English",
        )

        print("\n✅ Agent Execution Successful!\n")
        
        # Extract response
        messages = result.get("messages", [])
        if messages:
            last_msg = messages[-1]
            response_text = getattr(last_msg, "content", str(last_msg))
            print(f"🤖 Response:\n{response_text}\n")
        
        # Check for tool calls
        print("🔧 Tool Calls Analysis:")
        tool_calls_found = False
        for msg in messages:
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                tool_calls_found = True
                print(f"   ✅ Tools were invoked: {len(msg.tool_calls)} call(s)")
                for tc in msg.tool_calls:
                    print(f"      - {tc.get('name', 'unknown')}")
        
        if not tool_calls_found:
            print("   ℹ️  No tools invoked for this query")
        
        # Check agent selection
        selected_agent = result.get("selected_agent", "unknown")
        print(f"\n🎭 Agent Selected: {selected_agent.upper()}")
        
        print("\n✅ Integration test PASSED!\n")
        return True
        
    except Exception as e:
        print(f"\n❌ Integration test FAILED!")
        print(f"Error: {str(e)}\n")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_backend_chat())
    sys.exit(0 if success else 1)
