"use client";
import { useAccount, useReadContract } from "wagmi";
import { isAddress, zeroAddress, type Address } from "viem";
import { AppShell } from "@/components/app/AppShell";
import { AddressLink } from "@/components/app/Explorer";
import { useAgents } from "@/lib/guarded";
import { useNetwork } from "@/lib/network";
import { Erc20Abi, fmtUnits } from "@/lib/contracts";
const protocolTokens: Record<number, string | undefined> = { 4663: process.env.NEXT_PUBLIC_SIRO_TOKEN_4663 };
export default function TokenPage() {
 const net = useNetwork(); const data = useAgents(); const configured = protocolTokens[net.id]; const protocol = configured && isAddress(configured) && configured !== zeroAddress ? configured : undefined;
 const tokens = [...new Set([...(protocol ? [protocol] : []), ...data.agents.map(a => a.creatorToken).filter(a => a !== zeroAddress)])] as Address[];
 return <AppShell><div className="py-10 space-y-5"><h1 className="font-serif text-3xl">Tokens</h1><p className="text-sm text-fg-70">Balances are read from configured protocol and registered creator-token contracts on {net.name}.</p>{!protocol && <p>No protocol SIRO token address is configured for this chain.</p>}{data.isError && <p role="alert">Creator-token registry could not be read.</p>}{tokens.map(token => <TokenBalance key={token} token={token} />)}{!tokens.length && <p>No token contracts available in this registry range.</p>}<section className="rounded-xl border border-line p-5"><h2 className="font-serif text-xl">Staking</h2><p className="text-sm text-fg-70">No staking contract is configured. Stake, unstake, APY and reward claims are unavailable.</p></section></div></AppShell>;
}
function TokenBalance({ token }: { token: Address }) {
 const net = useNetwork(); const { address } = useAccount(); const opts = { address: token, abi: Erc20Abi, chainId: net.id } as const;
 const symbol = useReadContract({ ...opts, functionName: "symbol" }); const decimals = useReadContract({ ...opts, functionName: "decimals" }); const balance = useReadContract({ ...opts, functionName: "balanceOf", args: [address || zeroAddress], query: { enabled: !!address } });
 return <article className="rounded-xl border border-line p-5 space-y-2"><h2>{symbol.data || "Token"} <AddressLink address={token} /></h2><p>{!address ? "Connect your wallet to read its balance." : decimals.data === undefined ? "Token metadata unavailable." : `${fmtUnits(balance.data, decimals.data, 6)} ${symbol.data || ""}`}</p>{balance.isError && <p role="alert">Token balance could not be read.</p>}</article>;
}
