# setup-google-oauth.ps1
# Automatically complete Google OAuth local environment setup:
#   1. Detect PHP installation location
#   2. Download cacert.pem (fixes AppServ/XAMPP Windows SSL curl error 60)
#   3. Create or update backend/config.local.php
#
# Run with:
#   powershell -ExecutionPolicy Bypass -File scripts/setup-google-oauth.ps1

$ErrorActionPreference = 'Stop'

# ── Google OAuth Client ID (team-wide, not sensitive) ───────────────────────────────
# Client ID is already public in frontend HTML, so everyone uses the same one.
# To change it, just modify this line.
$GOOGLE_CLIENT_ID = '718377517460-kotdm5ch47ib6ije5o65tidkvukshmsb.apps.googleusercontent.com'

# ── Common AppServ / XAMPP PHP directories ────────────────────────────────────────────
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
Write-Host "  Google OAuth Local Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1. Detect PHP directory ────────────────────────────────────────────────────────
Write-Host "[1/3] Detecting PHP installation directory..." -ForegroundColor Yellow

$phpDir = $null
foreach ($candidate in $phpDirCandidates) {
    if (Test-Path $candidate) {
        $phpDir = $candidate
        break
    }
}

# If auto-detection fails, ask user
if ($null -eq $phpDir) {
    Write-Host "  WARNING: Could not auto-detect PHP directory" -ForegroundColor Yellow
    Write-Host "  Please enter PHP installation directory (e.g., D:\app\appserv\php7):"
    $phpDir = Read-Host "  PHP directory"
    if (-not (Test-Path $phpDir)) {
        Write-Host "ERROR: Path does not exist: $phpDir" -ForegroundColor Red
        exit 1
    }
}

Write-Host "  OK: PHP directory: $phpDir" -ForegroundColor Green

$certPath = Join-Path $phpDir 'cacert.pem'

# ── Step 2. Download cacert.pem ───────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/3] Setting up SSL certificate (cacert.pem)..." -ForegroundColor Yellow

if (Test-Path $certPath) {
    Write-Host "  OK: cacert.pem already exists, skipping download" -ForegroundColor Green
} else {
    Write-Host "  Downloading cacert.pem from curl.se..."
    try {
        $certUrl = 'https://curl.se/ca/cacert.pem'
        # Use .NET WebClient to avoid PowerShell 5 TLS issues
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($certUrl, $certPath)
        Write-Host "  OK: Downloaded to: $certPath" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR: Download failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  Please manually download https://curl.se/ca/cacert.pem and save to: $certPath" -ForegroundColor Yellow
        $certPath = $null  # Don't write to config
    }
}

# Normalize path (Windows backslash to forward slash for PHP compatibility)
if ($certPath) {
    $certPathForPhp = $certPath -replace '\\', '/'
}

# ── Step 3. Create / update config.local.php ────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/3] Creating backend/config.local.php..." -ForegroundColor Yellow

$configPath = Join-Path $PSScriptRoot '..\backend\config.local.php'
$configPath = [System.IO.Path]::GetFullPath($configPath)

# Read existing content if it exists
$existingContent = ''
if (Test-Path $configPath) {
    $existingContent = Get-Content $configPath -Raw -Encoding UTF8
    Write-Host "  File exists, updating..." -ForegroundColor Cyan
}

# Determine DB_PASSWORD default based on AppServ or XAMPP
$dbPasswordLine = "define('DB_PASSWORD', '12345678');  // AppServ default"
if ($phpDir -match 'xampp') {
    $dbPasswordLine = "define('DB_PASSWORD', '');          // XAMPP default (empty string)"
}

# If config.local.php exists, only add missing OAuth settings
if ($existingContent -ne '') {
    $needsClientId = $existingContent -notmatch 'GOOGLE_CLIENT_ID'
    $needsCaBundle = ($null -ne $certPath) -and ($existingContent -notmatch 'GOOGLE_CA_BUNDLE')

    if (-not $needsClientId -and -not $needsCaBundle) {
        Write-Host "  OK: config.local.php already contains OAuth settings, no update needed" -ForegroundColor Green
    } else {
        $appendLines = "`n"
        if ($needsClientId) {
            $appendLines += "`ndefine('GOOGLE_CLIENT_ID', '$GOOGLE_CLIENT_ID');"
        }
        if ($needsCaBundle) {
            $appendLines += "`ndefine('GOOGLE_CA_BUNDLE', '$certPathForPhp');"
        }
        Add-Content -Path $configPath -Value $appendLines -Encoding UTF8
        Write-Host "  OK: Added OAuth settings to existing config.local.php" -ForegroundColor Green
    }
} else {
    # Create new file
    $certLine = if ($certPath) { "define('GOOGLE_CA_BUNDLE', '$certPathForPhp');" } else { "// define('GOOGLE_CA_BUNDLE', 'path/to/cacert.pem');  // Please manually download cacert.pem" }

    $content = @"
<?php
// Local environment configuration (not in git, maintain per machine)
// Auto-generated by scripts/setup-google-oauth.ps1

// ── Database password ──────────────────────────────────────────────────────────────
$dbPasswordLine
// define('DB_PASSWORD', '');          // XAMPP default (empty string)

// ── Google OAuth ─────────────────────────────────────────────────────────────────────
// Team shares one Client ID; authorized JavaScript origins:
//   http://localhost, http://localhost:8000, http://localhost:8080, http://127.0.0.1
define('GOOGLE_CLIENT_ID', '$GOOGLE_CLIENT_ID');
$certLine
"@
    Set-Content -Path $configPath -Value $content -Encoding UTF8
    Write-Host "  OK: Created: $configPath" -ForegroundColor Green
}

# ── Complete ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Verify Google Cloud Console has your local URLs:" -ForegroundColor Cyan
Write-Host "https://console.cloud.google.com/ -> APIs & Services -> Credentials"
Write-Host "-> OAuth 2.0 Client IDs -> Authorized JavaScript origins:"
Write-Host "  http://localhost"
Write-Host "  http://localhost:8000"
Write-Host "  http://localhost:8080"
Write-Host "  http://127.0.0.1"
Write-Host ""
Write-Host "If your local URL is not in the list, please notify the repo maintainer." -ForegroundColor Yellow
Write-Host ""
