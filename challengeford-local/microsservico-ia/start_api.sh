#!/bin/bash
# Inicia o microsserviço de IA na porta 8000
set -e

cd "$(dirname "$0")"

if ! python3 -c "import fastapi" 2>/dev/null; then
  echo "Instalando dependências..."
  python3 -m pip install -r requirements.txt --break-system-packages -q
fi

echo "Populando KB com dados seed..."
python3 scripts/01_seed_kb.py 2>/dev/null | grep -E "(KB inicializada|documentos|Seed direto)" || true

echo "Populando catálogos validados..."
python3 scripts/02_popular_validated.py 2>/dev/null | grep -E "Salvo|catálogos" || true

echo ""
echo "Iniciando API na porta 8000..."
echo "Docs: http://localhost:8000/docs"
echo ""
PYTHONPATH=src python3 -m uvicorn api.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --app-dir src \
  --reload
