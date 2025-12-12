import os
import time
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# =============================================================================
# APP SETUP
# =============================================================================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# CONFIG
# =============================================================================

GNEWS_API_KEY = os.getenv("GNEWS_API_KEY", "4539b45d84bfef18d987f0ebad1b7880")
GNEWS_URL = "https://gnews.io/api/v4/search"
FEED_CACHE = {}
CACHE_TTL = 300

print("✅ Briefly API Ready!")

# =============================================================================
# ENDPOINTS
# =============================================================================

@app.get("/")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "Briefly API"}


@app.get("/search")
async def search_news(q: str):
    query = q.strip()
    print(f"\n🔍 Searching: {query}")
    
    # Validate API key
    if not GNEWS_API_KEY:
        print("❌ ERROR: GNEWS_API_KEY not set")
        raise HTTPException(status_code=500, detail="API key not configured")
    
    # Check cache
    cache_key = query.lower()
    if cache_key in FEED_CACHE:
        cached = FEED_CACHE[cache_key]
        if time.time() - cached["timestamp"] < CACHE_TTL:
            print("⚡ Cache hit!")
            return cached["data"]
    
    # Fetch from GNews
    try:
        params = {
            "token": GNEWS_API_KEY,
            "q": query,
            "lang": "en",
            "max": 10
        }
        
        print(f"📡 Fetching from GNews...")
        
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(GNEWS_URL, params=params)
            data = response.json()
        
        print(f"   Response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ GNews error: {data}")
            raise HTTPException(status_code=502, detail=f"GNews API error: {data.get('errors', 'Unknown')}")
        
        articles = data.get("articles", [])
        print(f"   Found {len(articles)} articles")
        
        # Transform to frontend format - FIXED MAPPING
        formatted_articles = []
        for article in articles:
            if not article.get("url"):
                continue
            
            formatted_articles.append({
                "id": article.get("url"),
                "title": article.get("title", "Untitled"),
                "summary": [article.get("description", "No summary available.")],
                "imageUrl": article.get("image", "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800"),
                "source": article.get("source", {}).get("name", "Unknown"),
                "publishedAt": article.get("publishedAt", ""),
                "url": article.get("url"),
                "biasLabel": "Neutral"
            })
        
        # Cache results
        FEED_CACHE[cache_key] = {
            "data": formatted_articles,
            "timestamp": time.time()
        }
        
        print(f"✅ Returning {len(formatted_articles)} articles")
        return formatted_articles
        
    except httpx.RequestError as e:
        print(f"❌ Network error: {e}")
        raise HTTPException(status_code=502, detail=f"Network error: {str(e)}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
