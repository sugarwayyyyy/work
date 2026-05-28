# setup-google-oauth.ps1
# 自動完成 Google OAuth 本機環境設定：
#   1. 偵測 PHP 安裝位置
#   2. 下載 cacert.pem（解決 AppServ/XAMPP Windows SSL curl error 60）
#   3. 建立或更新 backend/config.local.php
#
# 執行方式：
#   powershell -ExecutionPolicy Bypass -File scripts/setup-google-oauth.ps1

$ErrorActionPreference = 'Stop'

# ── Google OAuth Client ID（團隊共用，非機密資訊）───────────────────────────
# Client ID 在前端 HTML 中本來就是公開的，所有人使用同一個即可。
# 若需要更換，直接修改此行。
$GOOGLE_CLIENT_ID = '718377517460-kotdm5ch47ib6ije5o65tidkvukshmsb.apps.googleusercontent.com'

# ── 常見 AppServ / XAMPP PHP 目錄 ────────────────────────────────────────────
$phpDirCandidates = @(
    'D:\app\appserv\php7',
    'D:\app\appserv\php8',
    'C:\app\appserv\php7',
    'C:\app\appserv\php8',
    'C:\AppServ\php7',
    'C:\AppServ\php8',
    'C:\xampp\php',
    'C:\wamp64\bin\php\php8.2.0',
    'C:\wamp\bin\php\php8.2.0'
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Google OAuth 本機環境設定腳本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1. 偵測 PHP 目錄 ────────────────────────────────────────────────────
Write-Host "[1/3] 偵測 PHP 安裝目錄..." -ForegroundColor Yellow

$phpDir = $null
foreach ($candidate in $phpDirCandidates) {
    if (Test-Path $candidate) {
        $phpDir = $candidate
        break
    }
}

# 若自動偵測失敗，詢問使用者
if ($null -eq $phpDir) {
    Write-Host "  ⚠ 無法自動偵測 PHP 目錄" -ForegroundColor Yellow
    Write-Host "  請輸入 PHP 安裝目錄（例如 D:\app\appserv\php7）："
    $phpDir = Read-Host "  PHP 目錄"
    if (-not (Test-Path $phpDir)) {
        Write-Host "✗ 路徑不存在：$phpDir" -ForegroundColor Red
        exit 1
    }
}

Write-Host "  ✓ PHP 目錄：$phpDir" -ForegroundColor Green

$certPath = Join-Path $phpDir 'cacert.pem'

# ── Step 2. 下載 cacert.pem ───────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/3] 設定 SSL 憑證（cacert.pem）..." -ForegroundColor Yellow

if (Test-Path $certPath) {
    Write-Host "  ✓ cacert.pem 已存在，略過下載" -ForegroundColor Green
} else {
    Write-Host "  正在從 curl.se 下載 cacert.pem..."
    try {
        $certUrl = 'https://curl.se/ca/cacert.pem'
        # 使用 .NET WebClient 避免 PowerShell 5 的 TLS 問題
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($certUrl, $certPath)
        Write-Host "  ✓ 已下載至：$certPath" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ 下載失敗：$($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  請手動下載 https://curl.se/ca/cacert.pem 並存至：$certPath" -ForegroundColor Yellow
        $certPath = $null  # 不寫入 config
    }
}

# 正規化路徑（Windows 反斜線 → 正斜線，PHP 讀取更相容）
if ($certPath) {
    $certPathForPhp = $certPath -replace '\\', '/'
}

# ── Step 3. 建立 / 更新 config.local.php ────────────────────────────────────
Write-Host ""
Write-Host "[3/3] 建立 backend/config.local.php..." -ForegroundColor Yellow

$configPath = Join-Path $PSScriptRoot '..\backend\config.local.php'
$configPath = [System.IO.Path]::GetFullPath($configPath)

# 讀取現有內容（若已存在）
$existingContent = ''
if (Test-Path $configPath) {
    $existingContent = Get-Content $configPath -Raw -Encoding UTF8
    Write-Host "  已存在，進行更新..." -ForegroundColor Cyan
}

# 判斷是否為 AppServ 或 XAMPP，設定 DB_PASSWORD 預設值
$dbPasswordLine = "define('DB_PASSWORD', '12345678');  // AppServ 預設"
if ($phpDir -match 'xampp') {
    $dbPasswordLine = "define('DB_PASSWORD', '');          // XAMPP 預設（空字串）"
}

# 如果已有 config.local.php，只補上缺少的 OAuth 設定
if ($existingContent -ne '') {
    $needsClientId = $existingContent -notmatch 'GOOGLE_CLIENT_ID'
    $needsCaBundle = ($null -ne $certPath) -and ($existingContent -notmatch 'GOOGLE_CA_BUNDLE')

    if (-not $needsClientId -and -not $needsCaBundle) {
        Write-Host "  ✓ config.local.php 已包含 OAuth 設定，無需更新" -ForegroundColor Green
    } else {
        $appendLines = "`n"
        if ($needsClientId) {
            $appendLines += "`ndefine('GOOGLE_CLIENT_ID', '$GOOGLE_CLIENT_ID');"
        }
        if ($needsCaBundle) {
            $appendLines += "`ndefine('GOOGLE_CA_BUNDLE', '$certPathForPhp');"
        }
        Add-Content -Path $configPath -Value $appendLines -Encoding UTF8
        Write-Host "  ✓ 已補上 OAuth 設定至現有 config.local.php" -ForegroundColor Green
    }
} else {
    # 全新建立
    $certLine = if ($certPath) { "define('GOOGLE_CA_BUNDLE', '$certPathForPhp');" } else { "// define('GOOGLE_CA_BUNDLE', 'path/to/cacert.pem');  // 請手動下載 cacert.pem" }

    $content = @"
<?php
// 本機環境設定（不進 git，各電腦自行維護）
// 由 scripts/setup-google-oauth.ps1 自動生成

// ── 資料庫密碼 ──────────────────────────────────────────────────────────────
$dbPasswordLine
// define('DB_PASSWORD', '');          // XAMPP 預設（空字串）

// ── Google OAuth ─────────────────────────────────────────────────────────────
// 團隊共用同一組 Client ID；已授權的 JavaScript 來源：
//   http://localhost, http://localhost:8000, http://localhost:8080, http://127.0.0.1
define('GOOGLE_CLIENT_ID', '$GOOGLE_CLIENT_ID');
$certLine
"@
    Set-Content -Path $configPath -Value $content -Encoding UTF8
    Write-Host "  ✓ 已建立：$configPath" -ForegroundColor Green
}

# ── 完成 ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  設定完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  接下來請確認 Google Cloud Console 已加入你的本機網址：" -ForegroundColor Cyan
Write-Host "  https://console.cloud.google.com/ → APIs & Services → Credentials"
Write-Host "  → OAuth 2.0 Client IDs → 已授權的 JavaScript 來源："
Write-Host "    http://localhost"
Write-Host "    http://localhost:8000"
Write-Host "    http://localhost:8080"
Write-Host "    http://127.0.0.1"
Write-Host ""
Write-Host "  若你的本機 URL 不在以上清單，請通知 repo 維護者新增。" -ForegroundColor Yellow
Write-Host ""
