export type Policy = { maxTradeBps: number; maxAllocationBps: number; maxDailyLossBps: number; maxSlippageBps: number; cooldown: number; maxOracleDelay: number };
export const DEFAULT_POLICY: Policy = { maxTradeBps: 1000, maxAllocationBps: 2500, maxDailyLossBps: 500, maxSlippageBps: 100, cooldown: 3600, maxOracleDelay: 86400 };
export type Allocation = { token: string; symbol: string; weightBps: number };
export type StrategyDraft = { id: string; name: string; allocations: Allocation[]; policy: Policy; rebalanceHours: number; driftBps: number; updatedAt: string };
/** engineJobId links the schedule to an operator-registered validated runner job (services/scheduler). Only such schedules may be enabled. */
export type Schedule = { id: string; strategyId: string; intervalHours: number; startsAt: string; vault: string; adapter: string; enabled: boolean; engineJobId?: string };
export type Workspace = { strategies: StrategyDraft[]; schedules: Schedule[]; settings: { displayName: string } };
export const emptyWorkspace = (): Workspace => ({ strategies: [], schedules: [], settings: { displayName: "" } });
export const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const integer = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
export function validPolicy(p: unknown): p is Policy {
  return isRecord(p) && integer(p.maxTradeBps, 1, 10000) && integer(p.maxAllocationBps, 1, 10000) && integer(p.maxDailyLossBps, 1, 10000) && integer(p.maxSlippageBps, 1, 2000) && integer(p.cooldown, 0, 31536000) && integer(p.maxOracleDelay, 1, 31536000);
}
export function validateWorkspace(input: unknown): Workspace {
  if (!isRecord(input) || !Array.isArray(input.strategies) || input.strategies.length > 100 || !Array.isArray(input.schedules) || input.schedules.length > 100 || !isRecord(input.settings) || typeof input.settings.displayName !== "string" || input.settings.displayName.length > 80) throw new Error("Invalid workspace.");
  const ids = new Set<string>();
  const strategies = input.strategies.map((s): StrategyDraft => {
    if (!isRecord(s) || !text(s.id, 64) || ids.has(s.id) || !text(s.name, 64) || !s.name.trim() || !validPolicy(s.policy) || !integer(s.rebalanceHours, 1, 8760) || !integer(s.driftBps, 1, 10000) || !Array.isArray(s.allocations) || s.allocations.length < 1 || s.allocations.length > 16 || typeof s.updatedAt !== "string" || !Number.isFinite(Date.parse(s.updatedAt))) throw new Error("Invalid strategy. Set a name, allocations, and valid risk limits.");
    ids.add(s.id);
    const tokens = new Set<string>();
    const allocations = s.allocations.map((a): Allocation => {
      if (!isRecord(a) || typeof a.token !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(a.token) || /^0x0{40}$/i.test(a.token) || tokens.has(a.token.toLowerCase()) || !text(a.symbol, 24) || !integer(a.weightBps, 1, 10000)) throw new Error("Use unique token addresses and positive allocation weights.");
      tokens.add(a.token.toLowerCase());
      return { token: a.token.toLowerCase(), symbol: a.symbol, weightBps: a.weightBps };
    });
    if (allocations.reduce((n, a) => n + a.weightBps, 0) !== 10000) throw new Error("Allocation weights must total 100%.");
    return { id: s.id, name: s.name.trim(), allocations, policy: { maxTradeBps: s.policy.maxTradeBps, maxAllocationBps: s.policy.maxAllocationBps, maxDailyLossBps: s.policy.maxDailyLossBps, maxSlippageBps: s.policy.maxSlippageBps, cooldown: s.policy.cooldown, maxOracleDelay: s.policy.maxOracleDelay }, rebalanceHours: s.rebalanceHours, driftBps: s.driftBps, updatedAt: s.updatedAt };
  });
  const scheduleIds = new Set<string>();
  const schedules = input.schedules.map((s): Schedule => {
    const engineJobId = typeof s?.engineJobId === "string" && s.engineJobId ? s.engineJobId : undefined;
    if (engineJobId !== undefined && !/^[a-z0-9][a-z0-9-]{0,63}$/.test(engineJobId)) throw new Error("Invalid engine job id.");
    if (!isRecord(s) || !text(s.id, 64) || scheduleIds.has(s.id) || typeof s.strategyId !== "string" || (engineJobId ? s.strategyId !== "" && !ids.has(s.strategyId) : !ids.has(s.strategyId)) || !integer(s.intervalHours, 1, 8760) || typeof s.startsAt !== "string" || !Number.isFinite(Date.parse(s.startsAt))) throw new Error("Invalid schedule.");
    scheduleIds.add(s.id);
    const vault = typeof s.vault === "string" ? s.vault : "", adapter = typeof s.adapter === "string" ? s.adapter : "";
    const enabled = s.enabled === true;
    if (enabled && !engineJobId) throw new Error("Only schedules linked to a validated engine job can be enabled.");
    if (enabled && (!/^0x[0-9a-fA-F]{40}$/.test(vault) || /^0x0{40}$/i.test(vault))) throw new Error("Enabled schedules need a vault address.");
    return { id: s.id, strategyId: s.strategyId, intervalHours: s.intervalHours, startsAt: s.startsAt, vault, adapter, enabled, ...(engineJobId ? { engineJobId } : {}) };
  });
  return { strategies, schedules, settings: { displayName: input.settings.displayName.trim() } };
}
