import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
const origin = process.env.TEST_APP_URL || "http://localhost:3000";
const account = privateKeyToAccount(`0x${randomBytes(32).toString("hex")}`);
let cookie = "";
const checks = [];
async function request(path, method = "GET", body, authenticated = true) {
  const response = await fetch(origin + path, { method, headers: { origin, "content-type": "application/json", ...(authenticated && cookie ? { cookie } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json(); return { response, data };
}
try {
  assert.equal((await request("/api/workspace?chainId=4663")).response.status, 401); checks.push("unauthenticated read rejected");
  const challenge = await request("/api/session", "POST", { action: "challenge", address: account.address, chainId: 4663 });
  assert.equal(challenge.response.status, 200, JSON.stringify(challenge.data));
  const signature = await account.signMessage({ message: challenge.data.message });
  const loginBody = { action: "verify", id: challenge.data.id, signature };
  const login = await request("/api/session", "POST", loginBody);
  assert.equal(login.response.status, 200, JSON.stringify(login.data));
  cookie = login.response.headers.get("set-cookie").split(";")[0]; checks.push("wallet signature creates an HttpOnly session");
  assert.match(login.response.headers.get("set-cookie"), /HttpOnly/);
  assert.equal((await request("/api/session", "POST", loginBody)).response.status, 401); checks.push("challenge replay rejected");
  const initial = await request("/api/workspace?chainId=4663"); assert.equal(initial.response.status, 200);
  assert.deepEqual(initial.data.workspace.strategies, []);
  const workspace = { strategies: [{ id: "integration", name: "Integration allocation", allocations: [{ token: "0x0000000000000000000000000000000000000123", symbol: "ASSET", weightBps: 10000 }], policy: { maxTradeBps: 1000, maxAllocationBps: 2500, maxDailyLossBps: 500, maxSlippageBps: 100, cooldown: 3600, maxOracleDelay: 86400 }, rebalanceHours: 168, driftBps: 500, updatedAt: new Date().toISOString() }], schedules: [], settings: { displayName: "Integration account" } };
  const saved = await request("/api/workspace", "PUT", { chainId: 4663, revision: 0, workspace }); assert.equal(saved.response.status, 200, JSON.stringify(saved.data));
  const persisted = await request("/api/workspace?chainId=4663"); assert.equal(persisted.data.workspace.strategies[0].name, workspace.strategies[0].name); checks.push("strategy persisted and read back");
  assert.equal((await request("/api/workspace", "PUT", { chainId: 4663, revision: 0, workspace })).response.status, 409); checks.push("concurrent stale write rejected");
  const invalid = structuredClone(workspace); invalid.strategies[0].allocations[0].weightBps = 2000;
  assert.equal((await request("/api/workspace", "PUT", { chainId: 4663, revision: 1, workspace: invalid })).response.status, 400); checks.push("invalid weights rejected");
  assert.equal((await request("/api/agent", "POST", { chainId: 4663, model: "another-model", messages: [{ role: "user", content: "hello" }] })).response.status, 400); checks.push("browser model override rejected");
  if (process.argv.includes("--agent")) {
    const reply = await request("/api/agent", "POST", { chainId: 4663, messages: [{ role: "user", content: "Jawab singkat dalam bahasa Indonesia: apakah deployment vault tersedia menurut observasi server? Jangan membuat data baru." }] });
    console.log("OpenRouter live check:", JSON.stringify({ status: reply.response.status, model: reply.data.model, hasAnswer: typeof reply.data.text === "string" && reply.data.text.length > 0, error: reply.data.error }));
    assert.equal(reply.response.status, 200, reply.data.error); checks.push("fixed free OpenRouter model returned a real answer");
  }
  await request("/api/workspace", "PUT", { chainId: 4663, revision: 1, workspace: { strategies: [], schedules: [], settings: { displayName: "" } } });
  assert.equal((await request("/api/session", "POST", { action: "logout" })).response.status, 200);
  assert.equal((await request("/api/workspace?chainId=4663")).response.status, 401); checks.push("logout revokes the session");
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} catch (error) { console.error("Integration check failed:", error.message); console.log(JSON.stringify({ completedChecks: checks })); process.exitCode = 1; }
