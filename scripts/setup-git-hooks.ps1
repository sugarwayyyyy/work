# setup-git-hooks.ps1
# 設定 git 使用 .githooks/ 目錄下的 hook 腳本
#
# 執行方式：
#   powershell -ExecutionPolicy Bypass -File scripts/setup-git-hooks.ps1

$ErrorActionPreference = 'Stop'

# 確認目前在 git repo 根目錄
if (-not (Test-Path ".git")) {
    Write-Host "✗ 找不到 .git 目錄，請在專案根目錄執行此腳本" -ForegroundColor Red
    exit 1
}

# 確認 .githooks/ 存在
if (-not (Test-Path ".githooks")) {
    Write-Host "✗ 找不到 .githooks/ 目錄" -ForegroundColor Red
    exit 1
}

# 設定 hooksPath
git config core.hooksPath .githooks
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ git config 設定失敗" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✓ Git hooks 設定完成" -ForegroundColor Green
Write-Host ""
Write-Host "  已啟用的 hooks：" -ForegroundColor Cyan
Write-Host "    pre-commit：偵測 backend/ 修改時，提醒確認是否需要新增 migration" -ForegroundColor Cyan
Write-Host ""
Write-Host "  每位開發者 clone 後需執行一次此腳本。" -ForegroundColor Yellow
Write-Host ""
