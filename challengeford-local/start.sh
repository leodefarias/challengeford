#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Ford Challenge — Start All Services (Linux / macOS)
#
# Services:
#   :80/443  Nginx TLS reverse proxy  (docker-compose)
#   :8000    Python IA microservice   (docker-compose, interno)
#   :8080    Java Spring Boot API     (docker-compose)
#   Expo     Mobile app               (interactive, runs in this terminal)
#
# Requirements: Docker, docker-compose (or docker compose), Node.js, npm, openssl
# ─────────────────────────────────────────────────────────────────────

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; NC='\033[0m'
info()  { echo -e "${GREEN}[ford]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
error() { echo -e "${RED}[erro]${NC} $*"; exit 1; }

# ── Cleanup trap ───────────────────────────────────────────────────────
COMPOSE=""
cleanup() {
    echo ""
    if [ -n "$COMPOSE" ]; then
        info "Parando backend..."
        cd "$ROOT"
        $COMPOSE down 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

# ── .env check ────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
    warn ".env não encontrado — copiando de .env.example"
    cp .env.example .env
    echo ""
    echo -e "${RED}ATENÇÃO: Edite o arquivo .env antes de continuar!${NC}"
    echo "  - ANTHROPIC_API_KEY  (obrigatório para IA)"
    echo "  - ORACLE_USER / ORACLE_PASSWORD"
    echo "  - ENCRYPTION_KEY     (gere com: openssl rand -base64 32)"
    echo "  - JWT_SECRET         (gere com: openssl rand -base64 64)"
    echo "  - INTERNAL_API_KEY   (gere com: openssl rand -hex 32)"
    echo ""
    read -r -p "Pressione ENTER para continuar mesmo assim, ou Ctrl+C para cancelar..."
fi

source .env 2>/dev/null || true

[ -z "${ENCRYPTION_KEY}" ]  && warn "ENCRYPTION_KEY não definida — Java API pode falhar"
[ -z "${JWT_SECRET}" ]      && warn "JWT_SECRET não definida — Java API pode falhar"
[ -z "${INTERNAL_API_KEY}" ] && warn "INTERNAL_API_KEY não definida — comunicação Java↔Python pode falhar"
[ -z "${ORACLE_USER}" ]     && warn "ORACLE_USER não definido — banco não vai conectar"

# ── Docker check ──────────────────────────────────────────────────────
command -v docker &>/dev/null || error "Docker não encontrado. Instale em: https://docs.docker.com/get-docker/"

DOCKER_SUDO=""
if ! docker ps &>/dev/null 2>&1; then
    if sudo docker ps &>/dev/null 2>&1; then
        warn "Usando sudo para Docker socket"
        warn "Para remover sudo: sudo usermod -aG docker \$USER && newgrp docker"
        DOCKER_SUDO="sudo"
    else
        error "Sem acesso ao Docker. Tente: sudo systemctl start docker  OU  sudo usermod -aG docker \$USER"
    fi
fi

if $DOCKER_SUDO docker compose version &>/dev/null 2>&1; then
    COMPOSE="$DOCKER_SUDO docker compose"
elif command -v docker-compose &>/dev/null; then
    COMPOSE="${DOCKER_SUDO:+$DOCKER_SUDO }docker-compose"
else
    error "docker-compose não encontrado. Instale Docker Desktop ou docker-compose."
fi

# ── Node check ────────────────────────────────────────────────────────
command -v node &>/dev/null || error "Node.js não encontrado. Instale em: https://nodejs.org"

# ── TLS certificate ───────────────────────────────────────────────────
CERT_DIR="$ROOT/nginx/certs"
if [ ! -f "$CERT_DIR/cert.pem" ] || [ ! -f "$CERT_DIR/key.pem" ]; then
    if command -v openssl &>/dev/null; then
        info "Gerando certificado TLS auto-assinado..."
        mkdir -p "$CERT_DIR"
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$CERT_DIR/key.pem" \
            -out    "$CERT_DIR/cert.pem" \
            -subj "/C=BR/ST=SP/L=SaoPaulo/O=FordChallenge/CN=localhost" 2>/dev/null
        info "Certificado gerado"
    else
        warn "openssl não encontrado — nginx TLS não vai iniciar (instale com: sudo apt install openssl)"
    fi
fi

# ── Build ─────────────────────────────────────────────────────────────
info "Buildando imagens Docker..."
if ! $COMPOSE build 2>&1; then
    echo ""
    echo -e "${RED}[erro]${NC} Docker build falhou. Últimas linhas acima indicam o problema."
    echo "  Dica: verifique conexão com internet (Maven/pip precisam baixar dependências)"
    exit 1
fi

# ── Start backend (detached) ──────────────────────────────────────────
info "Subindo containers (nginx + python-ia + java-api)..."
if ! $COMPOSE up -d 2>&1; then
    echo ""
    warn "Falha ao subir containers. Verificando logs..."
    echo "--- java-api ---"
    $COMPOSE logs --tail=30 java-api 2>/dev/null || true
    echo "--- python-ia ---"
    $COMPOSE logs --tail=10 python-ia 2>/dev/null || true
    exit 1
fi

# ── Wait: Python IA ───────────────────────────────────────────────────
info "Aguardando Python IA... (pode demorar até 2 min no 1º boot — baixa embeddings)"
ATTEMPTS=0
until curl -sf http://localhost:8000/health >/dev/null 2>&1; do
    [ $ATTEMPTS -ge 24 ] && break
    printf "."
    sleep 5
    ATTEMPTS=$((ATTEMPTS+1))
done
echo ""
if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
    info "Python IA OK"
else
    warn "Python IA não respondeu ainda"
    warn "  Logs: docker logs ford-python-ia"
fi

# ── Wait: Java API ────────────────────────────────────────────────────
info "Aguardando Java API..."
ATTEMPTS=0
until curl -sf http://localhost:8080/actuator/health >/dev/null 2>&1; do
    [ $ATTEMPTS -ge 18 ] && break
    printf "."
    sleep 5
    ATTEMPTS=$((ATTEMPTS+1))
done
echo ""
if curl -sf http://localhost:8080/actuator/health >/dev/null 2>&1; then
    info "Java API OK  → http://localhost:8080"
    # Nginx também deve estar up agora (depende do java-api healthy)
    if curl -sfk https://localhost/actuator/health >/dev/null 2>&1; then
        info "Nginx TLS OK → https://localhost"
    else
        warn "Nginx ainda não respondeu em :443"
        warn "  Logs: docker logs ford-nginx"
    fi
else
    warn "Java API não respondeu — verifique os logs:"
    echo ""
    $COMPOSE logs --tail=40 java-api 2>/dev/null || true
fi

# ── Mobile ────────────────────────────────────────────────────────────
info "Preparando mobile..."
cd "$ROOT/mobile"

if [ ! -d "node_modules" ]; then
    info "Instalando dependências npm..."
    npm install
fi

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        info "Criado mobile/.env a partir de .env.example"
    else
        echo "EXPO_PUBLIC_API_URL=http://localhost:8080" > .env
        info "Criado mobile/.env"
    fi
fi

echo ""
info "Iniciando Expo..."
echo "  Escaneie o QR code com Expo Go (Android/iOS)"
echo "  Pressione 'w' para abrir no navegador"
echo "  Ctrl+C para parar todos os serviços"
echo ""

npx expo start
