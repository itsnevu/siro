// Pure scheduling logic for the validated engine runner. No env, no IO.
export const HOUR = 3_600_000;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Latest closed hourly tick whose data is expected to be ingested `delayMs` after the close. */
export function dueTick(now, delayMs) {
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(delayMs) || delayMs < 0 || delayMs >= HOUR) throw new Error("Invalid scheduler clock input");
  return Math.floor((now - delayMs) / HOUR) * HOUR;
}

/** Operator registry: which runner config serves which vault on which chain. */
export function validateRegistry(input) {
  if (!Array.isArray(input) || input.length > 100) throw new Error("Scheduler registry must be an array of at most 100 jobs");
  const ids = new Set();
  return input.map(j => {
    if (!j || !ID.test(j.id) || ids.has(j.id) || typeof j.name !== "string" || !j.name.trim() || j.name.length > 80
      || !Number.isSafeInteger(j.chain_id) || !ADDRESS.test(j.vault) || /^0x0{40}$/i.test(j.vault) || typeof j.config !== "string" || !j.config
      || (j.env !== undefined && (typeof j.env !== "object" || Array.isArray(j.env) || Object.entries(j.env).some(([k, v]) => !/^SIRO_[A-Z_]+$/.test(k) || /KEY|SECRET/.test(k) || typeof v !== "string"))))
      throw new Error(`Invalid scheduler job ${j?.id ?? "(missing id)"}`);
    if (j.command !== undefined && !["run", "portfolio"].includes(j.command)) throw new Error(`Invalid scheduler job ${j.id}: command must be run or portfolio`);
    ids.add(j.id);
    return { id: j.id, name: j.name.trim(), chain_id: j.chain_id, vault: j.vault.toLowerCase(), config: j.config, env: j.env ?? {}, command: j.command ?? "run" };
  });
}

/**
 * A job runs only while at least one vault owner has an enabled workspace schedule that names
 * it, on the job's chain, for the job's vault. Disabling every such schedule stops new ticks.
 */
export function activations(registry, workspaces) {
  const active = new Map();
  for (const { address, chain, workspace } of workspaces)
    for (const s of workspace.schedules)
      if (s.enabled && s.engineJobId) {
        const job = registry.find(j => j.id === s.engineJobId);
        if (job && job.chain_id === chain && job.vault === s.vault.toLowerCase())
          active.set(job.id, [...(active.get(job.id) ?? []), { address: address.toLowerCase(), schedule: s.id }]);
      }
  return active;
}

/** Statuses that stop scheduling until an operator resets the job. */
export const STOPPED = new Set(["halted", "gate_failed"]);

/** Map a runner exit to a durable status. Unknown failures are errors, never success. */
export function classify(code, stderr) {
  const text = String(stderr ?? "");
  if (code === 0) return { status: "ok", advance: true };
  if (/kill switch|journal halted|live_receipt_uncertain|reconcile|halt/i.test(text)) return { status: "halted", advance: false };
  if (/release gate|walk-forward release evidence missing/i.test(text)) return { status: "gate_failed", advance: false };
  if (/point-in-time .*missing|data missing/i.test(text)) return { status: "waiting_data", advance: false };
  if (/requires recent observed market data/i.test(text)) return { status: "stalled", advance: false };
  return { status: "error", advance: false };
}

/** What the worker should do for one job now. */
export function plan({ state, active, due, now }) {
  if (!active) return { action: "idle", reason: "no enabled schedule activates this job" };
  if (state && STOPPED.has(state.status)) return { action: "stopped", reason: `job is ${state.status}; operator reset required` };
  if (state && state.lease_until > now) return { action: "busy", reason: "another worker holds the lease" };
  if (state && state.last_tick >= due) return { action: "idle", reason: "already ran through the due tick" };
  return { action: "run", through: due };
}

/** Runner config for one scheduled pass: the operator's base config with `through` moved to the due tick. */
export function derivedConfig(base, through) {
  if (!base || !Number.isSafeInteger(base.from) || !Number.isSafeInteger(through) || through < base.from || through % HOUR !== 0) throw new Error("Due tick is before the job start or not hourly");
  if (!["paper", "live"].includes(base.mode)) throw new Error("Scheduled jobs must run in paper or live mode");
  return { ...base, through };
}

/**
 * Re-check, at run time, that some activating account still owns the vault on chain.
 * `owner` is the on-chain owner (lowercase) or null when it could not be read.
 * `walletsOf(account)` lists the account's linked wallets.
 */
export function ownershipVerdict(activators, owner, walletsOf) {
  if (!owner) return { ok: false, status: "degraded", reason: "vault owner could not be read on chain; not running" };
  const authorised = activators.some(a => walletsOf(a.address).includes(owner));
  return authorised
    ? { ok: true }
    : { ok: false, status: "unauthorized", reason: "no activating account owns the vault any more; pause or re-enable from the owner's wallet" };
}
