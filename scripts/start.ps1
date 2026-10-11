$ErrorActionPreference = 'Stop'
$tcRepoRoot = Split-Path -Parent $PSScriptRoot
$env:PYTHONPATH = (Join-Path $tcRepoRoot 'src') + ';' + $tcRepoRoot
$env:PYTHONUTF8 = '1'
& (Join-Path $tcRepoRoot '.venv\Scripts\python.exe') -m lab.bootstrap
if ($LASTEXITCODE -ne 0) { throw 'Lab startup failed; inspect .runtime logs' }
