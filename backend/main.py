"""
Briefly API v2.0 - Personalized News Feed Backend
==================================================
Simple file-based storage for development and small deployments.
Features: Authentication, Topics, Favorites, Personalized Feed

Production-ready for Render.com deployment.
"""

import os
import json
import secrets
import time
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
import bcrypt
from jose import jwt, JWTError
from fastapi import FastAPI, HTTPException, Depends, Header, Query, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("briefly")

# =============================================================================
# CONFIGURATION
# =============================================================================

# Environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production"

# Data storage
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
USERS_FILE = DATA_DIR / "users.json"

# Security
JWT_SECRET = os.getenv("JWT_SECRET", "briefly-secret-key-2024-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = int(os.getenv("JWT_EXPIRE_DAYS", "30"))

# Validate JWT secret in production
if IS_PRODUCTION and JWT_SECRET == "briefly-secret-key-2024-change-in-prod":
    logger.warning("⚠️ Using default JWT secret in production! Set JWT_SECRET env var.")

# News API
GNEWS_API_KEY = os.getenv("GNEWS_API_KEY", "")
GNEWS_URL = "https://gnews.io/api/v4/search"

if not GNEWS_API_KEY:
    logger.warning("⚠️ GNEWS_API_KEY not set! News fetching will fail.")

# CORS
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*")
if ALLOWED_ORIGINS == "*":
    CORS_ORIGINS = ["*"]
else:
    CORS_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS.split(",")]

# =============================================================================
# SIMPLE DATABASE (JSON file-based)
# =============================================================================

class DB:
    """Simple JSON file-based database."""
    
    _data: Dict[str, Any] = {"users": {}, "favorites": {}}
    _loaded: bool = False
    
    @classmethod
    def load(cls):
        """Load data from file."""
        if cls._loaded:
            return
        if USERS_FILE.exists():
            try:
                with open(USERS_FILE, "r") as f:
                    cls._data = json.load(f)
            except Exception as e:
                print(f"⚠️ Load error: {e}")
        cls._loaded = True
    
    @classmethod
    def save(cls):
        """Save data to file."""
        try:
            with open(USERS_FILE, "w") as f:
                json.dump(cls._data, f, indent=2, default=str)
        except Exception as e:
            print(f"⚠️ Save error: {e}")
    
    @classmethod
    def get_user_by_email(cls, email: str) -> Optional[Dict]:
        cls.load()
        return cls._data["users"].get(email.lower())
    
    @classmethod
    def get_user_by_id(cls, user_id: str) -> Optional[Dict]:
        cls.load()
        for user in cls._data["users"].values():
            if user.get("id") == user_id:
                return user
        return None
    
    @classmethod
    def create_user(cls, email: str, name: str, password_hash: str) -> Dict:
        cls.load()
        email = email.lower()
        
        if email in cls._data["users"]:
            raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
        
        user_id = secrets.token_hex(16)
        user = {
            "id": user_id,
            "email": email,
            "name": name,
            "password_hash": password_hash,
            "saved_topics": [],
            "created_at": datetime.utcnow().isoformat(),
        }
        
        cls._data["users"][email] = user
        cls._data["favorites"][user_id] = []
        cls.save()
        return user
    
    @classmethod
    def update_topics(cls, user_id: str, topics: List[str]) -> Optional[Dict]:
        cls.load()
        for user in cls._data["users"].values():
            if user.get("id") == user_id:
                user["saved_topics"] = topics
                cls.save()
                return user
        return None
    
    @classmethod
    def add_favorite(cls, user_id: str, article: Dict) -> bool:
        cls.load()
        if user_id not in cls._data["favorites"]:
            cls._data["favorites"][user_id] = []
        
        # Check if already favorited
        for fav in cls._data["favorites"][user_id]:
            if fav.get("url") == article.get("url"):
                return False
        
        article["saved_at"] = datetime.utcnow().isoformat()
        cls._data["favorites"][user_id].append(article)
        cls.save()
        return True
    
    @classmethod
    def remove_favorite(cls, user_id: str, url: str) -> bool:
        cls.load()
        if user_id not in cls._data["favorites"]:
            return False
        
        original = len(cls._data["favorites"][user_id])
        cls._data["favorites"][user_id] = [
            f for f in cls._data["favorites"][user_id] if f.get("url") != url
        ]
        if len(cls._data["favorites"][user_id]) < original:
            cls.save()
            return True
        return False
    
    @classmethod
    def get_favorites(cls, user_id: str) -> List[Dict]:
        cls.load()
        return cls._data["favorites"].get(user_id, [])

