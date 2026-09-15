# Fills empty JWT_SECRET / ENCRYPTION_KEY / INTERNAL_API_KEY in .env (does not overwrite).
param(
    [string]$EnvFile = ".env",
    [string]$OpenSsl = "openssl"
)

if (-not (Test-Path $EnvFile)) { exit 0 }

$script:lines = @(Get-Content -Path $EnvFile)
$script:changed = $false

function Get-EnvVal([string]$key) {
    foreach ($line in $script:lines) {
        if ($line -match ("^" + [regex]::Escape($key) + "=(.*)$")) {
            return $Matches[1].Trim()
        }
    }
    return ""
}

function Set-EnvVal([string]$key, [string]$value) {
    $found = $false
    $script:lines = @(
        $script:lines | ForEach-Object {
            if ($_ -match ("^" + [regex]::Escape($key) + "=")) {
                $found = $true
                "$key=$value"
            } else {
                $_
            }
        }
    )
    if (-not $found) {
        $script:lines += "$key=$value"
    }
}

function Add-SecretIfMissing([string]$key, [string[]]$opensslArgs) {
    $current = Get-EnvVal $key
    if ($current) { return }
    $raw = & $OpenSsl rand @opensslArgs 2>$null
    $value = (($raw | Out-String).Trim() -replace "[\r\n]", "")
    if (-not $value) {
        Write-Host "[warn] Falha ao gerar $key"
        return
    }
    Set-EnvVal $key $value
    $script:changed = $true
    Write-Host "[ford] Gerado $key"
}

Add-SecretIfMissing "JWT_SECRET" @("-base64", "64")
Add-SecretIfMissing "ENCRYPTION_KEY" @("-base64", "32")
Add-SecretIfMissing "INTERNAL_API_KEY" @("-hex", "32")

if ($script:changed) {
    Set-Content -Path $EnvFile -Value $script:lines -Encoding utf8
}
