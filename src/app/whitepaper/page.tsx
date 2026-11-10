import Link from "next/link";
import { ProsePage, Section, Note } from "@/components/ProsePage";

export const metadata = {
  title: "Whitepaper  Siro",
  description:
    "Siro Whitepaper: AI-Powered Copy Trading Vaults. Contract specification, risk management, fee model, and onchain leaderboard.",
};

const TOC = [
  { id: "abstract", heading: "Abstract" },
  { id: "problem", heading: "The Problem in DeFi Trading" },
  { id: "core-pillars", heading: "Core Pillars: AI Copy Trading" },
  { id: "architecture", heading: "Smart Contract Architecture" },
  { id: "risk-management", heading: "RiskGuard: Onchain Risk Management" },
  { id: "leaderboard", heading: "Onchain Leaderboard" },
  { id: "fee-model", heading: "Fee Model" },
  { id: "networks", heading: "Networks & Deployment Modes" },
  { id: "case-study", heading: "Reference Case: Passive DeFi Investor" },
  { id: "security", heading: "Security & Non-Custodial Invariants" },
  { id: "conclusion", heading: "Conclusion & Protocol Status" },
];

export default function Page() {
  return (
    <ProsePage
      eyebrow="Whitepaper · v1.0"
      title="AI-Powered Copy Trading Vaults"
      lede="A non-custodial protocol for mirroring top DeFi traders automatically, with onchain risk management and performance-based fee distribution."
      meta={["Version 1.0", "November 2026", "~11 min read"]}
      toc={TOC}
      numbered
      footNote="Technical specification of SiroCopyVault.sol, SiroRiskGuard.sol, and SiroLeaderboard.sol."
    >
      <Section id="abstract" heading="Abstract">
        <p>
          <strong>Siro</strong> is a non-custodial copy trading protocol that lets users deposit stablecoins
          into personal vaults and have an AI keeper agent replicate trades from top-performing leaders. Every
          trade is validated onchain by the RiskGuard contract against user-configured risk parameters.
        </p>
        <p>
          The protocol supports multiple EVM-compatible networks with sub-cent gas costs and stablecoin settlement.
          It removes the opacity of centralized copy trading platforms and the custody risk of fund managers.
        </p>
      </Section>

      <Section id="problem" heading="The Problem in DeFi Trading">
        <p>
          Individual DeFi traders face structural disadvantages:
        </p>
        <ul>
          <li>
            <strong>Information asymmetry:</strong> top traders have superior market analysis, tooling, and
            execution speed that retail users cannot replicate manually.
          </li>
          <li>
            <strong>Custody risk:</strong> centralized copy trading platforms hold user funds in omnibus
            wallets, creating counterparty risk and opaque fee structures.
          </li>
          <li>
            <strong>No risk controls:</strong> most copy trading services offer limited or no per-user
            risk management  users either follow 100% or not at all.
          </li>
        </ul>
      </Section>

      <Section id="core-pillars" heading="Core Pillars: AI Copy Trading">
        <p>Siro rests on four foundations:</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong>Non-custodial vaults:</strong> funds are held by the smart contract in personal vaults,
            not in a shared pool or intermediary&rsquo;s wallet.
          </li>
          <li>
            <strong>AI keeper execution:</strong> an AI agent monitors leader activity and executes trades
            through whitelisted DEX routers, scaled proportionally to vault size.
          </li>
          <li>
            <strong>Onchain risk management:</strong> every trade is validated against user-configured
            parameters (max trade size, daily loss limit, position cap, slippage tolerance).
          </li>
          <li>
            <strong>Performance-based fees:</strong> leaders earn only from follower profit, aligning
            incentives between leaders and followers.
          </li>
        </ol>
      </Section>

      <Section id="architecture" heading="Smart Contract Architecture">
        <p>
          The protocol consists of three contracts. <code>SiroCopyVault.sol</code> holds user deposits and
          executes swaps:
        </p>
        <pre className="p-4 bg-soft rounded-[8px] text-[12px] font-mono overflow-x-auto">
{`struct Vault {
    uint256 deposited;
    uint256 highWaterMark;
    uint256 totalWithdrawn;
    uint256 totalFeePaid;
    address[] leaders;       // up to 5
    bool paused;
    uint256 createdAt;
}

// Key functions:
function createVault(address[] calldata leaders, uint256 amount) external payable;
function deposit(uint256 amount) external payable;
function withdraw(uint256 amount) external;
function executeSwap(address vaultOwner, address router, ...) external; // onlyKeeper`}
        </pre>
        <Note>
          Contract invariant: the keeper can execute trades through whitelisted routers but <strong>cannot
          transfer, approve, or withdraw</strong> funds to external addresses. Only the vault owner can withdraw.
        </Note>
      </Section>

      <Section id="risk-management" heading="RiskGuard: Onchain Risk Management">
        <p>
          <code>SiroRiskGuard.sol</code> validates every trade before execution. Each user configures four
          parameters:
        </p>
        <pre className="p-4 bg-soft rounded-[8px] text-[12px] font-mono overflow-x-auto">
{`struct RiskConfig {
    uint16 maxTradeSizeBps;        // max single trade as % of vault (default 10%)
    uint16 dailyLossLimitBps;      // max daily loss as % of vault (default 5%)
    uint16 maxPositionPerTokenBps; // max per-token exposure (default 25%)
    uint16 slippageToleranceBps;   // max slippage per swap (default 1%)
    bool   killSwitch;             // instantly freeze all trading
}`}
        </pre>
        <p>
          Additionally, users can maintain a token whitelist (only approved tokens can be traded). The kill
          switch freezes all trading instantly and can be activated at any time without a cooldown.
        </p>
      </Section>

      <Section id="leaderboard" heading="Onchain Leaderboard">
        <p>
          <code>SiroLeaderboard.sol</code> tracks leader performance metrics onchain. Anyone can register as
          a leader with a display name. Authorized updaters post performance stats as trades settle:
        </p>
        <ul>
          <li><strong>Total PnL</strong>  cumulative profit/loss in basis points.</li>
          <li><strong>Sharpe Score</strong>  risk-adjusted return (scaled by 100).</li>
          <li><strong>Max Drawdown</strong>  largest peak-to-trough decline in bps.</li>
          <li><strong>Follower Count</strong>  number of active vaults following.</li>
          <li><strong>Trade Volume</strong>  cumulative trade volume.</li>
        </ul>
      </Section>

      <Section id="fee-model" heading="Fee Model">
        <p>Siro uses a high-water mark performance fee model:</p>
        <ul>
          <li>
            <strong>15% performance fee</strong> on profit above the high-water mark, charged on withdrawal.
          </li>
          <li>
            <strong>10% to leaders:</strong> split evenly among the leaders the vault follows.
          </li>
          <li>
            <strong>5% to protocol:</strong> collected by the Siro protocol treasury.
          </li>
        </ul>
        <p>
          The high-water mark adjusts upward on deposits (so new capital isn&rsquo;t taxed) and proportionally
          downward on partial withdrawals. No fee is charged if the vault balance is at or below the high-water mark.
        </p>
      </Section>

      <Section id="networks" heading="Networks & Deployment Modes">
        <p>
          The contracts support two deployment modes based on the constructor argument:
        </p>
        <pre className="p-4 bg-soft rounded-[8px] text-[12px] font-mono overflow-x-auto">
{`constructor(address _usdcToken)  // address(0) = native mode, else ERC-20 mode`}
        </pre>
        <p>
          <strong>Native mode (Arc, Chain 5042):</strong> USDC is the native gas currency. Deposits and gas
          are both in USDC. Sub-cent per transaction.
        </p>
        <p>
          <strong>ERC-20 mode (Robinhood Chain, Chain 4663):</strong> vault deposits in USDG (6 decimals),
          gas in ETH. Adds one approval step for the depositor.
        </p>
        <p>
          Deployments are independent: vault data, events, and fee accounting never cross networks.
        </p>
      </Section>

      <Section id="case-study" heading="Reference Case: Passive DeFi Investor">
        <p>A passive investor wants DeFi exposure without active trading:</p>
        <ol className="list-decimal pl-5 space-y-1 text-[13.5px]">
          <li>
            <strong>Create vault:</strong> deposits $10,000 USDC and selects 3 top-performing leaders.
          </li>
          <li>
            <strong>Configure risk:</strong> sets max trade size to 5%, daily loss limit to 3%, and
            activates a token whitelist for blue-chip assets only.
          </li>
          <li>
            <strong>AI mirrors trades:</strong> the keeper copies leader trades proportionally, validated
            by RiskGuard before each execution.
          </li>
          <li>
            <strong>Profit grows:</strong> after 90 days, the vault balance is $12,400  a $2,400 profit.
          </li>
          <li>
            <strong>Withdrawal:</strong> on withdrawal, 15% of the $2,400 profit ($360) is collected as
            fees  $240 to the 3 leaders ($80 each), $120 to the protocol.
          </li>
        </ol>
      </Section>

      <Section id="security" heading="Security & Non-Custodial Invariants">
        <p>The protocol enforces strict non-custodial invariants:</p>
        <ul>
          <li>Only the vault owner can withdraw funds.</li>
          <li>The keeper can only swap through whitelisted DEX routers.</li>
          <li>Every trade must pass RiskGuard validation.</li>
          <li>The kill switch freezes all trading instantly.</li>
          <li>The protocol owner cannot access user funds.</li>
        </ul>
        <p>
          Reentrancy protection is applied to all state-changing functions. Fee calculations use checked
          arithmetic and are bounded by the high-water mark.
        </p>
      </Section>

      <Section id="conclusion" heading="Conclusion & Protocol Status">
        <p>
          Siro brings institutional-grade copy trading to DeFi with non-custodial vaults, onchain risk
          management, and performance-aligned fee distribution. The contracts are deployed and source-verified
          on supported networks.
        </p>
        <p>
          Open the <Link href="/app">Copy Vault Dashboard</Link> or read the{" "}
          <Link href="/docs">Siro documentation</Link>.
        </p>
      </Section>
    </ProsePage>
  );
}
