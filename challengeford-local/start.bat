@echo off
:: ─────────────────────────────────────────────────────────────────────
:: Ford Challenge — Start All Services (Windows)
::
:: Services:
::   :8000  Python IA microservice  (docker-compose)
::   :8080  Java Spring Boot API    (docker-compose)
::   Expo   Mobile app              (interactive, runs in this window)
::
:: Requirements: Docker Desktop, Node.js, npm
:: ─────────────────────────────────────────────────────────────────────
setlocal enabledelayedexpansion

cd /d "%~dp0"
set ROOT=%~dp0

:: ── .env check ────────────────────────────────────────────────────────
if not exist ".env" (
    echo [warn] .env nao encontrado — copiando de .env.example
    copy ".env.example" ".env" >nul
    echo.
    echo [ATENCAO] Edite o arquivo .env antes de continuar!
    echo   - ANTHROPIC_API_KEY  (obrigatorio para IA)
    echo   - ENCRYPTION_KEY     (gere com: openssl rand -base64 32)
    echo   - JWT_SECRET         (gere com: openssl rand -base64 64)
    echo.
    pause
)

:: ── Docker check ──────────────────────────────────────────────────────
docker --version >nul 2>&1
if errorlevel 1 (
    echo [erro] Docker nao encontrado.
    echo        Instale Docker Desktop: https://docs.docker.com/desktop/windows/
    pause
    exit /b 1
)

:: Prefer docker compose v2, fallback to docker-compose v1
docker compose version >nul 2>&1
if errorlevel 1 (
    docker-compose --version >nul 2>&1
    if errorlevel 1 (
        echo [erro] docker-compose nao encontrado.
        pause
        exit /b 1
    )
    set COMPOSE=docker-compose
) else (
    set COMPOSE=docker compose
)

:: ── Node check ────────────────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo [erro] Node.js nao encontrado. Instale em: https://nodejs.org
    pause
    exit /b 1
)

:: ── Start backend (detached) ──────────────────────────────────────────
echo [ford] Iniciando backend (Python IA + Java API) via Docker...
%COMPOSE% up -d --build
if errorlevel 1 (
    echo [erro] Falha ao iniciar docker-compose.
    pause
    exit /b 1
)

echo [ford] Aguardando servicos ficarem disponiveis...
echo   Python IA -- http://localhost:8000/health
echo   Java API  -- http://localhost:8080/actuator/health

:: Wait for Python IA (up to 2 minutes)
set ATTEMPTS=0
:wait_python
curl -sf http://localhost:8000/health >nul 2>&1
if not errorlevel 1 goto python_ok
if %ATTEMPTS% GEQ 24 goto python_timeout
set /a ATTEMPTS+=1
timeout /t 5 /nobreak >nul
goto wait_python
:python_timeout
echo [warn] Python IA ainda nao respondeu — verifique: docker logs ford-python-ia
goto check_java
:python_ok
echo [ford] Python IA OK

:: Wait for Java API (up to 60s)
:check_java
set ATTEMPTS=0
:wait_java
curl -sf http://localhost:8080/actuator/health >nul 2>&1
if not errorlevel 1 goto java_ok
if %ATTEMPTS% GEQ 12 goto java_timeout
set /a ATTEMPTS+=1
timeout /t 5 /nobreak >nul
goto wait_java
:java_timeout
echo [warn] Java API ainda nao respondeu — verifique: docker logs ford-java-api
goto start_mobile
:java_ok
echo [ford] Java API OK

:: ── Mobile app ────────────────────────────────────────────────────────
:start_mobile
echo [ford] Preparando mobile...
cd /d "%ROOT%mobile"

if not exist "node_modules" (
    echo [ford] Instalando dependencias npm...
    call npm install
    if errorlevel 1 (
        echo [erro] Falha ao instalar dependencias npm.
        pause
        exit /b 1
    )
)

if not exist ".env" (
    echo EXPO_PUBLIC_API_URL=http://localhost:8080 > .env
    echo [ford] Criado mobile\.env com EXPO_PUBLIC_API_URL=http://localhost:8080
)

echo.
echo [ford] Iniciando Expo...
echo.
echo   Escaneie o QR code com Expo Go (Android/iOS)
echo   Pressione 'w' para abrir no navegador
echo   Feche esta janela ou Ctrl+C para parar
echo.

call npx expo start

:: ── Cleanup ───────────────────────────────────────────────────────────
cd /d "%ROOT%"
echo [ford] Parando backend...
%COMPOSE% down
pause
