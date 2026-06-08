#!/bin/sh
set -eu

# initdb.d 內的 script 由 MySQL entrypoint 呼叫，此時 server 以 socket 模式監聽
# 不指定 -h，走 /var/run/mysqld/mysqld.sock；指定 -h127.0.0.1 會因 TCP 尚未就緒而失敗
MYSQL_CMD="mysql --default-character-set=utf8mb4 -uroot -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE}"

tmp_sql="$(mktemp)"
trap 'rm -f "$tmp_sql"' EXIT

# schema.sql
echo "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;" > "$tmp_sql"
cat /docker-init/database/schema.sql >> "$tmp_sql"
$MYSQL_CMD < "$tmp_sql"

# 每個 migration 獨立執行，避免合併後 PREPARE/EXECUTE 因前一段錯誤而失效
find /docker-init/database/migrations -maxdepth 1 -type f -name '*.sql' | sort | while read -r file; do
    echo "  → $(basename "$file")"
    echo "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;" > "$tmp_sql"
    cat "$file" >> "$tmp_sql"
    $MYSQL_CMD --force < "$tmp_sql" || echo "  [warn] $(basename "$file") had errors (may be safe to ignore)"
done
