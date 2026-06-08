# Docker Deployment

## Start

```bash
docker compose up --build -d
```

Site URL: `http://localhost:8090`

## Stop

```bash
docker compose down
```

## Reset Database

```bash
docker compose down -v
docker compose up --build -d
```

## Notes

- Web listens on host port `8090`.
- MySQL listens on host port `3307`.
- Uploaded files persist in `frontend/assets/uploads`.
- App logs persist in `logs`.
- Database initialization imports `database/schema.sql` then runs each migration individually.
- Docker then applies a compatible built-in seed with the documented test accounts and core sample clubs/events because the current repo SQL seed files are not Docker-import safe.

## schema.sql 必須保持完整

**Docker 不能靠 migration 補欄位**：migration 普遍使用 `PREPARE/EXECUTE` 的條件語法（`IF EXISTS`），在 MySQL initdb 的 `--force` 模式下**靜默失敗**，欄位不會被建立，API 執行時才會出現 `Unknown column` Fatal Error。

因此 `database/schema.sql` 必須隨時包含**所有 migration 套用後的完整 schema**。

每次新增 migration 後，在本機跑完 migration，再執行：

```bash
mysqldump -uroot -p --no-data --skip-comments --default-character-set=utf8mb4 club_platform > database/schema.sql
```

然後在 `schema.sql` 開頭補上：

```sql
CREATE DATABASE IF NOT EXISTS club_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE club_platform;
```

## 中文亂碼排查

若資料庫內中文顯示亂碼，根本原因是 MySQL volume 以舊的 charset 建立。需要**連 volume 一起刪除**重建，單純 `down` + `up` 不夠：

```bash
docker compose down -v   # -v 刪除 mysql_data volume
docker compose up --build -d
```

以下設定必須同時齊備，缺一就會亂碼：

| 位置 | 設定 |
|------|------|
| `docker-compose.yml` MySQL command | `--character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci` |
| `database/schema.sql` | `CREATE DATABASE … CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci` |
| `docker/mysql/initdb/01-init-schema.sh` | `mysql … --default-character-set=utf8mb4` |
| `docker/apache/000-default.conf` | `AddDefaultCharset UTF-8` |
| 所有 `.sql` seed 檔開頭 | `SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;` |
| `01-init-schema.sh` 合併 SQL 前 | `echo "SET NAMES utf8mb4 …" > "$tmp_sql"` 再 `cat schema.sql >>` |

**關鍵原理**：即使 `character_set_server=utf8mb4`，MySQL 連線預設仍是 `latin1`（`character_set_client / connection / results`）。SQL 檔案若未宣告 `SET NAMES`，中文位元組會被當 latin1 解讀後再轉存，造成亂碼。`SET NAMES utf8mb4` 告知 MySQL「這條連線傳來的是 UTF-8」，才能正確儲存。
