import { session, apiError } from "@/lib/server/store";
import { engineJobs, jobStates, schedulerOnline } from "@/lib/server/scheduler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Registered engine jobs with their scheduler status. No config paths, env, or keys. */
export async function GET(request: Request) {
  try {
    session(request);
    const states = jobStates();
    const jobs = engineJobs().map(j => ({ ...j, state: states.get(j.id) ?? null }));
    return Response.json({ online: schedulerOnline(), jobs }, { headers: { "cache-control": "no-store" } });
  } catch (error) { return apiError(error); }
}
