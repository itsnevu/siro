import type { Metadata } from "next";
import { ProsePage } from "@/components/ProsePage";
import { ALL_CHAINS } from "@/lib/chains";

export const metadata: Metadata = {
  title: "Security | Siro",
  description: "Deployed contracts on Robinhood Chain, what is not deployed, audit status and how to report a vulnerability.",
};

const MAINNET = ALL_CHAINS[4663];
const link = (address: string) => (MAINNET.explorerUrl ? `${MAINNET.explorerUrl}/address/${address}` : undefined);

// Addresses come from the generated deployment registry (contracts/deployments → src/lib/generated).
const DEPLOYED = [
  { name: "Anchor", address: MAINNET.anchor, desc: "Daily Merkle roots and permissionless publication witness for committed decisions." },
  { name: "SessionExecutor", address: MAINNET.sessionExecutor, desc: "Scoped session keys: per-trade and daily caps, expiry, asset and router allowlists, revoke and revoke-all." },
  { name: "UniswapV3Adapter", address: "0x8E662a5D28d089960d601e817aBa430e5981fdd2", desc: "Swap adapter over the official Uniswap V3 deployment. Write-once routes for 10 stock tokens (AAPL, MSFT, NVDA, AMZN, GOOGL, TSLA, META, SPY, QQQ, COIN) against USDG." },
  { name: "GuardedVaultFactory", address: MAINNET.guardedVaultFactory, desc: "Creates one ERC-4626 GuardedVault per agent, owned by the creator, with a one-day policy timelock." },
  { name: "AgentRegistry", address: MAINNET.agentRegistry, desc: "Records which vaults the factory created. Only the factory can register." },
  { name: "ChainlinkOracle", address: MAINNET.oracle, desc: "Reads Chainlink feeds (USDG/USD 0x61B7…9aD2) and rejects stale or paused prices." },
].filter(c => c.address);
const NOT_DEPLOYED = ["GuardedVaultFactory", "GuardedVault", "AgentRegistry", "ChainlinkOracle"].filter(() => !MAINNET.guardedVaultFactory);

export default function SecurityPage() {
  return (
    <ProsePage eyebrow="Security" title="Security" lede="What is deployed on Robinhood Chain mainnet, what is not, and what has not been audited.">
      <h2>Principles</h2>
      <ul>
        <li>Non-custodial: funds stay in contracts controlled by the owner&apos;s wallet. Siro never holds private keys.</li>
        <li>Every order needs a signed risk permit valid for at most 5 seconds; session keys are capped and revocable on chain.</li>
        <li>Every decision is committed as a hash before execution and can be verified without an account at /verify.</li>
      </ul>

      <h2>Deployed on Robinhood Chain (4663)</h2>
      {DEPLOYED.length === 0 ? <p>No contract is deployed yet.</p> : (
        <table>
          <thead><tr><th scope="col">Contract</th><th scope="col">Address</th><th scope="col">Purpose</th></tr></thead>
          <tbody>
            {DEPLOYED.map(c => (
              <tr key={c.name}>
                <td><code>{c.name}</code></td>
                <td>{link(c.address!) ? <a href={link(c.address!)} rel="noopener noreferrer"><code>{c.address}</code></a> : <code>{c.address}</code>}</td>
                <td>{c.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p>Every contract is owned by a single address, not a multisig. Robinhood Chain has no sequencer uptime feed yet, so the oracle cannot detect a sequencer outage. The swap adapter is live with routes and Chainlink feeds for 10 stock tokens. A vault only trades after its owner allows the adapter, the tokens and an executor, each behind the one-day timelock, and the execution engine is still being brought online.</p>

      {NOT_DEPLOYED.length > 0 && <>
        <h2>Not deployed yet</h2>
        <p>{NOT_DEPLOYED.map(n => <code key={n}>{n} </code>)}: vault creation and deposits are unavailable until these are deployed.</p>
      </>}

      <h2>Audits</h2>
      <p>No third-party audit has been performed on any Siro contract. Do not deposit funds you cannot afford to lose.</p>

      <h2>Reporting a vulnerability</h2>
      <p>There is no paid bug bounty. Report privately through a GitHub security advisory or to <a href="mailto:security@usesiro.xyz">security@usesiro.xyz</a>. The process and response times are in SECURITY.md in the repository.</p>
    </ProsePage>
  );
}
