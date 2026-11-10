import Link from "next/link";
import { ProsePage, Section } from "@/components/ProsePage";

export const metadata = {
  title: "Docs  Siro",
  description:
    "How Siro works: AI-powered copy trading vaults, risk management, and onchain leaderboard.",
};

const TOC = [
  { id: "overview", heading: "01 · Overview: AI Copy Trading" },
  { id: "how-it-works", heading: "How It Works" },
  { id: "copy-vault", heading: "SiroCopyVault Smart Contract" },
  { id: "risk-guard", heading: "SiroRiskGuard: Your Safety Net" },
  { id: "leaderboard", heading: "Onchain Leaderboard" },
  { id: "fees", heading: "Fee Structure" },
  { id: "networks", heading: "Supported Networks" },
  { id: "using-the-dashboard", heading: "Using the Dashboard" },
];

export default function Page() {
  return (
    <ProsePage
      eyebrow="Documentation"
      title="Siro: AI-Powered Copy Trading"
      lede="Non-custodial vaults that mirror top traders automatically. Deposit stablecoins, choose leaders to follow, and let the AI keeper execute trades within your risk limits."
      meta={["Updated November 2026", "~7 min read"]}
      toc={TOC}
    >
      <Section id="overview" heading="01 · Overview: AI Copy Trading">
        <p>
          <strong>Siro</strong> is a non-custodial copy trading platform built on EVM-compatible chains.
          Instead of manually tracking and replicating trades from top performers, Siro&rsquo;s AI keeper
          agent does it automatically  within risk parameters you control.
        </p>
        <p>The system is built on three smart contracts:</p>
        <ul>
          <li>
            <strong>SiroCopyVault</strong>  holds user deposits and executes trades through whitelisted DEX routers.
          </li>
          <li>
            <strong>SiroRiskGuard</strong>  validates every trade against your personal risk config before execution.
          </li>
          <li>
            <strong>SiroLeaderboard</strong>  tracks leader performance metrics onchain (PnL, Sharpe, drawdown).
          </li>
        </ul>
      </Section>

      <Section id="how-it-works" heading="How It Works">
        <div className="p-5 rounded-[12px] bg-soft border border-line my-4">
          <h3 className="text-[16px] font-bold text-ink mb-2">Step by step:</h3>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-[13px] text-ink">
            <li>
              <strong>Create a vault:</strong> deposit USDC (or USDG on Robinhood Chain) and choose up to
              5 leaders to follow.
            </li>
            <li>
              <strong>Set risk parameters:</strong> configure max trade size, daily loss limit, max per-token
              position, and slippage tolerance. Activate the kill switch anytime to freeze all trading.
            </li>
            <li>
              <strong>AI copies trades:</strong> the keeper agent monitors leader activity and replicates
              their trades through whitelisted DEX routers, scaled to your vault size.
            </li>
            <li>
              <strong>RiskGuard validates:</strong> every trade is checked against your risk config before
              execution. If any limit is breached, the trade is rejected onchain.
            </li>
            <li>
              <strong>Withdraw anytime:</strong> your funds are always yours. Performance fees (15% of
              profit above the high-water mark) are deducted only on withdrawal.
            </li>
          </ol>
        </div>
      </Section>

      <Section id="copy-vault" heading="SiroCopyVault Smart Contract">
        <p>
          The vault contract is fully non-custodial. The AI keeper can execute swaps on your behalf, but
          it <strong>cannot transfer, approve, or withdraw</strong> funds to external addresses. Only you
          can withdraw.
        </p>
        <pre className="p-4 bg-soft rounded-[8px] text-[12px] font-mono overflow-x-auto">
{`// Create a vault with initial deposit and leaders
function createVault(
    address[] calldata leaders,  // 1–5 leaders to follow
    uint256 amount               // deposit amount
) external payable;

// AI keeper executes trades through whitelisted routers
function executeSwap(
    address vaultOwner,
    address router,     // must be whitelisted
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    bytes calldata swapData
) external;  // onlyKeeper`}
        </pre>
        <p>
          The contract runs in two modes: <strong>native mode</strong> on Arc (USDC as native currency,
          18 decimals) and <strong>ERC-20 mode</strong> on Robinhood Chain (USDG, 6 decimals, pulled with{" "}
          <code>transferFrom</code>).
        </p>
      </Section>

      <Section id="risk-guard" heading="SiroRiskGuard: Your Safety Net">
        <p>Every trade passes through RiskGuard before execution. You configure four parameters:</p>
        <ul>
          <li>
            <strong>Max Trade Size</strong>  maximum single trade as a percentage of your vault (default 10%).
          </li>
          <li>
            <strong>Daily Loss Limit</strong>  maximum cumulative daily loss (default 5%).
          </li>
          <li>
            <strong>Max Position Per Token</strong>  maximum exposure to any single token (default 25%).
          </li>
          <li>
            <strong>Slippage Tolerance</strong>  maximum allowed slippage per swap (default 1%).
          </li>
        </ul>
        <p>
          Additionally, you can maintain a <strong>token whitelist</strong> (only approved tokens can be
          traded) and activate a <strong>kill switch</strong> to freeze all trading instantly.
        </p>
      </Section>

      <Section id="leaderboard" heading="Onchain Leaderboard">
        <p>
          Anyone can register as a leader on the <code>SiroLeaderboard</code> contract. Performance metrics
           cumulative PnL, Sharpe ratio, max drawdown, trade count, and follower count  are updated
          onchain by authorized updaters as trades settle.
        </p>
        <p>
          Leaders earn a share of performance fees: when a follower&rsquo;s vault generates profit and they
          withdraw, 10% of the profit is distributed evenly among the leaders they follow.
        </p>
      </Section>

      <Section id="fees" heading="Fee Structure">
        <p>Siro charges a <strong>15% performance fee</strong> on profit above the high-water mark:</p>
        <ul>
          <li>
            <strong>10%</strong> goes to the leaders the vault follows (split evenly).
          </li>
          <li>
            <strong>5%</strong> goes to the Siro protocol.
          </li>
        </ul>
        <p>
          Fees are only charged on <em>actual profit</em>. If your vault balance is at or below the
          high-water mark, no fee is charged. The high-water mark adjusts proportionally on partial
          withdrawals and resets on full withdrawal.
        </p>
      </Section>

      <Section id="networks" heading="Supported Networks">
        <p>Siro&rsquo;s contracts can be deployed on multiple EVM-compatible networks:</p>
        <ul>
          <li>
            <strong>Arc (Chain 5042):</strong> native USDC mode  vault deposits and gas are both in USDC.
            Sub-cent transactions.
          </li>
          <li>
            <strong>Robinhood Chain (Chain 4663):</strong> ERC-20 mode  vault deposits in USDG, gas in ETH.
          </li>
        </ul>
        <p>
          Each vault lives on the network it was created on. The dashboard automatically detects your wallet&rsquo;s
          network and shows the correct vault.
        </p>
      </Section>

      <Section id="using-the-dashboard" heading="Using the Dashboard">
        <p>
          Open the <Link href="/app">Copy Vault Dashboard</Link> to create a vault, deposit funds,
          choose leaders, configure risk settings, and monitor your copied trades.
        </p>
      </Section>
    </ProsePage>
  );
}