# =============================================================================
# PASSWORD & JWT UTILITIES
# =============================================================================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None

# =============================================================================
# AUTH DEPENDENCY
# =============================================================================

async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Get current user from Bearer token (optional)."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization[7:]
    payload = decode_token(token)
    if not payload:
        return None
    
    user = DB.get_user_by_id(payload.get("sub"))
    if user:
        user["favorites_count"] = len(DB.get_favorites(user["id"]))
    return user

async def require_auth(authorization: Optional[str] = Header(None)) -> dict:
    """Require authentication."""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

# =============================================================================
# LIFESPAN & APP SETUP
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    DB.load()
    logger.info(f"✅ Briefly API v2.0 Started! (Environment: {ENVIRONMENT})")
    yield
    DB.save()
    logger.info("🔌 Database saved, shutting down...")

app = FastAPI(
    title="Briefly API",
    version="2.0.0",
    description="Personalized News Feed API - TikTok-style news experience",
    lifespan=lifespan,
    docs_url="/docs" if not IS_PRODUCTION else None,  # Disable docs in production
    redoc_url="/redoc" if not IS_PRODUCTION else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# =============================================================================
# ERROR HANDLING
# =============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error" if IS_PRODUCTION else str(exc)}
    )

# News cache
NEWS_CACHE: Dict[str, Any] = {}
CACHE_TTL = 300

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class UserSignUp(BaseModel):
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=1)

class UserLogin(BaseModel):
    email: str
    password: str

class TopicSave(BaseModel):
    topic: str = Field(..., min_length=1)

class ArticleFavorite(BaseModel):
    url: str
    title: str
    image: Optional[str] = None
    source: str
    summary: Optional[str] = None
    date: Optional[str] = None

# =============================================================================
# AUTH ENDPOINTS
# =============================================================================

@app.post("/auth/signup", status_code=201)
async def signup(data: UserSignUp):
    """Register a new user."""
    email = data.email.lower().strip()
    
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(400, "Invalid email format")
    
    if DB.get_user_by_email(email):
        raise HTTPException(400, "Email already registered")
    
    user = DB.create_user(email, data.name.strip(), hash_password(data.password))
    token = create_token(user["id"], email)
    
    return {
        "message": "Account created successfully",
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "saved_topics": [],
            "favorites_count": 0,
        }
    }

@app.post("/auth/login")
async def login(data: UserLogin):
    """Login with email and password."""
    email = data.email.lower().strip()
    user = DB.get_user_by_email(email)
    
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    
    token = create_token(user["id"], email)
    favorites_count = len(DB.get_favorites(user["id"]))
    
    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "saved_topics": user.get("saved_topics", []),
            "favorites_count": favorites_count,
        }
    }

@app.post("/auth/logout")
async def logout():
    """Logout (client should discard token)."""
    return {"message": "Logged out successfully"}

@app.get("/auth/me")
async def get_me(user: dict = Depends(require_auth)):
    """Get current user profile."""
    return {
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "saved_topics": user.get("saved_topics", []),
            "favorites_count": user.get("favorites_count", 0),
        }
    }

# =============================================================================
# TOPICS ENDPOINTS
# =============================================================================

@app.get("/topics")
async def get_topics(user: dict = Depends(require_auth)):
    """Get user's saved topics."""
    return {"topics": user.get("saved_topics", [])}

