// A fixed free model, verified against OpenRouter's live catalog on 2026-11-13.
// Browser requests and environment variables cannot change this selection.
export const AGENT_MODEL = "nvidia/nemotron-3.5-super-vl:free";
let checkedUntil = 0;
export async function ensureFreeModel() {
  if (Date.now() < checkedUntil) return;
  const response = await fetch("https://openrouter.ai/api/v1/models", { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("OpenRouter pricing could not be verified. No inference request was sent.");
  const { data } = await response.json() as { data: { id: string; pricing: { prompt: string; completion: string; request?: string; internal_reasoning?: string } }[] };
  const model = data.find(m => m.id === AGENT_MODEL);
  if (!model || Object.values(model.pricing).some(p => Number(p) !== 0)) throw new Error("The fixed model is unavailable or no longer free. No paid fallback is allowed.");
  checkedUntil = Date.now() + 300_000;
}
