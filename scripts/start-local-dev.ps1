$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $projectRoot 'backend'
$routerPath  = Join-Path $projectRoot 'tests/e2e/dev-router.php'

# Detect PHP
$phpCandidates = @(
    'D:\app\appserv\php7\php.exe',
    'D:\app\AppServ\php7\php.exe',
    'C:\AppServ\php8\php.exe',
    'C:\AppServ\php7\php.exe',
    'C:\xampp\php\php.exe'
)
$phpPath = $phpCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $phpPath) { $phpPath = 'php' }

# Detect MySQL
$mysqlCandidates = @(
    'D:\app\AppServ\MySQL\bin\mysql.exe',
    'C:\AppServ\MySQL\bin\mysql.exe',
    'C:\xampp\mysql\bin\mysql.exe'
)
$mysqlPath = $mysqlCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $mysqlPath) { $mysqlPath = 'mysql' }

# Check database — try empty password (XAMPP) then 12345678 (AppServ)
$dbCheck = $null
$prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
$dbCheck = & $mysqlPath -u root -e "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='club_platform';" 2>$null
if (-not ($dbCheck -match 'club_platform')) {
    $dbCheck = & $mysqlPath -u root -p12345678 -e "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='club_platform';" 2>$null
}
$ErrorActionPreference = $prev
if (-not ($dbCheck -match 'club_platform')) {
    Write-Host '[!] DB club_platform not found or MySQL not running.' -ForegroundColor Red
    Write-Host '    Start MySQL, then run: mysql -u root < database/schema.sql' -ForegroundColor Yellow
    exit 1
}

Write-Host '[1/3] Starting frontend http://localhost:8000 ...' -ForegroundColor Cyan
Start-Process -FilePath $phpPath -ArgumentList "-S localhost:8000 `"$routerPath`"" -WorkingDirectory $projectRoot

Write-Host '[2/3] Starting backend  http://localhost:8080 ...' -ForegroundColor Cyan
Start-Process -FilePath $phpPath -ArgumentList '-S localhost:8080' -WorkingDirectory $backendPath

Write-Host '[3/3] Done.' -ForegroundColor Green
Write-Host '  Frontend : http://localhost:8000' -ForegroundColor Green
Write-Host '  Backend  : http://localhost:8080/api' -ForegroundColor Green
Write-Host ''
Write-Host 'To stop: kill php.exe in Task Manager, or run scripts/stop-local-dev.ps1' -ForegroundColor Yellow
