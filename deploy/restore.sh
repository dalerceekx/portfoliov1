#!/usr/bin/env bash
# Restores a backup produced by backup.sh.
#
#   ./deploy/restore.sh /var/backups/portfolio/db-20260903T030000Z.sql.gz \
#                       /var/backups/portfolio/uploads-20260903T030000Z.tar.gz
#
# The database restore is destructive: it drops the existing schema first. Stop
# the API before running it so nothing writes mid-restore.
set -euo pipefail

db_dump="${1:?usage: restore.sh <db-dump.sql.gz> [uploads.tar.gz]}"
uploads_tar="${2:-}"

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$PROJECT_DIR"

set -a
# shellcheck disable=SC1091
source ./.env
set +a

echo "Stopping the API so nothing writes during the restore…"
docker compose stop api

if [ -n "${DATABASE_URL:-}" ]; then
  gunzip -c "$db_dump" | docker run --rm -i --network host postgres:16-alpine \
    psql --quiet --set ON_ERROR_STOP=1 "$DATABASE_URL"
else
  docker compose up -d db
  docker compose exec -T db psql -U "${POSTGRES_USER:-portfolio}" -d "${POSTGRES_DB:-portfolio}" \
    -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
  gunzip -c "$db_dump" | docker compose exec -T db \
    psql --quiet --set ON_ERROR_STOP=1 -U "${POSTGRES_USER:-portfolio}" -d "${POSTGRES_DB:-portfolio}"
fi

if [ -n "$uploads_tar" ]; then
  echo "Restoring uploads…"
  docker run --rm \
    -v portfolio_uploads:/data \
    -v "$(cd "$(dirname "$uploads_tar")" && pwd)":/backup:ro \
    alpine:3 sh -c "rm -rf /data/* && tar xzf /backup/$(basename "$uploads_tar") -C /data"
fi

docker compose up -d
echo "Restore complete."
