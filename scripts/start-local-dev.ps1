$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendPath = Join-Path $projectRoot 'frontend'
$backendPath = Join-Path $projectRoot 'backend'

Write-Host '[1/3] 啟動 frontend 伺服器 http://localhost:8000 ...' -ForegroundColor Cyan
Start-Process -FilePath 'php' -ArgumentList '-S localhost:8000' -WorkingDirectory $frontendPath

Write-Host '[2/3] 啟動 backend 伺服器 http://localhost:8080 ...' -ForegroundColor Cyan
Start-Process -FilePath 'php' -ArgumentList '-S localhost:8080' -WorkingDirectory $backendPath

Write-Host '[3/3] 啟動完成，請開啟下列網址：' -ForegroundColor Green
Write-Host '  前端: http://localhost:8000' -ForegroundColor Green
Write-Host '  後端: http://localhost:8080/api' -ForegroundColor Green
Write-Host ''
Write-Host '若要停止伺服器，請在工作管理員結束 php.exe，或使用 scripts/stop-local-dev.ps1。' -ForegroundColor Yellow
