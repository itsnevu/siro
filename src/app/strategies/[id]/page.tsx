import Link from "next/link";
import { notFound } from "next/navigation";
import { DEFAULT_CHAIN_ID, getChain } from "@/lib/chains";
import { AgentRegistryAbi } from "@/lib/generated/abis";
import { serverClient } from "@/lib/server/rpc";
import { ProsePage } from "@/components/ProsePage";
export const dynamic = "force-dynamic";
export default async function StrategyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ chain?: string }> }) {
 const { id } = await params; const query = await searchParams; const net = getChain(Number(query.chain || DEFAULT_CHAIN_ID)); if (!/^[1-9][0-9]{0,15}$/.test(id) || !net?.agentRegistry) notFound();
 let agent; try { const client = serverClient(net.id); if (await client.getChainId() !== net.id) throw new Error(); agent = await client.readContract({ address: net.agentRegistry, abi: AgentRegistryAbi, functionName: "getAgent", args: [BigInt(id)] }); } catch { return <ProsePage eyebrow="Agent" title="Registry unavailable" lede="The agent could not be read from the configured RPC. Retry later."><p>No values are estimated.</p></ProsePage>; }
 if (agent.creator === "0x0000000000000000000000000000000000000000") notFound();
 return <ProsePage eyebrow="Registered strategy" title={`Agent #${id}`} lede="The identity and addresses below are read from the agent registry."><dl><dt>Network</dt><dd>{net.name}</dd><dt>Creator</dt><dd className="break-all">{agent.creator}</dd><dt>Vault</dt><dd className="break-all">{agent.vault}</dd><dt>Registry status</dt><dd>{agent.active ? "Listed" : "Unlisted"}</dd><dt>Policy hash at registration / last registry update</dt><dd className="break-all">{agent.policyHash}</dd></dl><p>Read the vault itself for its current policy and permission state. Registry metadata does not prove that a keeper is active.</p><Link href={`/app?chain=${net.id}`}>Open vault dashboard</Link></ProsePage>;
}
