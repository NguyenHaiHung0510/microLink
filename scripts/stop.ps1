$ErrorActionPreference = 'Stop'
$tcRepoRoot = Split-Path -Parent $PSScriptRoot
$tcRecordsPath = Join-Path $tcRepoRoot '.runtime\processes.json'
if (-not (Test-Path -LiteralPath $tcRecordsPath)) { throw 'No owned process record; refusing broad cleanup' }
$tcRecords = Get-Content -LiteralPath $tcRecordsPath -Raw | ConvertFrom-Json
foreach ($tcRecord in $tcRecords) {
    $tcProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($tcRecord.pid)"
    if ($tcProcess) {
        if ($tcProcess.CommandLine -notlike ('*' + $tcRepoRoot + '*')) { throw 'PID identity changed; retain process' }
        if ($tcRecord.name -eq 'controller') {
            try {Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:19030/action/stop' | Out-Null} catch { }
        }
        Stop-Process -Id $tcRecord.pid
    }
}
# pg_ctl addresses only this data directory, not the installed Windows PG service.
$tcPgCtl = Join-Path $tcRepoRoot '.tools\postgresql\pgsql\bin\pg_ctl.exe'
& $tcPgCtl -D (Join-Path $tcRepoRoot '.runtime\pgdata') -m fast -w stop
Write-Host 'Stopped owned lab only. Synthetic data and receipts retained.'
