#!/usr/bin/env bash
# Gera ZIPs de entrega (sem secrets / node_modules / target).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENT="$ROOT/entregas"
cd "$ROOT"

exclude=(
  -x '*.env' -x '*.env.*' -x '*/*.env' -x '*/.env.local'
  -x '*/node_modules/*' -x '*/target/*' -x '*/.git/*'
  -x '*/__pycache__/*' -x '*.apk' -x '*.aab'
  -x '*/.tools/*' -x '*/dist/*'
)

echo "==> 01 Arquitetura"
rm -f "$ENT/01_arquitetura/autosight-arquitetura-sprint3.zip"
zip -r -q "$ENT/01_arquitetura/autosight-arquitetura-sprint3.zip" \
  challengeford-local/README.md \
  challengeford-local/backend-java/src \
  challengeford-local/backend-java/pom.xml \
  challengeford-local/backend-java/README.md \
  challengeford-local/microsservico-ia/src \
  challengeford-local/microsservico-ia/requirements.txt \
  challengeford-local/microsservico-ia/README.md \
  challengeford-local/docker-compose.yml \
  challengeford-local/pitch-entrega/04_arquitetura_togaf.md \
  challengeford-local/pitch-entrega/11_evidencia_testes_api.md \
  challengeford-local/pitch-entrega/evidencias/api \
  "${exclude[@]}" || zip -r -q "$ENT/01_arquitetura/autosight-arquitetura-sprint3.zip" \
  challengeford-local/README.md \
  challengeford-local/backend-java/src \
  challengeford-local/backend-java/pom.xml \
  challengeford-local/pitch-entrega/04_arquitetura_togaf.md \
  challengeford-local/pitch-entrega/11_evidencia_testes_api.md \
  challengeford-local/pitch-entrega/evidencias/api

echo "==> 02 Mobile (código; APK separado)"
rm -f "$ENT/02_mobile/autosight-mobile-sprint3.zip"
zip -r -q "$ENT/02_mobile/autosight-mobile-sprint3.zip" \
  challengeford-local/mobile/App.tsx \
  challengeford-local/mobile/app.json \
  challengeford-local/mobile/package.json \
  challengeford-local/mobile/eas.json \
  challengeford-local/mobile/README.md \
  challengeford-local/mobile/BUILD_APK.md \
  challengeford-local/mobile/src \
  challengeford-local/mobile/assets \
  challengeford-local/mobile/screenshots \
  challengeford-local/mobile/.maestro \
  challengeford-local/mobile/scripts \
  -x '*/node_modules/*' -x '*/dist/*' -x '*.apk'

# Copiar APK se existir
if [[ -f challengeford-local/mobile/dist/autosight-preview.apk ]]; then
  cp -f challengeford-local/mobile/dist/autosight-preview.apk "$ENT/02_mobile/autosight-preview.apk"
  echo "    APK copiado ($(du -h "$ENT/02_mobile/autosight-preview.apk" | cut -f1))"
fi
echo "https://expo.dev/artifacts/eas/LJM-_EgZB5dqEb28Tt8bMzkMjhBt4qrunf4hwOqTzfc.apk" > "$ENT/02_mobile/LINK_APK.txt"

echo "==> 03 QA Azure"
rm -f "$ENT/03_qa_azure/autosight-qa-azure-sprint3.zip"
zip -r -q "$ENT/03_qa_azure/autosight-qa-azure-sprint3.zip" \
  challengeford-local/pitch-entrega/09_azure_devops_backlog.md \
  challengeford-local/pitch-entrega/azure-devops \
  challengeford-local/pitch-entrega/evidencias/azure \
  challengeford-local/pitch-entrega/12_acoes_manuais_azure_apk.md \
  challengeford-local/scripts/seed_azure_devops.py
echo "https://dev.azure.com/RM555211/AutoSight/_backlogs" > "$ENT/03_qa_azure/LINK_AZURE_BOARDS.txt"

echo "==> 04 Cyber"
rm -f "$ENT/04_cybersecurity/autosight-cyber-sprint3.zip"
zip -r -q "$ENT/04_cybersecurity/autosight-cyber-sprint3.zip" \
  challengeford-local/pitch-entrega/10_cybersecurity_sprint3.md \
  challengeford-local/pitch-entrega/evidencias/ci \
  .github \
  .gitleaks.toml \
  challengeford-local/requisitos_de_seguranca
echo "https://github.com/leodefarias/challengeford/actions" > "$ENT/04_cybersecurity/LINK_GITHUB_ACTIONS.txt"

echo "==> 05 IA/ML"
rm -f "$ENT/05_ia_ml/autosight-ia-ml-sprint3.zip"
zip -r -q "$ENT/05_ia_ml/autosight-ia-ml-sprint3.zip" \
  ia_machine_learning/entrega \
  ia_machine_learning/DOCUMENTACAO_SPRINT3.md \
  challengeford-local/microsservico-ia/src/perfil_ml.py \
  challengeford-local/microsservico-ia/models

echo "==> tamanhos"
du -h "$ENT"/*/*.{zip,apk,txt,md} 2>/dev/null | sort -h
echo "OK"
