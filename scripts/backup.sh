#!/usr/bin/env bash
# Daily encrypted backup: Postgres (pg_dump -Fc), the app SQLite store, and engine data
# (journals, ops, agents, scheduler registry). AES-256 via gpg symmetric with a passphrase file.
# Retention: SIRO_BACKUP_KEEP_DAYS (default 14). One run at a time (flock). JSON log lines.
# Env: DATABASE_URL, SIRO_BACKUP_DIR, SIRO_BACKUP_PASSFILE, SIRO_APP_DATA, SIRO_ENGINE_DATA
set -euo pipefail
dir="${SIRO_BACKUP_DIR:?}"; pass="${SIRO_BACKUP_PASSFILE:?}"; keep="${SIRO_BACKUP_KEEP_DAYS:-14}"
app_data="${SIRO_APP_DATA:?}"; engine_data="${SIRO_ENGINE_DATA:?}"
log() { printf '{"ts":"%s","scope":"backup","event":"%s"%s}\n' "$(date -u +%FT%TZ)" "$1" "${2:+,$2}"; }
mkdir -p "$dir"
exec 9>"$dir/.backup.lock"
flock -n 9 || { log skipped '"reason":"locked"'; exit 0; }

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
log start "\"stamp\":\"$stamp\""
pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" --file="$work/postgres.dump"
# Consistent SQLite copy even while the app writes (online backup API via the sqlite module).
node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(process.argv[1]);db.exec(\"VACUUM INTO '\"+process.argv[2]+\"'\");db.close()" "$app_data/siro.sqlite" "$work/siro.sqlite" 2>/dev/null
tar -C "$engine_data" -cf "$work/engine.tar" --exclude='market/*/raw' --exclude='*.lock' journals ops agents risk scheduler-registry.json 2>/dev/null || tar -C "$engine_data" -cf "$work/engine.tar" --exclude='market/*/raw' journals
( cd "$work" && sha256sum postgres.dump siro.sqlite engine.tar > SHA256SUMS )
tar -C "$work" -cf - postgres.dump siro.sqlite engine.tar SHA256SUMS \
  | gpg --batch --yes --quiet --symmetric --cipher-algo AES256 --passphrase-file "$pass" -o "$dir/siro-$stamp.tar.gpg"
chmod 600 "$dir/siro-$stamp.tar.gpg"
size=$(stat -c %s "$dir/siro-$stamp.tar.gpg")
find "$dir" -maxdepth 1 -name 'siro-*.tar.gpg' -mtime +"$keep" -print -delete | sed 's/^/pruned /' >&2 || true
log done "\"file\":\"siro-$stamp.tar.gpg\",\"bytes\":$size,\"keep_days\":$keep"
