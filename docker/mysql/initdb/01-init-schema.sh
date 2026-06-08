#!/bin/sh
set -eu

tmp_sql="$(mktemp)"
trap 'rm -f "$tmp_sql"' EXIT

cat /docker-init/database/schema.sql > "$tmp_sql"

find /docker-init/database/migrations -maxdepth 1 -type f -name '*.sql' | sort | while read -r file; do
    printf '\n\n-- %s\n' "$(basename "$file")" >> "$tmp_sql"
    cat "$file" >> "$tmp_sql"
done

mysql -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DATABASE}" < "$tmp_sql"
