[CmdletBinding()]
param(
    [string]$Message = "chore: update project files",
    [string]$Tag,
    [switch]$PushIfNoChanges
)

$ErrorActionPreference = "Stop"

function Fail-Step {
    param([string]$MessageText)
    Write-Error $MessageText
    exit 1
}

function Invoke-Git {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )

    $output = & git @Args 2>&1
    if ($LASTEXITCODE -ne 0) {
        $cmd = "git " + ($Args -join " ")
        $detail = if ($output) { [string]::Join([Environment]::NewLine, $output) } else { "<no output>" }
        throw "Command failed: $cmd`n$detail"
    }
    return $output
}

try {
    $effectiveMessage = if ([string]::IsNullOrWhiteSpace($Message)) { "chore: update project files" } else { $Message }

    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Fail-Step "找不到 git，請先安裝 Git 後再執行。"
    }

    $insideWorkTree = (& git rev-parse --is-inside-work-tree 2>$null)
    if ($LASTEXITCODE -ne 0 -or "$insideWorkTree".Trim() -ne "true") {
        Fail-Step "目前目錄不是 Git 專案，請切換到正確專案資料夾。"
    }

    $branch = (& git branch --show-current 2>$null).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($branch)) {
        Fail-Step "無法取得目前分支（可能是 detached HEAD）。請先切到要推送的分支。"
    }

    Write-Host "目前分支: $branch" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "目前 Git 狀態:" -ForegroundColor Cyan
    Invoke-Git -Args @("status")

    $null = & git remote get-url origin 2>$null
    if ($LASTEXITCODE -ne 0) {
        Fail-Step "找不到遠端 origin。請先設定 origin 後再執行。"
    }
    Write-Host ""
    Write-Host "origin 檢查: OK" -ForegroundColor Green

    Write-Host ""
    Write-Host "執行 git add -A ..." -ForegroundColor Cyan
    Invoke-Git -Args @("add", "-A")

    $null = & git diff --cached --quiet
    $hasStagedChanges = ($LASTEXITCODE -ne 0)
    $didCommit = $false

    if ($hasStagedChanges) {
        Write-Host "偵測到變更，建立 commit..." -ForegroundColor Cyan
        Invoke-Git -Args @("commit", "-m", $effectiveMessage)
        $didCommit = $true
    } else {
        Write-Host "沒有新的變更需要提交。" -ForegroundColor Yellow
    }

    $shouldPushBranch = $didCommit -or $PushIfNoChanges.IsPresent -or (-not [string]::IsNullOrWhiteSpace($Tag))
    if ($shouldPushBranch) {
        Write-Host ""
        Write-Host "推送分支到 origin/$branch ..." -ForegroundColor Cyan
        Invoke-Git -Args @("push", "origin", $branch)
    } else {
        Write-Host ""
        Write-Host "未推送分支（若要在無新 commit 時仍推送，請加上 -PushIfNoChanges）。" -ForegroundColor Yellow
    }

    $didTag = $false
    if (-not [string]::IsNullOrWhiteSpace($Tag)) {
        Write-Host ""
        Write-Host "檢查 tag: $Tag" -ForegroundColor Cyan

        $null = & git show-ref --verify --quiet ("refs/tags/" + $Tag)
        if ($LASTEXITCODE -eq 0) {
            Fail-Step "本機已存在同名 tag: $Tag，已停止。"
        }

        $remoteTagCheck = Invoke-Git -Args @("ls-remote", "--tags", "origin", ("refs/tags/" + $Tag))
        if (-not [string]::IsNullOrWhiteSpace(($remoteTagCheck | Out-String).Trim())) {
            Fail-Step "遠端 origin 已存在同名 tag: $Tag，已停止。"
        }

        Write-Host "建立 annotated tag: $Tag" -ForegroundColor Cyan
        Invoke-Git -Args @("tag", "-a", $Tag, "-m", ("Release " + $Tag))

        Write-Host "推送 tag: $Tag" -ForegroundColor Cyan
        Invoke-Git -Args @("push", "origin", $Tag)
        $didTag = $true
    }

    $head = (& git rev-parse --short HEAD 2>$null).Trim()
    if ($LASTEXITCODE -ne 0) { $head = "<unknown>" }

    Write-Host ""
    Write-Host "完成摘要" -ForegroundColor Green
    Write-Host "- 分支: $branch"
    Write-Host "- HEAD: $head"
    Write-Host "- 已建立 commit: $didCommit"
    Write-Host "- 已推送分支: $shouldPushBranch"
    Write-Host "- 已建立並推送 tag: $didTag"
}
catch {
    Fail-Step ("流程失敗: " + $_.Exception.Message)
}
