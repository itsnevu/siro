import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { privateKeyToAccount } from "viem/accounts";
const origin = process.env.TEST_APP_URL || "http://localhost:3000";
const account = privateKeyToAccount(`0x${randomBytes(32).toString("hex")}`);
const tab = await (await fetch("http://localhost:9333/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
let seq = 0; const pending = new Map(); const errors = [];
function cdp(method, params = {}) { const id = ++seq; return new Promise((ok, fail) => { pending.set(id, { ok, fail }); ws.send(JSON.stringify({ id, method, params })); }); }
ws.onmessage = async event => {
  const message = JSON.parse(event.data);
  if (message.id) { const call = pending.get(message.id); if (call) { pending.delete(message.id); message.error ? call.fail(new Error(message.error.message)) : call.ok(message.result); } }
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
  if (message.method === "Runtime.bindingCalled" && message.params.name === "siroSign") {
    const request = JSON.parse(message.params.payload);
    try { const signature = await account.signMessage({ message: { raw: request.message } }); await cdp("Runtime.evaluate", { expression: `window.siroCallbacks[${request.id}].resolve(${JSON.stringify(signature)})`, contextId: message.params.executionContextId }); }
    catch { await cdp("Runtime.evaluate", { expression: `window.siroCallbacks[${request.id}].reject(new Error('Test signer failed'))`, contextId: message.params.executionContextId }); }
  }
};
async function evaluate(expression) { const r = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; }
const pause = ms => new Promise(r => setTimeout(r, ms));
async function until(expression, label, timeout = 15_000) { const deadline = Date.now() + timeout; while (Date.now() < deadline) { try { if (await evaluate(expression)) return; } catch {} await pause(150); } throw new Error(`Timed out: ${label}`); }
async function click(label) { await until(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.disabled)`, `button ${label}`); await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`); }
async function fill(selector, value) { await evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`); }
async function navigate(path) { await cdp("Page.navigate", { url: origin + path }); await until(`document.readyState==='complete'&&!!document.querySelector('main')`, path); }
const results = [];
try {
  await cdp("Page.enable"); await cdp("Runtime.enable"); await cdp("Runtime.addBinding", { name: "siroSign" });
  await cdp("Page.addScriptToEvaluateOnNewDocument", { source: `window.siroCallbacks={};let siroSeq=0;window.ethereum={isMetaMask:true,isConnected:()=>true,on:()=>{},removeListener:()=>{},request:async({method,params})=>{if(method==='eth_accounts'||method==='eth_requestAccounts')return[${JSON.stringify(account.address)}];if(method==='eth_chainId')return'0x1237';if(method==='net_version')return'4663';if(method==='wallet_getCapabilities')return{};if(method==='personal_sign')return new Promise((resolve,reject)=>{let id=++siroSeq;window.siroCallbacks[id]={resolve,reject};window.siroSign(JSON.stringify({id,message:params[0]}))});throw new Error('Unsupported test wallet method: '+method)}};` });
  await navigate("/app/studio");
  await click("Connect"); await until(`document.body.innerText.includes('Disconnect')`, "wallet connection");
  await click("Sign in with wallet"); await until(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Save strategy'&&!b.disabled)`, "authenticated workspace"); results.push("browser wallet connection and signed login");
  await fill('input[maxlength="64"]', "Browser integration allocation");
  await fill('input[aria-label="Token address"]', "0x0000000000000000000000000000000000000123");
  await fill('input[aria-label="Token symbol"]', "ASSET"); await click("Add token"); await click("Save strategy");
  await until(`document.body.innerText.includes('Strategy saved to your wallet workspace.')`, "strategy save");
  mkdirSync(".preview", { recursive: true }); const prices = resolve(".preview/browser-prices.csv"); writeFileSync(prices, "date,ASSET\n2026-11-01,100\n2026-11-02,110\n");
  const root = await cdp("DOM.getDocument"); const file = await cdp("DOM.querySelector", { nodeId: root.root.nodeId, selector: 'input[type="file"]' }); await cdp("DOM.setFileInputFiles", { nodeId: file.nodeId, files: [prices] });
  await click("Run backtest"); await until(`document.body.innerText.includes('1091.27')`, "calculated backtest result"); results.push("saved strategy and CSV backtest computed in the browser");
  await navigate("/app/strategies"); await until(`document.body.innerText.includes('Browser integration allocation')`, "persisted strategy after navigation"); results.push("strategy persists across navigation");
  await click("Delete saved strategy"); await until(`document.body.innerText.includes('No saved strategies')`, "delete test strategy");
  for (const path of ["/app", "/app/portfolio", "/app/strategies", "/app/studio", "/app/agent", "/app/approvals", "/app/schedules", "/app/token", "/app/settings", "/strategies", "/stats", "/buyback"]) {
    await cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await navigate(path); await pause(250);
    const state = await evaluate(`({text:document.body.innerText,overflow:document.documentElement.scrollWidth>window.innerWidth+1})`);
    assert.ok(!state.text.includes("Demo preview."), `${path} still has a demo notice`);
    assert.ok(!state.text.includes("$29,413.02"), `${path} has a fabricated balance`);
    assert.equal(state.overflow, false, `${path} overflows on mobile`);
  }
  results.push("12 routes render without demo notices, fabricated balances or mobile overflow");
  const screenshot = await cdp("Page.captureScreenshot", { format: "png" }); writeFileSync(".preview/no-demo-mobile.png", Buffer.from(screenshot.data, "base64"));
  assert.deepEqual(errors, [], "Browser runtime exceptions");
  console.log(JSON.stringify({ passed: results.length, results, runtimeExceptions: errors.length }, null, 2));
} catch (error) { console.error("Browser check failed:", error.message); console.log(JSON.stringify({ completed: results, runtimeExceptions: errors })); process.exitCode = 1; }
finally { await cdp("Page.close").catch(() => {}); ws.close(); }
