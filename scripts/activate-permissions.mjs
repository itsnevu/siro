// Activates a vault's queued token/router/executor permissions after the timelock, then reads them
// back. Activation is permissionless and moves no funds; any funded key can send it (gas only).
//   node scripts/activate-permissions.mjs --vault 0x… --router 0x… --executor 0x… --tokens 0x…,0x…
// Env: SIRO_ACTIVATOR_KEY (gas-only hot key), ALCHEMY_RPC_URL_4663 or SIRO_RPC_4663
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const vault = arg("vault"), router = arg("router"), executor = arg("executor"), tokens = (arg("tokens") ?? "").split(",").filter(Boolean);
if (!vault || !router || !executor || !tokens.length) throw new Error("usage: --vault --router --executor --tokens");
const rpc = process.env.SIRO_RPC_4663 || process.env.ALCHEMY_RPC_URL_4663;
const chain = { id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } };
const pub = createPublicClient({ chain, transport: http(rpc) });
const wallet = createWalletClient({ chain, account: privateKeyToAccount(process.env.SIRO_ACTIVATOR_KEY), transport: http(rpc) });
const abi = parseAbi([
  "function pendingTokenPermission(address) view returns (bool allowed, uint64 validAfter, bool exists)",
  "function pendingRouterPermission(address) view returns (bool allowed, uint64 validAfter, bool exists)",
  "function pendingExecutorPermission(address) view returns (bool allowed, uint64 validAfter, bool exists)",
  "function activateTokenPermission(address)", "function activateRouterPermission(address)", "function activateExecutorPermission(address)",
  "function allowedTokens(address) view returns (bool)", "function allowedRouters(address) view returns (bool)", "function executors(address) view returns (bool)",
]);
const log = (event, extra = {}) => console.log(JSON.stringify({ ts: new Date().toISOString(), scope: "vault.activate", vault, event, ...extra }));

const jobs = [
  ...tokens.map((t) => ({ kind: "token", target: t, pending: "pendingTokenPermission", activate: "activateTokenPermission", check: "allowedTokens" })),
  { kind: "router", target: router, pending: "pendingRouterPermission", activate: "activateRouterPermission", check: "allowedRouters" },
  { kind: "executor", target: executor, pending: "pendingExecutorPermission", activate: "activateExecutorPermission", check: "executors" },
];
const now = BigInt((await pub.getBlock()).timestamp);
for (const j of jobs) {
  const [, validAfter, exists] = await pub.readContract({ address: vault, abi, functionName: j.pending, args: [j.target] });
  if (exists && now < validAfter) { log("too_early", { target: j.target, validAfter: Number(validAfter), now: Number(now) }); process.exit(2); }
}
const hashes = [];
for (const j of jobs) {
  const [, , exists] = await pub.readContract({ address: vault, abi, functionName: j.pending, args: [j.target] });
  if (!exists) { log("not_pending", { kind: j.kind, target: j.target }); continue; }
  const { request } = await pub.simulateContract({ account: wallet.account, address: vault, abi, functionName: j.activate, args: [j.target] });
  const hash = await wallet.writeContract(request);
  const r = await pub.waitForTransactionReceipt({ hash });
  hashes.push(hash);
  log("activated", { kind: j.kind, target: j.target, hash, status: r.status, gasUsed: r.gasUsed.toString() });
}
let ok = true;
for (const j of jobs) {
  const active = await pub.readContract({ address: vault, abi, functionName: j.check, args: [j.target] });
  if (!active) ok = false;
  log("readback", { kind: j.kind, target: j.target, active });
}
log(ok ? "all_active" : "incomplete", { txs: hashes.length });
process.exit(ok ? 0 : 1);
