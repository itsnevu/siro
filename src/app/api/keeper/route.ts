import { db, session, apiError } from "@/lib/server/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const address = session(request);
    const heartbeat = db().prepare("SELECT mode,signer,updated FROM keeper_heartbeat WHERE id=1").get() as { mode: string; signer: string | null; updated: number } | undefined;
    const runs = db().prepare("SELECT chain,schedule,status,detail,next_run,hash,updated FROM keeper_runs WHERE address=? ORDER BY updated DESC LIMIT 100").all(address);
    return Response.json({ heartbeat: heartbeat ? { ...heartbeat, online: Date.now() - heartbeat.updated < 90_000 } : null, runs }, { headers: { "cache-control": "no-store" } });
  } catch (error) { return apiError(error); }
}
