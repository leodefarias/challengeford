# Inicia o microsservico de IA na porta 8000
# Executar com: powershell -ExecutionPolicy Bypass -File start_api.ps1

Set-Location $PSScriptRoot

# Verifica Python
$python = $null
foreach ($cmd in @("python", "python3", "py")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        $python = $cmd
        break
    }
}

if (-not $python) {
    Write-Error "Python nao encontrado. Instale Python 3.11+ e adicione ao PATH."
    exit 1
}

Write-Host "Usando: $python $(& $python --version)"

# Instala dependencias se necessario
try {
    & $python -c "import fastapi" 2>$null
} catch {
    Write-Host "Instalando dependencias..."
    & $python -m pip install -r requirements.txt -q
}

# Instala navegador do Playwright se necessario
& $python -c "from playwright.sync_api import sync_playwright; sync_playwright().__enter__().chromium" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Instalando Playwright Chromium..."
    & $python -m playwright install chromium
}

Write-Host ""
Write-Host "Populando KB com dados seed..."
& $python scripts/01_seed_kb.py

Write-Host ""
Write-Host "Populando catalogos validados..."
& $python scripts/02_popular_validated.py

Write-Host ""
Write-Host "Iniciando API na porta 8000..."
Write-Host "Docs: http://localhost:8000/docs"
Write-Host ""

$env:PYTHONPATH = "src"
& $python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --app-dir src --reload
