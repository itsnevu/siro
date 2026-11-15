// Ops alerts to Telegram: service down, stale oracle feed, low hot-wallet gas, kill switch on.
// Thresholds live in config/alerts.json. Runs once per invocation (systemd timer every 5 minutes).
//
//   node services/ops/alerts.mjs            check and alert (new or repeated problems only)
//   node services/ops/alerts.mjs --test     send one test message and exit
//
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (without them, alerts are logged, not sent),
//      ALCHEMY_RPC_URL_4663 or SIRO_RPC_4663, SIRO_ALERT_STATE (default .data/alerts-state.json)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createPublicClient, http, parseAbi, formatEther, parseEther } from "viem";

const cfg = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../config/alerts.json"), "utf8"));
const statePath = resolve(process.env.SIRO_ALERT_STATE ?? ".data/alerts-state.json");
const rpc = process.env.SIRO_RPC_4663 || process.env.ALCHEMY_RPC_URL_4663;
const log = (event, extra = {}) => console.log(JSON.stringify({ ts: new Date().toISOString(), scope: "ops.alerts", event, ...extra }));

async function send(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) { log("not_sent", { reason: "TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not set", text }); return false; }
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }), signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) { log("send_failed", { status: r.status }); return false; }
  return true;
}

if (process.argv.includes("--test")) {
  const ok = await send(`✅ Siro alert test from ${process.env.HOSTNAME ?? "server"} at ${new Date().toISOString()}`);
  log("test", { sent: ok }); process.exit(ok ? 0 : 1);
}

const client = createPublicClient({ transport: http(rpc, { timeout: 15_000, retryCount: 1 }) });
const feedAbi = parseAbi(["function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)"]);
const killAbi = parseAbi(["function killed() view returns (bool)", "function killSwitch() view returns (bool)"]);
const now = Math.floor(Date.now() / 1000);
const problems = []; // { key, text }

for (const unit of cfg.services) {
  let state = "unknown";
  try { state = execFileSync("systemctl", ["is-active", unit], { encoding: "utf8" }).trim(); } catch (e) { state = String(e.stdout ?? "inactive").trim() || "inactive"; }
  if (state !== "active") problems.push({ key: `service:${unit}`, text: `🔴 Service ${unit} is ${state}` });
}
if (!rpc) problems.push({ key: "rpc:missing", text: "🔴 No RPC configured for alerts" });
else {
  for (const f of cfg.oracle.feeds) {
    try {
      const [, answer, , updatedAt] = await client.readContract({ address: f.address, abi: feedAbi, functionName: "latestRoundData" });
      const age = now - Number(updatedAt);
      if (answer <= 0n || age > f.maxAgeSeconds) problems.push({ key: `oracle:${f.name}`, text: `🟠 Oracle ${f.name} is stale: last update ${Math.round(age / 3600)}h ago (limit ${Math.round(f.maxAgeSeconds / 3600)}h)` });
    } catch { problems.push({ key: `oracle:${f.name}:read`, text: `🟠 Oracle ${f.name} could not be read` }); }
  }
  const min = parseEther(cfg.gas.minEth);
  for (const w of cfg.gas.wallets) {
    try {
      const bal = await client.getBalance({ address: w.address });
      if (bal < min) problems.push({ key: `gas:${w.name}`, text: `🟡 Hot wallet ${w.name} is low on gas: ${formatEther(bal)} ETH (minimum ${cfg.gas.minEth})` });
    } catch { problems.push({ key: `gas:${w.name}:read`, text: `🟡 Balance of ${w.name} could not be read` }); }
  }
  try {
    if (await client.readContract({ address: cfg.killSwitch.sessionExecutor, abi: killAbi, functionName: "killed" })) problems.push({ key: "kill:executor", text: "⛔ SessionExecutor kill switch is ON: all agent sessions are stopped" });
  } catch { problems.push({ key: "kill:executor:read", text: "🟠 SessionExecutor kill switch could not be read" }); }
  for (const v of cfg.killSwitch.vaults) {
    try {
      if (await client.readContract({ address: v, abi: killAbi, functionName: "killSwitch" })) problems.push({ key: `kill:${v}`, text: `⛔ Vault ${v.slice(0, 10)}… kill switch is ON: trading paused` });
    } catch { problems.push({ key: `kill:${v}:read`, text: `🟠 Vault ${v.slice(0, 10)}… kill switch could not be read` }); }
  }
}

// Dedupe: alert when a problem appears, repeat after repeatAfterMinutes, and announce recovery.
let state = { open: {}, heartbeatDay: null };
try { state = JSON.parse(readFileSync(statePath, "utf8")); } catch { /* first run */ }
const open = {}, messages = [];
for (const p of problems) {
  const last = state.open[p.key];
  open[p.key] = last ?? Date.now();
  const lastSent = state.sent?.[p.key] ?? 0;
  if (!last || Date.now() - lastSent > cfg.repeatAfterMinutes * 60_000) messages.push(p);
}
for (const key of Object.keys(state.open)) if (!open[key]) messages.push({ key: `recovered:${key}`, text: `✅ Recovered: ${key}` });
const sent = { ...(state.sent ?? {}) };
for (const m of messages) if (await send(m.text)) sent[m.key] = Date.now();

const today = new Date().toISOString().slice(0, 10);
let heartbeatDay = state.heartbeatDay;
if (new Date().getUTCHours() === cfg.heartbeatHourUtc && heartbeatDay !== today) {
  if (await send(`💓 Siro ops heartbeat: ${problems.length ? `${problems.length} open problem(s)` : "all checks green"}`)) heartbeatDay = today;
}
mkdirSync(dirname(statePath), { recursive: true });
writeFileSync(statePath, JSON.stringify({ open, sent, heartbeatDay }, null, 2));
log("checked", { problems: problems.map((p) => p.key), notified: messages.length });
