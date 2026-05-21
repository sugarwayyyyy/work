$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $projectRoot 'backend'
$routerPath = Join-Path $projectRoot 'tests/e2e/dev-router.php'
if (Test-Path 'C:\xampp\php\php.exe') {
    $phpPath = 'C:\xampp\php\php.exe'
} elseif (Test-Path 'C:\AppServ\php8\php.exe') {
    $phpPath = 'C:\AppServ\php8\php.exe'
} elseif (Test-Path 'C:\AppServ\php7\php.exe') {
    $phpPath = 'C:\AppServ\php7\php.exe'
} else {
    $phpPath = 'php'
}

# 檢查資料庫是否存在
$mysqlCandidates = @(
    'C:\xampp\mysql\bin\mysql.exe',
    'D:\app\AppServ\MySQL\bin\mysql.exe',
    'C:\AppServ\MySQL\bin\mysql.exe'
)
$mysqlPath = $mysqlCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $mysqlPath) { $mysqlPath = 'mysql' }

$dbCheck = & $mysqlPath -u root -p12345678 -e "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='club_platform';" 2>$null
if (-not ($dbCheck -match 'club_platform')) {
    Write-Host '[!] 資料庫 club_platform 不存在！' -ForegroundColor Red
    Write-Host '    請先依照 QUICKSTART.md 步驟 1 匯入資料庫，再重新執行此腳本。' -ForegroundColor Red
    Write-Host '    範例：mysql -u root -p < database/schema.sql' -ForegroundColor Yellow
    exit 1
}

Write-Host '[1/3] 啟動 frontend 伺服器 http://localhost:8000 ...' -ForegroundColor Cyan
Start-Process -FilePath $phpPath -ArgumentList '-S localhost:8000', $routerPath -WorkingDirectory $projectRoot

Write-Host '[2/3] 啟動 backend 伺服器 http://localhost:8080 ...' -ForegroundColor Cyan
Start-Process -FilePath $phpPath -ArgumentList '-S localhost:8080' -WorkingDirectory $backendPath

Write-Host '[3/3] 啟動完成，請開啟下列網址：' -ForegroundColor Green
Write-Host '  前端: http://localhost:8000' -ForegroundColor Green
Write-Host '  前端(相容): http://localhost:8000/frontend/index.html' -ForegroundColor Green
Write-Host '  後端: http://localhost:8080/api' -ForegroundColor Green
Write-Host ''
Write-Host '若要停止伺服器，請在工作管理員結束 php.exe，或使用 scripts/stop-local-dev.ps1。' -ForegroundColor Yellow
