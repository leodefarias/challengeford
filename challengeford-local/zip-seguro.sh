#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# zip-seguro.sh — Dois modos:
#
#   ./zip-seguro.sh          → zip SEM .env (para repositório/GitHub)
#   ./zip-seguro.sh --demo   → zip COM .env (para envio ao avaliador)
#                              AVISO: enviar apenas para UMA pessoa, não publicar
# ──────────────────────────────────────────────────────────────────────
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-}"

EXCLUDES=(
  ".git/*"
  ".claude/*"
  "__pycache__/*"
  "*/__pycache__/*"
  "*.pyc" "*.pyo"
  "node_modules/*"
  "mobile/node_modules/*"
  "backend-java/target/*"
  "microsservico-ia/data/chromadb/*"
  "microsservico-ia/data/raw/*"
  "*.txt"
  "zip-seguro.sh"
  "nginx/certs/key.pem"
  "nginx/certs/cert.pem"
  "*.key" "*.pem" "*.jks" "*.p12"
)

cd "$ROOT"

if [ "$MODE" = "--demo" ]; then
  DEST="$ROOT/../challengeford-ENTREGA-PRIVADO.zip"
  rm -f "$DEST"

  # Verifica se .env existe e tem as keys preenchidas
  if [ ! -f ".env" ]; then
    echo "ERRO: .env não encontrado. Crie com as credenciais antes de gerar o zip de entrega."
    exit 1
  fi
  if grep -q "sk-ant-\.\.\." .env 2>/dev/null; then
    echo "AVISO: ANTHROPIC_API_KEY parece estar com placeholder. Atualize antes de enviar."
  fi

  # Inclui .env no zip (mode demo)
  EXCLUDE_ARGS=()
  for ex in "${EXCLUDES[@]}"; do
    EXCLUDE_ARGS+=(--exclude "$ex")
  done

  zip -r "$DEST" . "${EXCLUDE_ARGS[@]}"

  echo ""
  echo "Zip de ENTREGA gerado: $DEST"
  echo ""
  echo "ATENÇÃO — este zip contém credenciais reais:"
  unzip -l "$DEST" | grep -E "^.*\.env$" || true
  echo ""
  echo "Envie SOMENTE para o avaliador. NÃO publique."

else
  DEST="$ROOT/../challengeford-publico.zip"
  rm -f "$DEST"

  EXCLUDE_ARGS=(--exclude "*.env" --exclude ".env")
  for ex in "${EXCLUDES[@]}"; do
    EXCLUDE_ARGS+=(--exclude "$ex")
  done

  zip -r "$DEST" . "${EXCLUDE_ARGS[@]}"

  echo ""
  echo "Zip público gerado: $DEST"
  echo ""
  echo "VERIFIQUE antes de publicar:"
  unzip -l "$DEST" | grep -iE "\.env$|key\.pem|password" \
    && echo "ALERTA: revisar antes de publicar!" \
    || echo "OK — nenhum segredo detectado"
fi
