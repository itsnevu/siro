import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { session, sameOrigin, jsonBody, apiError, HttpError, limit } from "@/lib/server/store";
import { requireRole, audit, auditLog } from "@/lib/server/roles";
import { isRecord } from "@/lib/workspace-model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only risk parameters (riskengine::Policy). Every change is audited: who, when, old, new, why.
const path = () => { const p = process.env.SIRO_RISK_POLICY; if (!p) throw new HttpError(503, "SIRO_RISK_POLICY is not configured."); return resolve(/* turbopackIgnore: true */ p); };

function validPolicy(p: unknown): p is { max_weight: number; target_vol_pct: number; risk_units_per_weight: number; permit_ttl_ms: number } {
  return isRecord(p) && Object.keys(p).sort().join(",") === "max_weight,permit_ttl_ms,risk_units_per_weight,target_vol_pct"
    && typeof p.max_weight === "number" && p.max_weight > 0 && p.max_weight <= 1
    && typeof p.target_vol_pct === "number" && p.target_vol_pct > 0 && p.target_vol_pct <= 100
    && typeof p.risk_units_per_weight === "number" && p.risk_units_per_weight > 0
    && Number.isInteger(p.permit_ttl_ms) && Number(p.permit_ttl_ms) > 0 && Number(p.permit_ttl_ms) <= 5000;
}

export async function GET(request: Request) {
  try {
    requireRole(session(request), "admin");
    return Response.json({ policy: JSON.parse(readFileSync(path(), "utf8")), audit: auditLog() }, { headers: { "cache-control": "no-store" } });
  } catch (error) { return apiError(error); }
}

export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const who = session(request);
    requireRole(who, "admin");
    limit(`admin:${who}`, 10);
    const body = await jsonBody(request, 4000);
    if (!isRecord(body) || typeof body.reason !== "string" || !validPolicy(body.policy)) throw new HttpError(400, "Send { policy, reason } with max_weight in (0,1], target_vol_pct > 0, risk_units_per_weight > 0, permit_ttl_ms in 1..5000.");
    const file = path();
    const old = JSON.parse(readFileSync(file, "utf8"));
    audit(who, "risk_policy", old, body.policy, body.reason);
    const temp = `${file}.${process.pid}.tmp`;
    writeFileSync(temp, JSON.stringify(body.policy, null, 2), { flag: "wx" });
    renameSync(temp, file); // atomic replace; the risk process reads it on restart
    return Response.json({ policy: body.policy, note: "Restart the risk process to apply the new policy." });
  } catch (error) { return apiError(error); }
}
