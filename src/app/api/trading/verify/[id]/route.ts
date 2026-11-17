import { tradingRead } from "@/lib/server/trading";
import { readFileSync } from 'node:fs';
import { createPublicClient, http } from 'viem';
import { verifyDecisionOnChain } from '../../../../../../services/anchor/verify-decision.mjs';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)) return Response.json({ error: "Enter a valid decision UUIDv7.", prev_hash: null, verification_url: "/verify" }, { status: 400 });
  try {
    const payload = await tradingRead(`verify/${id}`) as { data: Record<string, unknown> };
    let verification: unknown = { checks: { witness_before_execution: false, commitment_leaf_proof: false, reveal_hash_match: false, matching_trade_in_window: false }, label: 'commitment-bound reveal, served by operator', root_status: 'unverified', execution_status: 'execution unproven' };
    try {
      const config = JSON.parse(readFileSync(process.env.SIRO_EXECUTION_CONFIG || '', 'utf8'));
      config.anchor = process.env.SIRO_ANCHOR_ADDRESS;
      config.confirmations = Number(process.env.SIRO_ANCHOR_CONFIRMATIONS);
      const client = createPublicClient({ transport: http(process.env.SIRO_ANCHOR_RPC, { timeout: 5000, retryCount: 0 }) });
      verification = await verifyDecisionOnChain(payload.data, client, config);
    } catch { /* RPC, configuration, and malformed evidence all fail closed. */ }
    return Response.json({ ...payload, verification }, { headers: { 'Cache-Control': 'no-store' } });
  }
  catch (e) { return Response.json({ error: e instanceof Error ? e.message : "Verification is unavailable.", prev_hash: null, verification_url: "/verify" }, { status: 503 }); }
}
