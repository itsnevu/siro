import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { CHAINS, DEFAULT_CHAIN } from "./chains";

/**
 * wagmi config for Robinhood Chain mainnet (4663), the only network. The browser transport is the
 * same-origin /api/rpc relay, because the public RPC is filtered by some ISPs.
 *
 * "Which chain am I on" is not decided here: see network.tsx.
 */
const chains = CHAINS.map((c) => c.chain) as [(typeof CHAINS)[number]["chain"], ...(typeof CHAINS)[number]["chain"][]];

export const wagmiConfig = createConfig({
  chains,
  connectors: [injected()],
  transports: Object.fromEntries(CHAINS.map((c) => [c.id, http(c.rpcUrl)])),
  ssr: true,
});

/** The default network's viem chain. Kept for code that needs a single chain object. */
export const siroChain = DEFAULT_CHAIN.chain;
/** Default network's explorer. Prefer useNetwork().explorerUrl in components. */
export const explorerUrl = DEFAULT_CHAIN.explorerUrl;

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
