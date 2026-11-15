#!/usr/bin/env bash
# Restore drill for scripts/backup.sh. Decrypts the newest (or given) backup, verifies checksums,
# restores Postgres into a throwaway database and compares table row counts with production,
# then drops the throwaway database. Never touches the production database.
# Run as root (uses sudo -u postgres). Usage: restore-test.sh [BACKUP_FILE]   Env: DATABASE_URL, SIRO_BACKUP_DIR, SIRO_BACKUP_PASSFILE
set -euo pipefail
file="${1:-$(ls -1t "${SIRO_BACKUP_DIR:?}"/siro-*.tar.gpg | head -1)}"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
gpg --batch --quiet --decrypt --passphrase-file "${SIRO_BACKUP_PASSFILE:?}" "$file" | tar -C "$work" -xf -
( cd "$work" && sha256sum -c SHA256SUMS >/dev/null ) && echo "checksums ok: $(basename "$file")"
node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(process.argv[1],{readOnly:true});console.log('sqlite tables:',db.prepare(\"select count(*) n from sqlite_master where type='table'\").get().n)" "$work/siro.sqlite"
tar -tf "$work/engine.tar" | head -5 | sed 's/^/engine: /'

test_db="siro_restore_test_$$"
# Throwaway DB via the local postgres superuser (peer auth): the app role keeps least privilege.
pga() { sudo -u postgres psql -qAt "$@"; }
pga -c "CREATE DATABASE $test_db" >/dev/null
cleanup() { pga -c "DROP DATABASE IF EXISTS $test_db" >/dev/null; rm -rf "$work"; }
trap cleanup EXIT
chmod 644 "$work/postgres.dump"; chmod 755 "$work"
sudo -u postgres pg_restore --no-owner --no-acl --dbname="$test_db" "$work/postgres.dump"
q="select string_agg(table_name, ',' order by table_name) from information_schema.tables where table_schema='public'"
prod="$(psql "$DATABASE_URL" -Atc "$q")"
rest="$(pga -d "$test_db" -c "$q")"
rows="$(pga -d "$test_db" -c "select count(*) from information_schema.tables where table_schema='public'")"
echo "public tables: production=[$prod] restored=[$rest] ($rows)"
[ "$prod" = "$rest" ] && echo "RESTORE DRILL PASSED" || { echo "RESTORE DRILL FAILED"; exit 1; }
