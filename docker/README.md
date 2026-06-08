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
- Database initialization imports `database/schema.sql` and every file in `database/migrations/*.sql`.
- Docker then applies a compatible built-in seed with the documented test accounts and core sample clubs/events because the current repo SQL seed files are not Docker-import safe.

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
