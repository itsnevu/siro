import { tradingRead } from "@/lib/server/trading";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)) return Response.json({ error: "Enter a valid decision UUIDv7.", prev_hash: null, verification_url: "/verify" }, { status: 400 });
  try { return Response.json(await tradingRead(`verify/${id}`), { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { return Response.json({ error: e instanceof Error ? e.message : "Verification is unavailable.", prev_hash: null, verification_url: "/verify" }, { status: 503 }); }
}
