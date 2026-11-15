#!/usr/bin/env bash
# Hourly market refresh for a paper/live agent: re-runs the real-data backfill through the last
# closed hour (raw responses are cached, so only new hours are fetched), then rebuilds the parquet
# tickstore atomically. Usage: refresh-market.sh DATA_DIR ASSETS FROM_ISO
set -euo pipefail
data="$1"; assets="$2"; from="$3"
cd "$(dirname "$0")/.."
through="$(date -u -d '1 hour ago' +%Y-%m-%dT%H:00:00Z)"
node services/ingest/backfill.mjs --assets "$assets" --from "$from" --through "$through" --out "$data"
tmp="$data/bars.parquet.tmp-$$"
rm -f "$tmp"
target/release/replay ingest "$data/bars.jsonl" "$tmp"
mv -f "$tmp" "$data/bars.parquet"
echo "market refreshed through $through"
