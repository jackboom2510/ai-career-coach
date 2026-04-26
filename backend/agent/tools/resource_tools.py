from langchain_core.tools import tool
import httpx
from bs4 import BeautifulSoup
import os
from typing import Optional


@tool
def validate_resource(url: str, topic: str) -> str:
    """Validate if a learning resource is accessible, relevant, and high-quality.
    
    Use this to check if a resource (link, tutorial, course) is still available
    and worth recommending.
    
    Args:
        url: The URL of the resource to validate
        topic: The topic the resource should cover
        
    Returns:
        Validation result with accessibility, relevance, and quality scores
    """
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            response = client.get(url, headers=headers)
        
        if response.status_code != 200:
            return f"Resource unavailable (HTTP {response.status_code})"
        
        soup = BeautifulSoup(response.text, "lxml")
        title = soup.title.string if soup.title else "Untitled"
        
        text_content = soup.get_text(separator=" ", strip=True)
        text_lower = text_content.lower()
        topic_lower = topic.lower()
        
        relevance_score = 0
        if topic_lower in text_lower:
            relevance_score = 100
        else:
            keywords = topic_lower.split()
            matches = sum(1 for kw in keywords if kw in text_lower)
            relevance_score = min(100, (matches / len(keywords)) * 100) if keywords else 50
        
        quality_indicators = {
            "documentation": ["docs", "documentation", "guide", "reference", "api"],
            "tutorial": ["tutorial", "learn", "course", "lesson", "introduction"],
            "video": ["youtube", "video", "watch", "course"],
            "community": ["github", "stackoverflow", "forum", "discuss"],
        }
        
        content_type = "general"
        for ctype, keywords in quality_indicators.items():
            if any(kw in url.lower() for kw in keywords):
                content_type = ctype
                break
        
        accessibility_score = 100 if response.status_code == 200 else 0
        quality_score = min(100, relevance_score + 20) if relevance_score > 70 else relevance_score
        
        total_score = (accessibility_score * 0.3 + relevance_score * 0.5 + quality_score * 0.2)
        
        recommendation = "Recommended"
        if total_score < 60:
            recommendation = "Not Recommended"
        elif total_score < 75:
            recommendation = "Consider alternatives"
        
        output = [
            f"Resource Validation Results",
            "=" * 50,
            f"URL: {url}",
            f"Title: {title[:80]}...",
            f"",
            f"Scores:",
            f"  - Accessibility: {accessibility_score}/100",
            f"  - Relevance to '{topic}': {relevance_score}/100",
            f"  - Quality: {quality_score}/100",
            f"",
            f"Overall Score: {total_score:.0f}/100",
            f"Recommendation: {recommendation}",
        ]
        
        return "\n".join(output)
        
    except httpx.TimeoutException:
        return "Resource validation failed: Request timed out"
    except httpx.RequestError as e:
        return f"Resource validation failed: Could not reach the URL ({str(e)})"
    except Exception as e:
        return f"Resource validation error: {str(e)}"


@tool
def suggest_topic_resources(topic: str, difficulty: str = "intermediate") -> str:
    """Get high-quality learning resource suggestions for a specific topic.
    
    Use this to recommend resources when users want to learn about something.
    
    Args:
        topic: The topic to learn about
        difficulty: Skill level (beginner/intermediate/advanced)
        
    Returns:
        A curated list of recommended learning resources
    """
    try:
        tavily = None
        try:
            from langchain_community.tools.tavily_search import TavilySearchResults
            api_key = os.getenv("TAVILY_API_KEY", "")
            tavily = TavilySearchResults(api_key=api_key, max_results=5)
        except Exception:
            pass
        
        if tavily:
            query = f"best {topic} tutorial course documentation {difficulty} 2026"
            results = tavily.invoke({"query": query})
            
            if results:
                output = [
                    f"Learning Resources for '{topic}' ({difficulty})",
                    "=" * 60,
                    f"",
                    "Curated Resources:",
                ]
                for i, r in enumerate(results[:5], 1):
                    title = r.get("title", "Resource")
                    content = r.get("content", "")
                    url = r.get("url", "")
                    output.append(f"\n{i}. {title}")
                    output.append(f"   {content[:150]}...")
                    output.append(f"   {url}")
                return "\n".join(output)
        
        return f"No specific resources found for '{topic}'. Consider checking official documentation or searching online."
        
    except Exception as e:
        return f"Resource suggestion error: {str(e)}"