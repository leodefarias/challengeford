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
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

# Playwright chromium — deps já instalados via apt-get acima
RUN python -m playwright install chromium 2>/dev/null || true

# Evita hang de telemetria Chroma/HF e download do modelo no boot (healthcheck)
ENV HF_HOME=/app/.cache/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/app/.cache/sentence_transformers \
    ANONYMIZED_TELEMETRY=False \
    HF_HUB_DISABLE_TELEMETRY=1 \
    TRANSFORMERS_NO_ADVISORY_WARNINGS=1
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY src/ ./src/
COPY data/seed/ ./data/seed/
COPY scripts/ ./scripts/

# Seed da KB é idempotente e roda no startup do FastAPI (get_kb).
# Não rodar 01_seed_kb.py aqui: carrega o embedding 2x e estoura o healthcheck.
ENTRYPOINT ["sh", "-c", "cd /app && PYTHONPATH=src exec uvicorn api.main:app --host 0.0.0.0 --port 8000"]
