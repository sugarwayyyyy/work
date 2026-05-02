# Git Auto Commit/Push/Tag Script

這份文件說明如何使用專案內建腳本：

- `scripts/git-push-all.ps1`（Windows PowerShell 優先）
- `scripts/git-push-all.sh`（可選 Bash 版本）

## 功能

腳本會依序執行以下流程：

1. 檢查是否有安裝 `git`
2. 檢查目前是否在 Git repository
3. 取得目前分支名稱（detached HEAD 會停止）
4. 檢查是否存在 `origin` 遠端
5. 顯示 `git status`
6. 執行 `git add -A`
7. 若有 staged 變更則 `git commit -m "<message>"`
8. 推送目前分支到 `origin/<current-branch>`
9. 若有提供 `Tag`，建立 annotated tag 並推送 tag
10. 顯示完成摘要

## PowerShell 用法（建議）

只提交並推送：

```powershell
./scripts/git-push-all.ps1 -Message "update frontend layout"
```

提交、推送並標 tag：

```powershell
./scripts/git-push-all.ps1 -Message "release version 1.1" -Tag "v1.1"
```

沒有自訂訊息時（使用預設 commit message）：

```powershell
./scripts/git-push-all.ps1
```

沒有新變更時，仍要推送既有 commits：

```powershell
./scripts/git-push-all.ps1 -PushIfNoChanges
```

## Bash 用法（可選）

```bash
./scripts/git-push-all.sh -m "update frontend layout"
./scripts/git-push-all.sh -m "release version 1.1" -t "v1.1"
./scripts/git-push-all.sh
./scripts/git-push-all.sh --push-if-no-changes
```

## Tag 安全規則

若有提供 `Tag`，腳本會：

- 檢查本機是否存在同名 tag
- 檢查遠端 `origin` 是否存在同名 tag
- 僅在兩邊都不存在時，建立 annotated tag：
  - `git tag -a <tag> -m "Release <tag>"`
- 推送該 tag：`git push origin <tag>`

若 tag 已存在，腳本會停止並提示，不會覆蓋。

## 安全限制

腳本沒有包含以下危險操作：

- `git push --force`
- `git reset --hard`
- `git clean -fd`
- `git tag -d`
- `git push --delete`

也不會自動切分支、合併分支或改寫歷史。
