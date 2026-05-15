FROM python:3.12-slim

WORKDIR /app

# Dependências de sistema (Playwright + chromium)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl wget gnupg ca-certificates \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxrandr2 libgbm1 libasound2 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Playwright chromium (usado como fallback de scraping JS)
RUN python -m playwright install chromium --with-deps 2>/dev/null || true

COPY src/ ./src/
COPY data/seed/ ./data/seed/
COPY scripts/ ./scripts/

# Pré-seed da KB ao iniciar (idempotente)
ENTRYPOINT ["sh", "-c", "cd /app && PYTHONPATH=src python scripts/01_seed_kb.py && PYTHONPATH=src uvicorn api.main:app --host 0.0.0.0 --port 8000"]
