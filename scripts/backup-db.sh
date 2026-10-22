#!/usr/bin/env bash
# Nightly production database backup: pg_dump (custom format) from the
# postgres container, kept locally (last BACKUP_KEEP_LOCAL dumps) and uploaded
# to the private <STORAGE_BUCKET_PREFIX>-backup bucket via the provider
# container (services/provider/scripts/backup-db.js, BACKUP_KEEP_DAYS days).
#
# Run from anywhere; paths are relative to the repository root:
#   scripts/backup-db.sh
#
# Restore into a running stack (replaces the current data):
#   docker compose -f compose.prod.yaml --env-file .env.prod exec -T postgres \
#     pg_restore -U dingo -d dingo --clean --if-exists --no-owner < backups/<file>.dump
set -euo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
BACKUP_KEEP_LOCAL="${BACKUP_KEEP_LOCAL:-7}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
compose=(docker compose -f compose.prod.yaml --env-file .env.prod)

mkdir -p "$BACKUP_DIR"
name="$(date -u +%Y-%m-%dT%H-%M-%SZ).dump"
partial="$BACKUP_DIR/.$name.partial"
trap 'rm -f "$partial"' EXIT

"${compose[@]}" exec -T postgres pg_dump -U dingo -d dingo -Fc > "$partial"
# Fails on a truncated or corrupt archive before anything is uploaded.
"${compose[@]}" exec -T postgres pg_restore --list < "$partial" > /dev/null
mv "$partial" "$BACKUP_DIR/$name"
echo "Wrote $BACKUP_DIR/$name ($(stat -c %s "$BACKUP_DIR/$name") bytes)"

"${compose[@]}" exec -T provider node scripts/backup-db.js \
  --name="db/$name" --keep-days="$BACKUP_KEEP_DAYS" < "$BACKUP_DIR/$name"

# Keep the newest BACKUP_KEEP_LOCAL local dumps.
ls -1t "$BACKUP_DIR"/*.dump | tail -n +"$((BACKUP_KEEP_LOCAL + 1))" | xargs -r rm -f
