#!/usr/bin/env bash
# Hourly market refresh for an agent: re-runs the real-data backfill through the last closed hour
# (raw responses are cached, so only new hours are fetched), rebuilds the parquet tickstore
# atomically, then writes coverage.json. One run at a time (flock); the backfill is retried with
# exponential backoff; every line of output is JSON.
# Usage: refresh-market.sh DATA_DIR ASSETS FROM_ISO
set -euo pipefail
data="$1"; assets="$2"; from="$3"
cd "$(dirname "$0")/.."
log() { printf '{"ts":"%s","scope":"market.refresh","data":"%s","event":"%s"%s}\n' "$(date -u +%FT%TZ)" "$data" "$1" "${2:+,$2}"; }

exec 9>"$data/.refresh.lock"
if ! flock -n 9; then log skipped '"reason":"another refresh holds the lock"'; exit 0; fi

through="$(date -u -d '1 hour ago' +%Y-%m-%dT%H:00:00Z)"
log start "\"through\":\"$through\""
attempt=1; delay=30
until node services/ingest/backfill.mjs --assets "$assets" --from "$from" --through "$through" --out "$data" >>"$data/backfill.log" 2>&1; do
  if [ "$attempt" -ge 4 ]; then log failed "\"attempts\":$attempt"; exit 1; fi
  log retry "\"attempt\":$attempt,\"sleep_s\":$delay"
  sleep "$delay"; attempt=$((attempt + 1)); delay=$((delay * 2))
done

tmp="$data/bars.parquet.tmp-$$"
rm -f "$tmp"
target/release/replay ingest "$data/bars.jsonl" "$tmp" >/dev/null
mv -f "$tmp" "$data/bars.parquet"
node scripts/coverage-report.mjs --data "$data" --out "$data/coverage.json" >/dev/null
log done "\"through\":\"$through\",\"attempts\":$attempt"
