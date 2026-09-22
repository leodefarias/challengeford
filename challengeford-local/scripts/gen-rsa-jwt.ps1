# Gera RSA_PRIVATE_KEY / RSA_PUBLIC_KEY (Base64) para JWT RS256 e anexa ao .env se vazios.
param(
    [string]$EnvFile = ".env",
    [string]$OpenSsl = "openssl"
)

$tmp = Join-Path $env:TEMP ("ford-rsa-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
    & $OpenSsl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$tmp\private.pem" 2>$null
    & $OpenSsl rsa -in "$tmp\private.pem" -pubout -out "$tmp\public.pem" 2>$null
    & $OpenSsl pkcs8 -topk8 -inform PEM -outform DER -nocrypt -in "$tmp\private.pem" -out "$tmp\private.der" 2>$null
    & $OpenSsl rsa -pubin -in "$tmp\public.pem" -outform DER -out "$tmp\public.der" 2>$null

    $privB64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("$tmp\private.der"))
    $pubB64  = [Convert]::ToBase64String([IO.File]::ReadAllBytes("$tmp\public.der"))

    Write-Host "RSA_PRIVATE_KEY=$privB64"
    Write-Host "RSA_PUBLIC_KEY=$pubB64"

    if (Test-Path $EnvFile) {
        $lines = @(Get-Content $EnvFile)
        function Set-Key([string]$k, [string]$v) {
            $script:found = $false
            $script:lines = @(
                $script:lines | ForEach-Object {
                    if ($_ -match ("^" + [regex]::Escape($k) + "=")) {
                        $script:found = $true
                        if ($Matches[0] -match ".+=(\s*)$" -or $_ -match "=$") { "$k=$v" }
                        elseif (($_ -split "=",2)[1].Trim() -eq "") { "$k=$v" }
                        else { $_ }
                    } else { $_ }
                }
            )
            if (-not $script:found) { $script:lines += "$k=$v" }
        }
        $script:lines = $lines
        $privCur = ($lines | Where-Object { $_ -match "^RSA_PRIVATE_KEY=" } | Select-Object -First 1)
        $pubCur  = ($lines | Where-Object { $_ -match "^RSA_PUBLIC_KEY=" } | Select-Object -First 1)
        if (-not $privCur -or ($privCur -split "=",2)[1].Trim() -eq "") {
            if (-not ($lines | Where-Object { $_ -match "^RSA_PRIVATE_KEY=" })) { $script:lines += "RSA_PRIVATE_KEY=$privB64" }
            else { $script:lines = $script:lines | ForEach-Object { if ($_ -match "^RSA_PRIVATE_KEY=") { "RSA_PRIVATE_KEY=$privB64" } else { $_ } } }
            Write-Host "[ford] RSA_PRIVATE_KEY gravado em $EnvFile"
        }
        if (-not $pubCur -or ($pubCur -split "=",2)[1].Trim() -eq "") {
            if (-not ($script:lines | Where-Object { $_ -match "^RSA_PUBLIC_KEY=" })) { $script:lines += "RSA_PUBLIC_KEY=$pubB64" }
            else { $script:lines = $script:lines | ForEach-Object { if ($_ -match "^RSA_PUBLIC_KEY=") { "RSA_PUBLIC_KEY=$pubB64" } else { $_ } } }
            Write-Host "[ford] RSA_PUBLIC_KEY gravado em $EnvFile"
        }
        Set-Content -Path $EnvFile -Value $script:lines -Encoding utf8
    }
}
finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
