$ErrorActionPreference = 'Stop'
$tcRepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $tcRepoRoot
$tcTools = Join-Path $tcRepoRoot '.tools'
New-Item -ItemType Directory -Force -Path $tcTools | Out-Null
$env:UV_CACHE_DIR = Join-Path $tcRepoRoot '.runtime\uv-cache'
$env:UV_PYTHON_INSTALL_DIR = Join-Path $tcTools 'python'
$tcUv = Join-Path $tcTools 'uv\uv.exe'
if (-not (Test-Path -LiteralPath $tcUv)) {
    Invoke-WebRequest -Uri 'https://github.com/astral-sh/uv/releases/download/0.12.23/uv-x86_64-pc-windows-msvc.zip' -OutFile (Join-Path $tcTools 'uv.zip')
    Expand-Archive -LiteralPath (Join-Path $tcTools 'uv.zip') -DestinationPath (Join-Path $tcTools 'uv') -Force
}
& $tcUv python install 3.14.8
if ($LASTEXITCODE -ne 0) { throw 'Python install failed' }
& $tcUv sync --python 3.14.8 --frozen
if ($LASTEXITCODE -ne 0) { throw 'Dependency sync failed' }
$tcProxy = Join-Path $tcTools 'toxiproxy-server.exe'
if (-not (Test-Path -LiteralPath $tcProxy)) {
    Invoke-WebRequest -Uri 'https://github.com/Shopify/toxiproxy/releases/download/v2.12.0/toxiproxy-server-windows-amd64.exe' -OutFile $tcProxy
    Invoke-WebRequest -Uri 'https://github.com/Shopify/toxiproxy/releases/download/v2.12.0/checksums.txt' -OutFile (Join-Path $tcTools 'toxiproxy-checksums.txt')
}
$tcHash = (Get-FileHash -LiteralPath $tcProxy -Algorithm SHA256).Hash.ToLower()
$tcExpected = Get-Content -LiteralPath (Join-Path $tcTools 'toxiproxy-checksums.txt') | Where-Object {$_ -match 'toxiproxy-server-windows-amd64.exe$'}
if (-not $tcExpected.StartsWith($tcHash)) {throw 'Toxiproxy checksum mismatch'}
$tcPg = Join-Path $tcTools 'postgresql\pgsql\bin\postgres.exe'
if (-not (Test-Path -LiteralPath $tcPg)) {
    $tcArchive = Join-Path $tcTools 'postgresql-18.6.zip'
    Invoke-WebRequest -Uri 'https://get.enterprisedb.com/postgresql/postgresql-18.6-1-windows-x64-binaries.zip' -OutFile $tcArchive
    Expand-Archive -LiteralPath $tcArchive -DestinationPath (Join-Path $tcTools 'postgresql') -Force
}
& $tcPg --version
Write-Host 'Local tools ready; no global services or trust stores changed.'
