@echo off
:: Inicia o microsservico de IA na porta 8000
cd /d "%~dp0"

python --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Python nao encontrado. Instale Python 3.11+ e adicione ao PATH.
    pause
    exit /b 1
)

python -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo Instalando dependencias...
    python -m pip install -r requirements.txt -q
    if errorlevel 1 (
        echo ERRO: Falha ao instalar dependencias.
        pause
        exit /b 1
    )
)

echo Populando KB com dados seed...
python scripts/01_seed_kb.py

echo.
echo Populando catalogos validados...
python scripts/02_popular_validated.py

echo.
echo Iniciando API na porta 8000...
echo Docs: http://localhost:8000/docs
echo.

set PYTHONPATH=src
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --app-dir src --reload

pause
