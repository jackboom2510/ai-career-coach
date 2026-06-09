from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.tools import tool
import os


_tavily_tool = None

def get_tavily_tool():
    global _tavily_tool
    if _tavily_tool is None:
        api_key = os.getenv("TAVILY_API_KEY", "")
        if api_key:
            _tavily_tool = TavilySearchResults(api_key=api_key, max_results=5)
        else:
            _tavily_tool = TavilySearchResults(max_results=5)
    return _tavily_tool


@tool
def search_web(query: str) -> str:
    """Search the web for current information, news, or answers to questions.
    
    Use this when you need real-time or up-to-date information that the AI 
    might not know about, such as:
    - Current job market trends
    - Latest salary data
    - Recent technology developments
    - Current hiring requirements for specific roles
    
    Args:
        query: The search query (be specific and include context)
        
    Returns:
        Search results with titles, snippets, and URLs
    """
    try:
        tool = get_tavily_tool()
        results = tool.invoke({"query": query})
        
        if not results:
            return "No results found for your query."
        
        formatted = []
        for i, r in enumerate(results[:5], 1):
            title = r.get("title", "Untitled")
            content = r.get("content", "")
            url = r.get("url", "")
            formatted.append(f"{i}. {title}\n   {content[:200]}...\n   Source: {url}")
        
        return "\n\n".join(formatted)
    except Exception as e:
        return f"Search error: {str(e)}"


@tool
def search_job_listings(skill: str, location: str = "remote") -> str:
    """Search for job listings related to a specific skill or role.
    
    Use this to validate market demand for a skill or find out what 
    companies are hiring for.
    
    Args:
        skill: The skill or job title from django.utils.translation import ugettext_lazy as _ search for
        location: Job location (default: "remote", or specify city/country)
        
    Returns:
        Job listing information including titles, requirements, and demand level
    """
    try:
        tavily = get_tavily_tool()
        query = f"hiring {skill} developer jobs {location} 2026"
        results = tavily.invoke({"query": query})
        
        if not results:
            return f"No current job listings found for '{skill}'."
        
        demand_keywords = ["hiring", "urgent", "growing", "high demand", "multiple positions"]
        demand_level = "high"
        
        output = [f"Job Market Analysis for '{skill}'\n"]
        output.append("=" * 50)
        output.append(f"\nFound {len(results)} relevant listings:\n")
        
        for i, r in enumerate(results[:5], 1):
            title = r.get("title", "Job Title")
            content = r.get("content", "")
            url = r.get("url", "")
            
            if any(kw in content.lower() for kw in demand_keywords):
                demand_level = "high"
            
            output.append(f"\n{i}. {title}")
            output.append(f"   Summary: {content[:150]}...")
            output.append(f"   Source: {url}")
        
        output.append(f"\n\nDemand Level: {demand_level.upper()}")
        output.append(f"Recommendation: {'Great time to learn this skill!' if demand_level == 'high' else 'Still viable, focus on adjacent skills'}")
        
        return "\n".join(output)
    except Exception as e:
        return f"Job search error: {str(e)}"


@tool
def get_salary_insights(role: str) -> str:
    """Get salary information for a specific tech role.
    
    Use this when users ask about salary expectations or earning potential.
    
    Args:
        role: The job role/title to get salary data for
        
    Returns:
        Salary range information and insights
    """
    try:
        tavily = get_tavily_tool()
        query = f"{role} developer salary range 2026"
        results = tavily.invoke({"query": query})
        
        if not results:
            return f"No salary data found for '{role}'."
        
        output = [f"Salary Insights for '{role}'\n"]
        output.append("=" * 50)
        
        for r in results[:3]:
            title = r.get("title", "")
            content = r.get("content", "")
            url = r.get("url", "")
            output.append(f"\n{content[:300]}...")
            output.append(f"Source: {url}")
        
        return "\n".join(output)
    except Exception as e:
        return f"Salary search error: {str(e)}"