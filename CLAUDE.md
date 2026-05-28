# 社團活動資訊統整平台 — AI 開發規則

## 資料庫 Migration 規則（最重要）

**每次修改 backend/ 下的 PHP 檔案時，必須主動檢查是否需要新增 migration。**

### 何時需要建立 migration？
- 新增資料表（CREATE TABLE）
- 新增或刪除欄位（ALTER TABLE ADD/DROP COLUMN）
- 修改欄位型別或約束條件（ALTER TABLE MODIFY）
- 新增或移除索引、外鍵
- 新增或修改 ENUM 值

### 何時不需要 migration？
- 只修改 PHP 業務邏輯（不改變 schema）
- 修改前端 JS/CSS/HTML
- 修改 seeds、測試檔案

### Migration 命名規則
```
database/migrations/YYYY_MM_DD_描述.sql
```
範例：`database/migrations/2026_05_29_add_user_avatar.sql`

### 完成後必須
1. 確認 `database/schema.sql` 已同步更新（若有 schema 變更）
2. 更新 `QUICKSTART.md` 的 migration 清單（`## 安裝步驟 > 1. 匯入資料庫` 區塊）

---

## Demo 資料部署

Demo 展示資料使用 `php scripts/seed-demo-data.php`，此腳本會：
1. 自動生成 24 張 placeholder 示範圖片（使用 PHP GD）
2. 執行 `database/seeds/demo_enrichment.sql`

**不需要手動複製圖片**。

---

## 專案結構重點

- `backend/api/` — PHP API endpoints
- `database/migrations/` — 資料庫 schema 異動歷程
- `database/seeds/` — 基礎資料與 demo 資料
- `database/schema.sql` — 完整 schema（需與 migrations 保持同步）
- `frontend/assets/uploads/` — 上傳圖片（不進 git）
- `scripts/` — 開發工具腳本

## Git Hooks 設定

新成員 clone 後請執行：
```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-git-hooks.ps1
```

此 hook 會在 commit 時提醒確認 migration 是否需要更新。