@app.post("/topics")
async def save_topic(data: TopicSave, user: dict = Depends(require_auth)):
    """Save a topic."""
    topic = data.topic.strip()
    current = user.get("saved_topics", [])
    
    if topic.lower() in [t.lower() for t in current]:
        return {"message": "Topic already saved", "topics": current}
    
    new_topics = current + [topic]
    DB.update_topics(user["id"], new_topics)
    
    return {"message": "Topic saved", "topics": new_topics}

@app.delete("/topics/{topic}")
async def remove_topic(topic: str, user: dict = Depends(require_auth)):
    """Remove a topic."""
    current = user.get("saved_topics", [])
    new_topics = [t for t in current if t.lower() != topic.lower()]
    DB.update_topics(user["id"], new_topics)
    
    return {"message": "Topic removed", "topics": new_topics}

@app.put("/topics")
async def update_topics(topics: List[str], user: dict = Depends(require_auth)):
    """Update all topics at once."""
    DB.update_topics(user["id"], topics)
    return {"message": "Topics updated", "topics": topics}

# =============================================================================
# FAVORITES ENDPOINTS
# =============================================================================

@app.get("/favorites")
async def get_favorites(user: dict = Depends(require_auth)):
    """Get user's favorite articles."""
    favorites = DB.get_favorites(user["id"])
    return {"favorites": favorites}

@app.post("/favorites")
async def add_favorite(data: ArticleFavorite, user: dict = Depends(require_auth)):
    """Add article to favorites."""
    article = {
        "url": data.url,
        "title": data.title,
        "image": data.image,
        "source": data.source,
        "summary": data.summary,
        "date": data.date,
    }
    
    if not DB.add_favorite(user["id"], article):
        raise HTTPException(400, "Article already in favorites")
    
    return {"message": "Article added to favorites"}

@app.delete("/favorites")
async def remove_favorite(url: str, user: dict = Depends(require_auth)):
    """Remove article from favorites."""
    DB.remove_favorite(user["id"], url)
    return {"message": "Article removed from favorites"}

# =============================================================================
# NEWS FEED ENDPOINTS
# =============================================================================

# Extended cache to store more articles per query
EXTENDED_CACHE: Dict[str, List[Dict]] = {}
QUERY_VARIATIONS = [
    "",  # Original query
    " latest",
    " news",
    " today",
    " update",
]

async def fetch_news_batch(query: str, max_per_request: int = 10) -> List[Dict]:
    """Fetch multiple batches of news using query variations."""
    all_articles = []
    seen_urls = set()
    
    if not GNEWS_API_KEY:
        logger.error("GNEWS_API_KEY not set! Cannot fetch news.")
        return []
    
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            for variation in QUERY_VARIATIONS:
                search_query = f"{query}{variation}".strip()
                logger.info(f"Fetching news for: '{search_query}'")
                
                response = await client.get(
                    GNEWS_URL,
                    params={
                        "q": search_query,
                        "lang": "en",
                        "max": max_per_request,
                        "apikey": GNEWS_API_KEY,
                    }
                )
                
                if response.status_code != 200:
                    logger.warning(f"GNews API error: {response.status_code} - {response.text[:200]}")
                    continue
                
                data = response.json()
                articles = data.get("articles", [])
                logger.info(f"Got {len(articles)} articles for '{search_query}'")
                
                for article in articles:
                    url = article.get("url", "")
                    if url and url not in seen_urls:
                        seen_urls.add(url)
                        all_articles.append({
                            "title": article.get("title", ""),
                            "summary": article.get("description", ""),
                            "content": article.get("content", ""),
                            "url": url,
                            "image": article.get("image"),
                            "date": article.get("publishedAt", ""),
                            "source": article.get("source", {}).get("name", "Unknown"),
                        })
                
                # Stop if we have enough articles
                if len(all_articles) >= 50:
                    break
                    
    except Exception as e:
        logger.error(f"News fetch error: {e}")
    
    logger.info(f"Total unique articles fetched: {len(all_articles)}")
    return all_articles

