PRAGMA journal_mode=WAL;
PRAGMA synchronous=FULL;
PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS llm_calls (
 id INTEGER PRIMARY KEY, agent TEXT NOT NULL, tick INTEGER NOT NULL,
 started INTEGER NOT NULL, latency_ms INTEGER NOT NULL, attempt INTEGER NOT NULL,
 status TEXT NOT NULL, input_tokens INTEGER, output_tokens INTEGER,
 cost_usd REAL, error TEXT
);
CREATE INDEX IF NOT EXISTS llm_calls_agent_tick ON llm_calls(agent,tick);
PRAGMA user_version=1;
