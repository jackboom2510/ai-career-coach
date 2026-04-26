import asyncio
from agent.graph import run_agent

async def test():
    result = await run_agent(
        user_message="Hello, I want to be a frontend developer",
        user_profile={"target_role": "Frontend Developer", "current_role": "Marketing"},
        current_week=1
    )
    print("Agent ran successfully")
    messages = result.get("messages", [])
    print(f"Messages count: {len(messages)}")
    if messages:
        last = messages[-1]
        print(f"Last message type: {type(last).__name__}")
        print(f"Has tool calls: {hasattr(last, 'tool_calls') and bool(last.tool_calls)}")

asyncio.run(test())