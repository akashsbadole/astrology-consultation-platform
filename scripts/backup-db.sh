#!/usr/bin/env bash
# Backs up the Postgres database to ./backups/, keeping the last 14 daily
# backups and pruning older ones automatically.
#
# Set up as a daily cron job:
#   crontab -e
#   0 3 * * * /path/to/astrology-auth-starter/scripts/backup-db.sh >> /var/log/astrology-backup.log 2>&1

set -euo pipefail
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

BACKUP_DIR="$REPO_DIR/backups"
KEEP_DAYS=14
TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"

mkdir -p "$BACKUP_DIR"

POSTGRES_USER="$(grep '^POSTGRES_USER=' .env | cut -d= -f2)"
POSTGRES_DB="$(grep '^POSTGRES_DB=' .env | cut -d= -f2)"

echo "==> Backing up $POSTGRES_DB..."
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > "$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"

echo "==> Backup saved: $BACKUP_DIR/backup_${TIMESTAMP}.sql.gz ($(du -h "$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz" | cut -f1))"

echo "==> Pruning backups older than $KEEP_DAYS days"
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$KEEP_DAYS -delete

echo "==> Done. Current backups:"
ls -lh "$BACKUP_DIR"

# To restore a backup:
#   gunzip -c backups/backup_TIMESTAMP.sql.gz | docker compose exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
