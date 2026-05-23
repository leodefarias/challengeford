@echo off
:: ─────────────────────────────────────────────────────────────────────
:: Ford Challenge — Start All Services (Windows)
::
:: Services:
::   :80/443  Nginx TLS reverse proxy  (docker-compose)
::   :8000    Python IA microservice   (docker-compose, interno)
::   :8080    Java Spring Boot API     (docker-compose)
::   Expo     Mobile app               (interactive, runs in this window)
::
:: Requirements: Docker Desktop, Node.js, npm, openssl (Git for Windows)
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
    echo   - ORACLE_USER / ORACLE_PASSWORD
    echo   - ENCRYPTION_KEY     (gere com: openssl rand -base64 32)
    echo   - JWT_SECRET         (gere com: openssl rand -base64 64)
    echo   - INTERNAL_API_KEY   (gere com: openssl rand -hex 32)
    echo.
    pause
)

:: ── Docker check ──────────────────────────────────────────────────────
docker --version >nul 2>&1
if errorlevel 1 (
    echo [erro] Docker nao encontrado.
    echo        Instale Docker Desktop: https://docs.docker.com/desktop/windows/
    pause & exit /b 1
)

docker compose version >nul 2>&1
if errorlevel 1 (
    docker-compose --version >nul 2>&1
    if errorlevel 1 (
        echo [erro] docker-compose nao encontrado.
        pause & exit /b 1
    )
    set COMPOSE=docker-compose
) else (
    set COMPOSE=docker compose
)

:: ── Node check ────────────────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo [erro] Node.js nao encontrado. Instale em: https://nodejs.org
    pause & exit /b 1
)

:: ── TLS certificate ───────────────────────────────────────────────────
set CERT_DIR=%ROOT%nginx\certs
if not exist "%CERT_DIR%\cert.pem" (
    openssl version >nul 2>&1
    if errorlevel 1 (
        if exist "C:\Program Files\Git\usr\bin\openssl.exe" (
            set OPENSSL="C:\Program Files\Git\usr\bin\openssl.exe"
        ) else (
            echo [warn] openssl nao encontrado — nginx TLS nao vai iniciar
            echo        Instale Git for Windows para ter openssl disponivel
            goto :skip_cert
        )
    ) else (
        set OPENSSL=openssl
    )
    echo [ford] Gerando certificado TLS auto-assinado...
    if not exist "%CERT_DIR%" mkdir "%CERT_DIR%"
    %OPENSSL% req -x509 -nodes -days 365 -newkey rsa:2048 ^
        -keyout "%CERT_DIR%\key.pem" ^
        -out "%CERT_DIR%\cert.pem" ^
        -subj "/C=BR/ST=SP/L=SaoPaulo/O=FordChallenge/CN=localhost" >nul 2>&1
    echo [ford] Certificado gerado
)
:skip_cert

:: ── Build ─────────────────────────────────────────────────────────────
echo [ford] Buildando imagens Docker...
%COMPOSE% build
echo [ford] Build concluido — subindo containers...

:: ── Start backend (detached) ──────────────────────────────────────────
echo [ford] Subindo containers (nginx + python-ia + java-api)...
%COMPOSE% up -d
if errorlevel 1 (
    echo.
    echo [warn] Falha ao subir containers. Verificando logs java-api...
    %COMPOSE% logs --tail=30 java-api
    pause & exit /b 1
)

echo [ford] Aguardando servicos...
echo   Python IA -- http://localhost:8000/health
echo   Java API  -- http://localhost:8080/actuator/health

:: Wait for Python IA (up to 2 min)
set ATTEMPTS=0
:wait_python
curl -sf http://localhost:8000/health >nul 2>&1
if not errorlevel 1 goto python_ok
if %ATTEMPTS% GEQ 24 goto python_timeout
set /a ATTEMPTS+=1
timeout /t 5 /nobreak >nul
goto wait_python
:python_timeout
echo [warn] Python IA nao respondeu — verifique: docker logs ford-python-ia
goto check_java
:python_ok
echo [ford] Python IA OK

:: Wait for Java API (up to 90s)
:check_java
set ATTEMPTS=0
:wait_java
curl -sf http://localhost:8080/actuator/health >nul 2>&1
if not errorlevel 1 goto java_ok
if %ATTEMPTS% GEQ 18 goto java_timeout
set /a ATTEMPTS+=1
timeout /t 5 /nobreak >nul
goto wait_java
:java_timeout
echo [warn] Java API nao respondeu. Logs:
%COMPOSE% logs --tail=40 java-api
goto start_mobile
:java_ok
echo [ford] Java API OK -- http://localhost:8080
curl -sfk https://localhost/actuator/health >nul 2>&1
if not errorlevel 1 (
    echo [ford] Nginx TLS OK -- https://localhost
) else (
    echo [warn] Nginx ainda nao respondeu em :443
)

:: ── Mobile app ────────────────────────────────────────────────────────
:start_mobile
echo [ford] Preparando mobile...
cd /d "%ROOT%mobile"

if not exist "node_modules" (
    echo [ford] Instalando dependencias npm...
    call npm install
    if errorlevel 1 (
        echo [erro] Falha ao instalar dependencias npm.
        pause & exit /b 1
    )
)

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [ford] Criado mobile\.env a partir de .env.example
    ) else (
        echo EXPO_PUBLIC_API_URL=http://localhost:8080 > .env
        echo [ford] Criado mobile\.env
    )
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
