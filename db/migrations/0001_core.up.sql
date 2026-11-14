-- Phase 12 core schema. Forward-only in production; 0001_core.down.sql exists for tested rollback.
-- Every record carries trace_id (phase 14). Times are timestamptz in UTC.

CREATE ROLE siro_app NOLOGIN;

CREATE TABLE agents (
  agent_id        text PRIMARY KEY,
  owner_address   text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','decay_warning','halted','degraded')),
  status_reason   text,
  hand_picked     boolean NOT NULL DEFAULT false
);

CREATE TABLE agent_versions (
  agent_id         text NOT NULL REFERENCES agents(agent_id),
  version          integer NOT NULL CHECK (version > 0),
  parent_version   integer,
  strategy_hash    text NOT NULL CHECK (strategy_hash ~ '^[0-9a-f]{64}$'),
  universe_version text,
  config           jsonb NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, version)
);

-- Decisions: append-only, partitioned monthly by tick_ts. Retention 3 years, then Parquet archive
-- with its Merkle root kept in archive_roots.
CREATE TABLE decisions (
  decision_id   uuid NOT NULL,
  tick_ts       timestamptz NOT NULL,
  tick_id       text NOT NULL,          -- sha256(agent_id || tick_ts || strategy_hash), idempotency key (ADR 0006)
  agent_id      text NOT NULL,
  agent_version integer NOT NULL,
  commit_ts     timestamptz NOT NULL,
  reveal_ts     timestamptz NOT NULL,
  prev_hash     text NOT NULL,
  commit_hash   text NOT NULL CHECK (commit_hash ~ '^[0-9a-f]{64}$'),
  record        jsonb NOT NULL,
  trace_id      text NOT NULL,
  PRIMARY KEY (decision_id, tick_ts),
  UNIQUE (tick_id, tick_ts),
  CHECK (commit_ts <= reveal_ts)
) PARTITION BY RANGE (tick_ts);

CREATE TABLE reveals (
  decision_id uuid NOT NULL,
  tick_ts     timestamptz NOT NULL,
  revealed_at timestamptz NOT NULL,
  trace_id    text NOT NULL,
  PRIMARY KEY (decision_id, tick_ts)
);

CREATE TABLE fills (
  fill_id      text PRIMARY KEY,
  decision_id  uuid NOT NULL,
  asset        text NOT NULL,
  ts           timestamptz NOT NULL,
  quantity     numeric NOT NULL CHECK (quantity <> 0),
  price        numeric NOT NULL CHECK (price > 0),
  fees_usd     numeric NOT NULL CHECK (fees_usd >= 0),
  external_fees_usd numeric NOT NULL DEFAULT 0 CHECK (external_fees_usd >= 0),
  slippage_usd numeric NOT NULL CHECK (slippage_usd >= 0),
  tx_hash      text,
  trace_id     text NOT NULL
);

CREATE TABLE positions (
  agent_id   text NOT NULL REFERENCES agents(agent_id),
  asset      text NOT NULL,
  units      numeric NOT NULL,
  cost_basis numeric NOT NULL,
  as_of      timestamptz NOT NULL,
  PRIMARY KEY (agent_id, asset, as_of)
);

CREATE TABLE risk_vetoes (
  id          bigserial PRIMARY KEY,
  decision_id uuid NOT NULL,
  code        text NOT NULL,
  observed    double precision NOT NULL,
  limit_value double precision NOT NULL,
  at          timestamptz NOT NULL,
  trace_id    text NOT NULL
);

CREATE TABLE llm_calls (
  id            bigserial PRIMARY KEY,
  decision_id   uuid,
  provider      text NOT NULL,
  model         text NOT NULL,
  latency_ms    integer NOT NULL,
  outcome       text NOT NULL CHECK (outcome IN ('ok','timeout','error','fallback','sanitized')),
  token_cost_usd numeric,
  violations    jsonb NOT NULL DEFAULT '[]',
  at            timestamptz NOT NULL,
  trace_id      text NOT NULL
);