async def fetch_news(query: str, max_results: int = 10, page: int = 1) -> List[Dict]:
    """Fetch news from GNews API with caching and pagination."""
    base_cache_key = query.lower().strip()
    now = time.time()
    
    logger.info(f"fetch_news called: query='{query}', page={page}")
    
    # Check if we have extended cache for this query
    if base_cache_key in EXTENDED_CACHE:
        cached_articles, timestamp = EXTENDED_CACHE[base_cache_key]
        # Check if cache is still valid
        if now - timestamp < CACHE_TTL:
            start = (page - 1) * max_results
            end = start + max_results
            logger.info(f"Cache hit: {len(cached_articles)} articles, returning [{start}:{end}]")
            if start < len(cached_articles):
                return cached_articles[start:end]
            else:
                logger.info(f"Page {page} beyond cache ({len(cached_articles)} articles)")
    
    # Fetch fresh data for page 1 or if cache is empty/expired
    if page == 1 or base_cache_key not in EXTENDED_CACHE:
        logger.info(f"Fetching fresh data for query: '{query}'")
        articles = await fetch_news_batch(query)
        
        if articles:
            EXTENDED_CACHE[base_cache_key] = (articles, now)
            
            start = (page - 1) * max_results
            end = start + max_results
            return articles[start:end]
    
    return []

@app.get("/news")
@app.get("/search")  # Alias for frontend compatibility
async def search_news(
    q: str = Query(..., min_length=1, description="Search query"),
    max: int = Query(10, ge=1, le=50),
    page: int = Query(1, ge=1, le=10, description="Page number for pagination"),
):
    """Search news by query with pagination."""
    articles = await fetch_news(q, max, page)
    
    # Check if there are more articles in cache
    base_cache_key = q.lower().strip()
    has_more = False
    if base_cache_key in EXTENDED_CACHE:
        cached_articles, _ = EXTENDED_CACHE[base_cache_key]
        next_start = page * max
        has_more = next_start < len(cached_articles)
    
    return {
        "results": articles, 
        "total": len(articles),
        "page": page,
        "has_more": has_more,
    }

@app.get("/feed/personalized")
async def get_personalized_feed(user: dict = Depends(require_auth)):
    """Get personalized feed based on user's saved topics."""
    topics = user.get("saved_topics", [])
    
    if not topics:
        return {
            "results": [],
            "message": "No saved topics. Add topics to get personalized news."
        }
    
    all_articles = []
    seen_urls = set()
    
    for topic in topics[:5]:  # Limit to 5 topics
        articles = await fetch_news(topic, 5)
        for article in articles:
            if article["url"] not in seen_urls:
                article["topic"] = topic
                all_articles.append(article)
                seen_urls.add(article["url"])
    
    return {"results": all_articles, "total": len(all_articles)}

# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.get("/")
async def root():
    """Health check endpoint with API info."""
    return {
        "name": "Briefly API",
        "version": "2.0.0",
        "status": "running",
        "environment": ENVIRONMENT,
        "endpoints": {
            "auth": ["/auth/signup", "/auth/login", "/auth/logout", "/auth/me"],
            "topics": ["/topics"],
            "favorites": ["/favorites"],
            "news": ["/news", "/search", "/feed/personalized"],
        }
    }

@app.get("/health")
async def health():
    """
    Health check endpoint for Render.com monitoring.
    Returns system status for load balancer health checks.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": ENVIRONMENT,
        "version": "2.0.0",
    }

@app.get("/ready")
async def readiness():
    """
    Readiness check - verifies all dependencies are available.
    """
    checks = {
        "database": USERS_FILE.parent.exists(),
        "gnews_api_key": bool(GNEWS_API_KEY),
    }
    
    all_ready = all(checks.values())
    
    return {
        "ready": all_ready,
        "checks": checks,
    }
