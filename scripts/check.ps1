$ErrorActionPreference = 'Stop'
$tcRepoRoot = Split-Path -Parent $PSScriptRoot
$env:PYTHONPATH = (Join-Path $tcRepoRoot 'src') + ';' + $tcRepoRoot
$env:PYTHONUTF8 = '1'
& (Join-Path $tcRepoRoot '.venv\Scripts\python.exe') -m pytest (Join-Path $tcRepoRoot 'tests') -q
if ($LASTEXITCODE -ne 0) { throw 'Policy checks failed' }
& (Join-Path $tcRepoRoot '.venv\Scripts\python.exe') -m lab.checks
if ($LASTEXITCODE -ne 0) { throw 'Integration checks failed; see .runtime/checks' }
& (Join-Path $tcRepoRoot '.venv\Scripts\python.exe') -m lab.check_agent
if ($LASTEXITCODE -ne 0) { throw 'Agent checks failed; see .runtime/agent-checks' }
