#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Ford Challenge — Start All Services (Linux / macOS)
#
# Services:
#   :8000  Python IA microservice  (docker-compose)
#   :8080  Java Spring Boot API    (docker-compose)
#   Expo   Mobile app              (interactive, runs in this terminal)
#
# Requirements: Docker, docker-compose (or docker compose), Node.js, npm
# ─────────────────────────────────────────────────────────────────────
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# ── Colors ────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; NC='\033[0m'

info()    { echo -e "${GREEN}[ford]${NC} $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC} $*"; }
error()   { echo -e "${RED}[erro]${NC} $*"; exit 1; }

# ── .env check ────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
    warn ".env not found — copying from .env.example"
    cp .env.example .env
    echo ""
    echo -e "${RED}ATENÇÃO: Edite o arquivo .env antes de continuar!${NC}"
    echo "  - ANTHROPIC_API_KEY  (obrigatório para IA)"
    echo "  - ENCRYPTION_KEY     (gere com: openssl rand -base64 32)"
    echo "  - JWT_SECRET         (gere com: openssl rand -base64 64)"
    echo ""
    read -p "Pressione ENTER para continuar mesmo assim, ou Ctrl+C para cancelar..."
fi

# ── Validate required env vars ────────────────────────────────────────
source .env 2>/dev/null || true

if [ -z "${ANTHROPIC_API_KEY}" ] || [ "${ANTHROPIC_API_KEY}" = "sk-ant-..." ]; then
    warn "ANTHROPIC_API_KEY não configurado — IA funcionará em modo limitado"
fi
if [ -z "${ENCRYPTION_KEY}" ]; then
    warn "ENCRYPTION_KEY não configurado — Java API pode falhar na inicialização"
fi

# ── Docker check ──────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    error "Docker não encontrado. Instale em: https://docs.docker.com/get-docker/"
fi

# Prefer 'docker compose' (v2) over 'docker-compose' (v1)
if docker compose version &>/dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
    COMPOSE="docker-compose"
else
    error "docker-compose não encontrado. Instale Docker Desktop ou docker-compose."
fi

# ── Node check ────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
    error "Node.js não encontrado. Instale em: https://nodejs.org"
fi

# ── Start backend (detached) ──────────────────────────────────────────
info "Iniciando backend (Python IA + Java API) via Docker..."
$COMPOSE up -d --build

info "Aguardando serviços ficarem saudáveis..."
echo "  Python IA → http://localhost:8000/health"
echo "  Java API  → http://localhost:8080/actuator/health"

# Wait up to 120s for python service
ATTEMPTS=0
until curl -sf http://localhost:8000/health >/dev/null 2>&1 || [ $ATTEMPTS -ge 24 ]; do
    printf "."
    sleep 5
    ATTEMPTS=$((ATTEMPTS+1))
done
echo ""

if ! curl -sf http://localhost:8000/health >/dev/null 2>&1; then
    warn "Python IA ainda não respondeu — verifique: docker logs ford-python-ia"
else
    info "Python IA OK"
fi

# Wait up to 60s for java service
ATTEMPTS=0
until curl -sf http://localhost:8080/actuator/health >/dev/null 2>&1 || [ $ATTEMPTS -ge 12 ]; do
    printf "."
    sleep 5
    ATTEMPTS=$((ATTEMPTS+1))
done
echo ""

if ! curl -sf http://localhost:8080/actuator/health >/dev/null 2>&1; then
    warn "Java API ainda não respondeu — verifique: docker logs ford-java-api"
else
    info "Java API OK"
fi

# ── Mobile app ────────────────────────────────────────────────────────
info "Preparando mobile..."
cd "$ROOT/mobile"

if [ ! -d "node_modules" ]; then
    info "Instalando dependências npm..."
    npm install
fi

# Set API URL for mobile if not already set
if [ ! -f ".env" ]; then
    echo "EXPO_PUBLIC_API_URL=http://localhost:8080" > .env
    info "Criado mobile/.env com EXPO_PUBLIC_API_URL=http://localhost:8080"
fi

echo ""
info "Iniciando Expo..."
echo ""
echo "  Escaneie o QR code com Expo Go (Android/iOS)"
echo "  Pressione 'w' para abrir no navegador"
echo "  Pressione Ctrl+C para parar todos os serviços"
echo ""

npx expo start

# ── Cleanup on exit ───────────────────────────────────────────────────
cd "$ROOT"
info "Parando backend..."
$COMPOSE down
