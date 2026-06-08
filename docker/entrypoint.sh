#!/bin/bash
set -e

cd /var/www/html

git config --global --add safe.directory /var/www/html

# 初始化 git（只在第一次）
if [ ! -d ".git" ]; then
    git init
    git remote add origin https://github.com/sugarwayyyyy/work.git
fi

# 從 GitHub main branch 拉最新前端與後端
git fetch origin main --depth=1 2>&1 || echo "[entrypoint] git fetch failed, using existing files"
git checkout origin/main -- frontend/ backend/ 2>&1 || echo "[entrypoint] git checkout failed, using existing files"

# 修正權限
chown -R www-data:www-data /var/www/html/frontend/assets/uploads /var/www/html/logs 2>/dev/null || true

exec apache2-foreground
