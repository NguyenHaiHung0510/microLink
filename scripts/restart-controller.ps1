$ErrorActionPreference = 'Stop'
$tcRepoRoot = Split-Path -Parent $PSScriptRoot
$tcRecordsPath = Join-Path $tcRepoRoot '.runtime\processes.json'
$tcRecords = Get-Content -LiteralPath $tcRecordsPath -Raw | ConvertFrom-Json
foreach ($tcRecord in $tcRecords) {
    if ($tcRecord.name -eq 'controller') {
        $tcProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($tcRecord.pid)"
        if ($tcProcess) {
            if ($tcProcess.CommandLine -notlike ('*' + $tcRepoRoot + '*') -or $tcProcess.CommandLine -notlike '*lab.controller:app*') { throw 'Unexpected PID; refusing to stop' }
            Stop-Process -Id $tcRecord.pid
        }
        $env:PYTHONPATH = (Join-Path $tcRepoRoot 'src') + ';' + $tcRepoRoot
        $env:PYTHONUTF8 = '1'
        $tcNewProcess = Start-Process -FilePath (Join-Path $tcRepoRoot '.venv\Scripts\python.exe') -ArgumentList '-m','uvicorn','lab.controller:app','--host','127.0.0.1','--port','19030' -WorkingDirectory $tcRepoRoot -RedirectStandardOutput (Join-Path $tcRepoRoot '.runtime\controller.out.log') -RedirectStandardError (Join-Path $tcRepoRoot '.runtime\controller.log') -WindowStyle Hidden -PassThru
        $tcRecord.pid = $tcNewProcess.Id
    }
}
$tcRecords | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $tcRecordsPath -Encoding UTF8
