import type { Address } from "viem";

export const ROBINHOOD_CHAIN = {
  id: 4663,
  rpc: "https://rpc.mainnet.chain.robinhood.com",
  explorer: "https://robinhoodchain.blockscout.com",
  assetsApi: "https://api.robinhood.com/rhj/assets",
  usdg: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as Address,
  weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73" as Address,
} as const;

export type RobinhoodAsset = { tokenSymbol: string; tokenName: string; status: string; deployments: { contractAddress: Address; chainId: number }[]; currentMultiplier: string; logoUrl?: string };
export async function getRobinhoodAssets(): Promise<RobinhoodAsset[]> {
  const response = await fetch(ROBINHOOD_CHAIN.assetsApi, { next: { revalidate: 300 } });
  if (!response.ok) throw new Error(`Robinhood assets API returned ${response.status}`);
  const body = await response.json() as { assets?: RobinhoodAsset[] };
  return (body.assets ?? []).filter((asset) => asset.deployments.some((deployment) => deployment.chainId === ROBINHOOD_CHAIN.id));
}
