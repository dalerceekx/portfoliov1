#!/usr/bin/env bash
# Dumps the database and the uploaded images, then copies both to S3.
#
# The bundled Postgres and the uploads volume live on the instance's EBS volume:
# terminate the instance without this and every project, message and image is
# gone. Run it from cron on the host:
#
#   0 3 * * * BACKUP_S3_URI=s3://my-bucket/portfolio /opt/portfolio/deploy/backup.sh >> /var/log/portfolio-backup.log 2>&1
#
# The instance needs an IAM role allowing s3:PutObject on that prefix. Set a
# lifecycle rule on the bucket for how long copies are kept; this script only
# prunes the local ones.
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/portfolio}"
KEEP_LOCAL_DAYS="${KEEP_LOCAL_DAYS:-7}"
BACKUP_S3_URI="${BACKUP_S3_URI:-}"

cd "$PROJECT_DIR"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$BACKUP_DIR"

# .env holds the credentials; read it without letting comments through.
set -a
# shellcheck disable=SC1091
source ./.env
set +a

db_dump="$BACKUP_DIR/db-$stamp.sql.gz"
uploads_tar="$BACKUP_DIR/uploads-$stamp.tar.gz"

if [ -n "${DATABASE_URL:-}" ]; then
  # External Postgres (RDS): dump through a throwaway client container so the
  # host needs no psql install.
  echo "Dumping external database…"
  docker run --rm --network host postgres:16-alpine \
    pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip -9 > "$db_dump"
else
  echo "Dumping bundled database…"
  docker compose exec -T db \
    pg_dump --no-owner --no-privileges -U "${POSTGRES_USER:-portfolio}" "${POSTGRES_DB:-portfolio}" \
    | gzip -9 > "$db_dump"
fi

# The volume is only reachable from inside Docker, so tar it from a container.
echo "Archiving uploads…"
docker run --rm \
  -v portfolio_uploads:/data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine:3 tar czf "/backup/$(basename "$uploads_tar")" -C /data .

# A zero-byte dump means pg_dump failed inside the pipe; never ship that to S3
# as if it were a backup.
for f in "$db_dump" "$uploads_tar"; do
  [ -s "$f" ] || { echo "FAILED: $f is empty" >&2; exit 1; }
done

if [ -n "$BACKUP_S3_URI" ]; then
  echo "Uploading to $BACKUP_S3_URI…"
  aws s3 cp "$db_dump" "$BACKUP_S3_URI/" --only-show-errors
  aws s3 cp "$uploads_tar" "$BACKUP_S3_URI/" --only-show-errors
else
  echo "BACKUP_S3_URI is unset — keeping local copies only." >&2
fi

find "$BACKUP_DIR" -name '*.gz' -mtime "+$KEEP_LOCAL_DAYS" -delete

echo "Backup complete: $(basename "$db_dump"), $(basename "$uploads_tar")"
