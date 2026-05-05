#!/bin/sh
set -e
: "${PORT:=8080}"
: "${DATA_DIR:=/data}"
mkdir -p "$DATA_DIR"
chown -R pocketbase:pocketbase "$DATA_DIR"

echo "=== entrypoint debug ==="
echo "PWD: $(pwd)"
echo "Contents of /app:"
ls -la /app || echo "  (no /app)"
echo "Contents of /app/pb_hooks:"
ls -la /app/pb_hooks || echo "  (no /app/pb_hooks)"
echo "Contents of /app/pb_migrations (count only):"
ls /app/pb_migrations 2>/dev/null | wc -l
echo "PocketBase version:"
/usr/local/bin/pocketbase --version
echo "========================"

exec su-exec pocketbase /usr/local/bin/pocketbase serve --http=0.0.0.0:${PORT} --dir="${DATA_DIR}" --hooksDir=/app/pb_hooks --migrationsDir=/app/pb_migrations
