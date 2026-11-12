/**
 * Single source for the project's name and every tunable number.
 * Rename the project by changing PROJECT.name / PROJECT.ticker here; nothing else hardcodes it.
 */

export const PROJECT = {
  name: "VAULTA",
  ticker: "VAULTA",
  tickerDisplay: "$VAULTA",
  category: "AI trading-agent infrastructure for tokenized US stocks and crypto",
  oneLiner:
    "Guarded trading agents for tokenized stocks — every decision proven onchain, every dollar protected by rules the agent cannot break.",
  taglines: [
    "Agents that can't go rogue.",
    "Your strategy. Our guard. Onchain proof.",
    "Trade like a desk. Sleep like a vault.",
  ],
  mission:
    "Make autonomous trading agents safe enough to trust with real money, and honest enough that nobody can fake a track record.",
  disclaimer: "Not investment advice. Tokenized stocks not available to US persons or sanctioned jurisdictions.",
} as const;

/** $VAULTA token. Fixed supply, no mint function. */
export const TOKENOMICS = {
  totalSupply: 1_000_000_000n,
  decimals: 18,
} as const;

export const BPS = 10_000;

/**
 * Fee defaults. The contracts take these as constructor arguments, so changing a number here and
 * redeploying is all it takes. Values marked ASSUMPTION were not in the spec and need sign-off.
 */
export const FEES = {
  /** Charged only on share price above the vault's high-water mark. */
  performanceFeeBps: 1_000,
  split: {
    creatorBps: 5_000,
    computeFundBps: 2_000,
    buybackBurnBps: 3_000,
  },
  /** ASSUMPTION: share of the USDG seed taken when an agent token launches. Split like every other fee. */
  agentTokenLaunchFeeBps: 100,
  /** ASSUMPTION: maximum execution loss BuybackBurn accepts against the 30-minute TWAP. */
  buybackMaxSlippageBps: 100,
} as const;

/** Guard parameters enforced by GuardedVault. */
export const GUARD = {
  /** Unpausing, loosening limits and adding tokens or routers all wait this long. */
  timelockSeconds: 24 * 60 * 60,
  /** Hard ceilings baked into the vault bytecode. Owners can only choose values at or below these. */
  maxSlippageBpsCeiling: 500,
  maxDrawdownBpsCeiling: 5_000,
  maxPerformanceFeeBpsCeiling: 3_000,
  maxTrackedTokens: 16,
} as const;

export const PROOF = {
  /** One Merkle root per agent per hour. */
  epochSeconds: 3_600,
  /** 24 consecutive hourly commits earn one verified day. A missed hour resets the streak. */
  epochsPerVerifiedDay: 24,
  /** A commit for hour H is accepted during hour H and hour H+1, never later. */
  commitGraceEpochs: 1,
} as const;

export const LAUNCHPAD = {
  minVerifiedDays: 14,
  agentTokenSupply: 1_000_000_000n,
  agentTokenDecimals: 18,
  /** ASSUMPTION: smallest USDG seed (6 decimals) accepted for an agent-token launch. */
  minSeedUsdg: 500_000_000n,
} as const;

export const BACKTEST = {
  days: 30,
  /** Fee plus slippage charged on every simulated trade, in percent. */
  costPerTradePct: 0.5,
} as const;

export const ARENA = {
  seasonDays: 7,
} as const;

/** Trade actions as they are encoded in a decision leaf. */
export const ACTION = {
  HOLD: 0,
  BUY: 1,
  SELL: 2,
} as const;

export type ActionName = keyof typeof ACTION;
export type ActionCode = (typeof ACTION)[ActionName];
