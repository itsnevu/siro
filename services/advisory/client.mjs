import { sanitizeText } from "./sanitize.mjs";
export function fallback(input) {
  const { z_48h, rsi_14, atr_pct } = input.features;
  return { regime: atr_pct > 5 ? "vol_shock" : z_48h > 1 ? "trending_up" : z_48h < -1 ? "risk_off" : "chop", rationale_text: `Rule advisory: z_48h=${z_48h}, rsi_14=${rsi_14}, atr_pct=${atr_pct}; no LLM-derived execution instruction.`, events: [], strategy_proposals: [], source: "rules" };
}
export function validate(input, output) {
  if (output?.source === "rules") return fallback(input);
  if (!output || typeof output !== "object" || !["trending_up","chop","risk_off","vol_shock"].includes(output.regime) || typeof output.rationale_text !== "string" || output.rationale_text.length > 8000 || !Object.entries(input.features).some(([k,v]) => output.rationale_text.includes(k) && output.rationale_text.includes(String(v))) || !Array.isArray(output.events) || output.events.length > 20 || !Array.isArray(output.strategy_proposals) || output.strategy_proposals.length > 10) throw new Error("Malformed advisory output.");
  for (const e of output.events) if (!e || typeof e.summary !== "string" || !Number.isFinite(Date.parse(e.event_time)) || !/^https:\/\//.test(e.source_url) || !["earnings","macro","unlock","funding","other"].includes(e.type)) throw new Error("Invalid cited event.");
  for (const p of output.strategy_proposals) if (!p || typeof p.description !== "string" || typeof p.hypothesis !== "string") throw new Error("Invalid strategy proposal.");
  // LLM text is untrusted: sanitised before it reaches the journal or a page (phase 15, T4).
  return { regime: output.regime, rationale_text: sanitizeText(output.rationale_text), events: output.events.map(e => ({ ...e, summary: sanitizeText(e.summary, 500) })), strategy_proposals: output.strategy_proposals.map(p => ({ description: sanitizeText(p.description, 1000), hypothesis: sanitizeText(p.hypothesis, 1000) })), source: "llm" };
}
export async function advisory(input, { url, timeoutMs = 4000, fetcher = fetch } = {}) {
  if (!url) return fallback(input);
  try { const response = await fetcher(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(timeoutMs) }); if (!response.ok) throw new Error("Advisory unavailable."); const output = await response.json(); return validate(input, output); }
  catch { return fallback(input); }
}
