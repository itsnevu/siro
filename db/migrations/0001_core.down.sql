-- Rollback of 0001_core. Only for tested rollback on copies; production is forward-only.
DROP TABLE IF EXISTS archive_roots, agent_snapshots, agent_events, audit_recon, pnl_daily, anchors,
  llm_calls, risk_vetoes, positions, fills, reveals, decisions, agent_versions, agents CASCADE;
DROP FUNCTION IF EXISTS decisions_ensure_month(date);
DROP FUNCTION IF EXISTS reject_mutation();
REVOKE ALL ON SCHEMA public FROM siro_app;
DROP ROLE IF EXISTS siro_app;