CREATE TABLE anchors (
  kind        text NOT NULL CHECK (kind IN ('daily','witness')),
  root        text NOT NULL CHECK (root ~ '^[0-9a-f]{64}$'),
  day         integer,
  leaves      jsonb,
  chain_id    integer NOT NULL,
  tx_hash     text NOT NULL,
  block_number bigint NOT NULL,
  block_ts    timestamptz NOT NULL,
  confirmations integer NOT NULL CHECK (confirmations >= 2),
  PRIMARY KEY (kind, root)
);

CREATE TABLE pnl_daily (
  agent_id     text NOT NULL REFERENCES agents(agent_id),
  day          date NOT NULL,
  gross_equity numeric NOT NULL,
  net_equity   numeric NOT NULL,
  net_return   double precision NOT NULL,
  status       text NOT NULL DEFAULT 'unreconciled' CHECK (status IN ('unreconciled','reconciled','reconciled_offchain_only')),
  trace_id     text NOT NULL,
  PRIMARY KEY (agent_id, day)
);

CREATE TABLE audit_recon (
  id        bigserial PRIMARY KEY,
  at        timestamptz NOT NULL DEFAULT now(),
  who       text NOT NULL,
  agent_id  text NOT NULL,
  field     text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  reason    text NOT NULL
);

-- Event store: the source of truth for agent state. Snapshots are a disposable cache.
CREATE TABLE agent_events (
  agent_id   text NOT NULL,
  seq        bigint NOT NULL CHECK (seq >= 0),
  kind       text NOT NULL,
  payload    jsonb NOT NULL,
  prev_hash  text NOT NULL,
  event_hash text NOT NULL,
  at         timestamptz NOT NULL,
  trace_id   text NOT NULL,
  PRIMARY KEY (agent_id, seq)
);
CREATE TABLE agent_snapshots (
  agent_id text PRIMARY KEY,
  seq      bigint NOT NULL,
  state    jsonb NOT NULL,
  built_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE archive_roots (
  partition   text PRIMARY KEY,
  from_ts     timestamptz NOT NULL,
  to_ts       timestamptz NOT NULL,
  rows        bigint NOT NULL,
  merkle_root text NOT NULL CHECK (merkle_root ~ '^[0-9a-f]{64}$'),
  parquet_uri text NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

-- Monthly partitions on demand. No DEFAULT partition: a tick outside any month fails loudly.
CREATE FUNCTION decisions_ensure_month(month_start date) RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  name text := format('decisions_%s', to_char(month_start, 'YYYY_MM'));
BEGIN
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF decisions FOR VALUES FROM (%L) TO (%L)',
                 name, month_start, (month_start + interval '1 month')::date);
  RETURN name;
END $$;
SELECT decisions_ensure_month(date_trunc('month', now())::date - interval '1 month');
SELECT decisions_ensure_month(date_trunc('month', now())::date);
SELECT decisions_ensure_month((date_trunc('month', now()) + interval '1 month')::date);

-- Append-only, twice: privileges for the application role, and a trigger that also stops the owner.
CREATE FUNCTION reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % rejected', TG_TABLE_NAME, TG_OP USING ERRCODE = 'insufficient_privilege';
END $$;
CREATE TRIGGER decisions_append_only BEFORE UPDATE OR DELETE ON decisions FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER reveals_append_only BEFORE UPDATE OR DELETE ON reveals FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER agent_events_append_only BEFORE UPDATE OR DELETE ON agent_events FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER audit_recon_append_only BEFORE UPDATE OR DELETE ON audit_recon FOR EACH ROW EXECUTE FUNCTION reject_mutation();

GRANT USAGE ON SCHEMA public TO siro_app;
GRANT SELECT, INSERT ON decisions, reveals, agent_events, audit_recon, fills, risk_vetoes, llm_calls, anchors TO siro_app;
GRANT SELECT, INSERT, UPDATE ON agents, agent_versions, positions, pnl_daily, agent_snapshots TO siro_app;
GRANT DELETE ON agent_snapshots TO siro_app; -- cache only
REVOKE UPDATE, DELETE, TRUNCATE ON decisions, reveals, agent_events, audit_recon FROM siro_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO siro_app;
