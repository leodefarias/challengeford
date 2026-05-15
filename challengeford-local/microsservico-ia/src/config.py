from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent

# LLM
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
OPENAI_MODEL_FALLBACK: str = os.getenv("OPENAI_MODEL_FALLBACK", "gpt-4.1")
LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "openai")

# ChromaDB
CHROMA_PERSIST_DIR: str = os.getenv(
    "CHROMA_PERSIST_DIR", str(BASE_DIR / "data" / "chromadb")
)
CHROMA_EMBEDDING_MODEL: str = os.getenv(
    "CHROMA_EMBEDDING_MODEL", "all-MiniLM-L6-v2"
)

# Cache
PDF_CACHE_DIR: Path = BASE_DIR / "data" / "pdfs"
HTML_CACHE_DIR: Path = BASE_DIR / "data" / "raw"
FIPE_CACHE_DB: Path = BASE_DIR / "data" / "fipe_cache.sqlite"
EMPLACAMENTOS_CACHE_DB: Path = BASE_DIR / "data" / "emplacamentos_cache.sqlite"
SEED_DIR: Path = BASE_DIR / "data" / "seed"

# Thresholds
RAG_SIMILARITY_THRESHOLD: float = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.65"))
MIN_COBERTURA_PARA_KB: float = float(os.getenv("MIN_COBERTURA_PARA_KB", "0.70"))
FALLBACK_COBERTURA_THRESHOLD: float = float(
    os.getenv("FALLBACK_COBERTURA_THRESHOLD", "0.70")
)

# Scraping
SCRAPER_DELAY_MIN: float = float(os.getenv("SCRAPER_DELAY_MIN", "1.0"))
SCRAPER_DELAY_MAX: float = float(os.getenv("SCRAPER_DELAY_MAX", "3.0"))

# Firecrawl (opcional — fallback se Cloudflare Browser Rendering não estiver configurado)
FIRECRAWL_API_KEY: str = os.getenv("FIRECRAWL_API_KEY", "")

# Cloudflare Browser Rendering (preferencial para sites JS-rendered)
CF_ACCOUNT_ID: str = os.getenv("CF_ACCOUNT_ID", "")
CF_API_TOKEN: str = os.getenv("CF_API_TOKEN", "")

# API
API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
API_PORT: int = int(os.getenv("API_PORT", "8000"))
VALIDATED_DIR: Path = BASE_DIR / "data" / "validated"
