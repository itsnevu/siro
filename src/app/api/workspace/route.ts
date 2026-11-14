import { ALL_CHAINS } from "@/lib/chains";
import { validateWorkspace, isRecord } from "@/lib/workspace-model";
import { session, sameOrigin, jsonBody, readWorkspace, writeWorkspace, HttpError, apiError, limit } from "@/lib/server/store";
import { engineJobs, jobStates, activationError, assertVaultOwner } from "@/lib/server/scheduler";
import { accountOf, walletsOf } from "@/lib/server/roles";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function chain(value: unknown): number { const id = Number(value); if (!ALL_CHAINS[id]) throw new HttpError(400, "Unsupported chain."); return id; }
export async function GET(request: Request) {
  try { return Response.json(readWorkspace(accountOf(session(request)), chain(new URL(request.url).searchParams.get("chainId"))), { headers: { "cache-control": "no-store" } }); }
  catch (error) { return apiError(error); }
}
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const address = session(request);
    const account = accountOf(address);
    limit(`save:${address}`, 30);
    const body = await jsonBody(request);
    if (!isRecord(body) || !Number.isSafeInteger(body.revision) || Number(body.revision) < 0) throw new HttpError(400, "Invalid workspace revision.");
    let workspace;
    try { workspace = validateWorkspace(body.workspace); } catch (error) { throw new HttpError(400, error instanceof Error ? error.message : "Invalid workspace."); }
    const chainId = chain(body.chainId);
    const jobs = engineJobs(), states = jobStates();
    for (const s of workspace.schedules) { const reason = activationError(s, chainId, jobs, states); if (reason) throw new HttpError(400, reason); }
    // The connected vault owner is the session address; a schedule may only activate a job for a vault they own.
    if (workspace.schedules.some(s => s.enabled)) await assertVaultOwner(walletsOf(account), chainId, workspace.schedules.filter(s => s.enabled).map(s => s.vault));
    return Response.json(writeWorkspace(account, chainId, Number(body.revision), workspace));
  } catch (error) { return apiError(error); }
}
