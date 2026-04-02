# 文件首頁索引

本頁是專案文件的正式入口，將操作、狀態、測試與驗收資料統一收斂在同一個索引中。

## 目錄
- [導覽說明](#導覽說明)
- [核心文件](#核心文件)
- [測試與驗收](#測試與驗收)
- [資料與部署](#資料與部署)
- [維護原則](#維護原則)

## 導覽說明

建議先從 README 或本頁開始，再依用途進入對應文件。

## 核心文件

| 文件 | 用途 |
|---|---|
| [README.md](README.md) | 專案總入口與架構總覽 |
| [QUICKSTART.md](QUICKSTART.md) | 最短啟動流程與環境設定 |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | 目前進度與後續工作重點 |
| [COMPLETION_REPORT.md](COMPLETION_REPORT.md) | 完成內容與交付摘要 |

## 測試與驗收

| 文件 | 用途 |
|---|---|
| [TESTING_REPORT.md](TESTING_REPORT.md) | 已知問題、測試結果與狀態 |
| [TESTING_TEAM.md](TESTING_TEAM.md) | 測試分工、時程與聯絡方式 |
| [TESTERS_ASSIGNMENT.md](TESTERS_ASSIGNMENT.md) | 各端測試人力與範圍 |
| [tests/manual/user_story_acceptance_checklist.md](tests/manual/user_story_acceptance_checklist.md) | 手動驗收逐項清單 |
| [tests/api/acceptance_user_stories.ps1](tests/api/acceptance_user_stories.ps1) | 自動化驗收腳本 |

## 資料與部署

| 文件或目錄 | 用途 |
|---|---|
| [database/schema.sql](database/schema.sql) | 基礎資料表結構 |
| [database/migrations/](database/migrations/) | 功能遷移與欄位補強 |
| [database/seeds/](database/seeds/) | 測試與初始化資料 |
| [backend/config.php](backend/config.php) | 環境與連線設定 |

## 維護原則

1. README 保持簡短，作為入口與專案摘要。
2. 新增文件時，同步更新本頁索引。
3. 測試與部署步驟若有異動，先改本頁與 QUICKSTART，再補其他文件。