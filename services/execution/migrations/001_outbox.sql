PRAGMA journal_mode=WAL;
PRAGMA synchronous=FULL;
PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS execution_outbox (
 id TEXT PRIMARY KEY, raw TEXT NOT NULL, hash TEXT NOT NULL,
 order_hash TEXT NOT NULL, notional REAL NOT NULL
);
PRAGMA user_version=1;
