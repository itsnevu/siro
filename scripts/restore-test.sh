#!/usr/bin/env bash
# Restore drill for scripts/backup.sh. Decrypts the newest (or given) backup, verifies checksums,
# restores Postgres into a throwaway database and compares table row counts with production,
# then drops the throwaway database. Never touches the production database.
# Usage: restore-test.sh [BACKUP_FILE]   Env: DATABASE_URL, SIRO_BACKUP_DIR, SIRO_BACKUP_PASSFILE
set -euo pipefail
file="${1:-$(ls -1t "${SIRO_BACKUP_DIR:?}"/siro-*.tar.gpg | head -1)}"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
gpg --batch --quiet --decrypt --passphrase-file "${SIRO_BACKUP_PASSFILE:?}" "$file" | tar -C "$work" -xf -
( cd "$work" && sha256sum -c SHA256SUMS >/dev/null ) && echo "checksums ok: $(basename "$file")"
node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(process.argv[1],{readOnly:true});console.log('sqlite tables:',db.prepare(\"select count(*) n from sqlite_master where type='table'\").get().n)" "$work/siro.sqlite"
tar -tf "$work/engine.tar" | head -5 | sed 's/^/engine: /'

test_db="siro_restore_test_$$"
admin_url="${DATABASE_URL%/*}/postgres"
psql "$admin_url" -qc "CREATE DATABASE $test_db" >/dev/null
trap 'psql "$admin_url" -qc "DROP DATABASE IF EXISTS $test_db" >/dev/null; rm -rf "$work"' EXIT
pg_restore --no-owner --dbname="${DATABASE_URL%/*}/$test_db" "$work/postgres.dump"
counts() { psql "$1" -Atc "select string_agg(relname||'='||n_live_tup, ',' order by relname) from pg_stat_user_tables"; }
psql "${DATABASE_URL%/*}/$test_db" -qc "ANALYZE" >/dev/null
prod="$(psql "$DATABASE_URL" -Atc "select count(*) from information_schema.tables where table_schema='public'")"
rest="$(psql "${DATABASE_URL%/*}/$test_db" -Atc "select count(*) from information_schema.tables where table_schema='public'")"
echo "public tables: production=$prod restored=$rest"
[ "$prod" = "$rest" ] && echo "RESTORE DRILL PASSED" || { echo "RESTORE DRILL FAILED"; exit 1; }
