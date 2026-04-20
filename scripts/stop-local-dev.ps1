$ErrorActionPreference = 'SilentlyContinue'

$phpProcesses = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'php.exe' -and (
        $_.CommandLine -match 'localhost:8000' -or
        $_.CommandLine -match 'localhost:8080' -or
        $_.CommandLine -match '127.0.0.1:8080'
    )
}

if (-not $phpProcesses) {
    Write-Host '沒有找到本專案的本機 PHP 開發伺服器。' -ForegroundColor Yellow
    exit 0
}

foreach ($proc in $phpProcesses) {
    Stop-Process -Id $proc.ProcessId -Force
    Write-Host "已停止 php.exe PID=$($proc.ProcessId)" -ForegroundColor Green
}
