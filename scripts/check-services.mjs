import { readFileSync, writeFileSync } from "node:fs";
process.loadEnvFile(".env.local");
const raw = process.env.ALCHEMY_RPC_URL_4663?.trim();
let endpoint = raw;
if (raw && /^[a-zA-Z0-9_-]{8,128}$/.test(raw)) {
  endpoint = `https://robinhood-mainnet.g.alchemy.com/v2/${raw}`;
  if (process.argv.includes("--normalize")) {
    const text = readFileSync(".env.local", "utf8").replace(/^ALCHEMY_RPC_URL_4663=.*$/m, `ALCHEMY_RPC_URL_4663=${endpoint}`);
    writeFileSync(".env.local", text);
    console.log("Alchemy key converted to the documented Robinhood HTTPS endpoint. Secret not printed.");
  }
}
console.log(`OpenRouter credential present: ${!!process.env.OPENROUTER_API_KEY?.trim()}`);
if (!endpoint || !URL.canParse(endpoint) || new URL(endpoint).protocol !== "https:") {
  console.log("Alchemy: a complete HTTPS RPC URL is required.");
  process.exitCode = 1;
} else {
  try {
    const r = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }), signal: AbortSignal.timeout(10_000) });
    const body = await r.json();
    const chainId = body.result ? Number(BigInt(body.result)) : null;
    console.log(JSON.stringify({ service: "Alchemy", http: r.status, chainId, correctChain: chainId === 4663, rpcErrorCode: body.error?.code }));
    if (chainId !== 4663) process.exitCode = 1;
  } catch { console.log("Alchemy: connectivity check failed or timed out; endpoint was not printed."); process.exitCode = 1; }
}
