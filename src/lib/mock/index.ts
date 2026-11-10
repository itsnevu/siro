export type Strategy = {
  id: string;
  name: string;
  type: "momentum" | "mean-reversion" | "macro" | "quant" | "sector";
  risk: "low" | "medium" | "high";
  status: "live" | "paused" | "new";
  cagr: number;
  maxDrawdown: number;
  sharpe: number;
  aum: number;
  creator: string;
  creatorAddress: string;
  followers: number;
  description: string;
  allocation: { token: string; pct: number }[];
  rules: string[];
  fees: { performance: number; management: number };
  sparkline: number[];
};

export type Market = {
  ticker: string;
  name: string;
  price: number;
  change24h: number;
  volume: number;
  liquidity: number;
  marketCap: number;
  sector: string;
  issuer: string;
};

export type BuybackRun = {
  id: number;
  date: string;
  siroSpent: number;
  siroBurned: number;
  avgPrice: number;
  txHash: string;
  feeTier: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
};

export type RoadmapItem = {
  quarter: string;
  title: string;
  description: string;
  status: "done" | "in-progress" | "planned";
};

export type TeamMember = {
  name: string;
  role: string;
  bio: string;
};

export type FaqItem = {
  q: string;
  a: string;
};

export type ChangelogEntry = {
  date: string;
  version: string;
  title: string;
  items: string[];
};

export const strategies: Strategy[] = [
  {
    id: "alpha-momentum",
    name: "Alpha Momentum",
    type: "momentum",
    risk: "high",
    status: "live",
    cagr: 47.2,
    maxDrawdown: -18.4,
    sharpe: 2.1,
    aum: 2_450_000,
    creator: "0xTrader",
    creatorAddress: "0x1234567890abcdef1234567890abcdef12345678",
    followers: 342,
    description: "Trend-following strategy focusing on tokenized US equities with strong momentum signals.",
    allocation: [
      { token: "tAAPL", pct: 25 },
      { token: "tNVDA", pct: 20 },
      { token: "tTSLA", pct: 15 },
      { token: "tMSFT", pct: 15 },
      { token: "USDC", pct: 25 },
    ],
    rules: ["Max 25% per position", "Stop-loss at -8%", "Rebalance weekly", "No leverage"],
    fees: { performance: 15, management: 0 },
    sparkline: [100, 105, 103, 110, 115, 112, 120, 125, 128, 135, 132, 140],
  },
  {
    id: "steady-yield",
    name: "Steady Yield",
    type: "mean-reversion",
    risk: "low",
    status: "live",
    cagr: 18.6,
    maxDrawdown: -6.2,
    sharpe: 3.4,
    aum: 5_120_000,
    creator: "VaultMaster",
    creatorAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
    followers: 891,
    description: "Conservative mean-reversion strategy with tight risk controls and stable returns.",
    allocation: [
      { token: "tSPY", pct: 30 },
      { token: "tQQQ", pct: 20 },
      { token: "tBND", pct: 20 },
      { token: "USDC", pct: 30 },
    ],
    rules: ["Max 30% per position", "Stop-loss at -4%", "Daily rebalance", "Drawdown pause at -5%"],
    fees: { performance: 15, management: 0 },
    sparkline: [100, 101, 103, 102, 104, 106, 105, 107, 108, 109, 110, 112],
  },
  {
    id: "tech-macro",
    name: "Tech Macro",
    type: "macro",
    risk: "medium",
    status: "live",
    cagr: 32.1,
    maxDrawdown: -12.8,
    sharpe: 2.6,
    aum: 3_800_000,
    creator: "MacroAlpha",
    creatorAddress: "0x9876543210fedcba9876543210fedcba98765432",
    followers: 567,
    description: "Macro-driven allocation across tech equities and safe-haven assets.",
    allocation: [
      { token: "tAAPL", pct: 20 },
      { token: "tGOOG", pct: 20 },
      { token: "tAMZN", pct: 15 },
      { token: "tMETA", pct: 15 },
      { token: "USDC", pct: 30 },
    ],
    rules: ["Max 20% per position", "Stop-loss at -6%", "Weekly rebalance", "Macro overlay triggers"],
    fees: { performance: 15, management: 0 },
    sparkline: [100, 98, 102, 108, 106, 112, 115, 118, 122, 120, 126, 130],
  },
  {
    id: "sector-rotation",
    name: "Sector Rotation",
    type: "sector",
    risk: "medium",
    status: "new",
    cagr: 28.5,
    maxDrawdown: -14.1,
    sharpe: 1.9,
    aum: 890_000,
    creator: "RotateCapital",
    creatorAddress: "0xfedcba9876543210fedcba9876543210fedcba98",
    followers: 123,
    description: "Rotates across market sectors based on relative strength and economic cycle signals.",
    allocation: [
      { token: "tXLK", pct: 25 },
      { token: "tXLF", pct: 20 },
      { token: "tXLE", pct: 15 },
      { token: "tXLV", pct: 15 },
      { token: "USDC", pct: 25 },
    ],
    rules: ["Sector ranking monthly", "Max 25% per sector", "Cash above 20% in downtrends"],
    fees: { performance: 15, management: 0 },
    sparkline: [100, 102, 99, 104, 107, 105, 110, 108, 113, 116, 119, 122],
  },
  {
    id: "quant-arb",
    name: "Quant Arbitrage",
    type: "quant",
    risk: "low",
    status: "live",
    cagr: 14.2,
    maxDrawdown: -3.1,
    sharpe: 4.2,
    aum: 8_200_000,
    creator: "DeltaNeutral",
    creatorAddress: "0x1111222233334444555566667777888899990000",
    followers: 1_204,
    description: "Market-neutral statistical arbitrage across correlated tokenized pairs.",
    allocation: [
      { token: "tAAPL", pct: 15 },
      { token: "tMSFT", pct: 15 },
      { token: "tGOOG", pct: 10 },
      { token: "tAMZN", pct: 10 },
      { token: "USDC", pct: 50 },
    ],
    rules: ["Pair correlation > 0.8", "Max exposure 50%", "Delta neutral target", "Hourly rebalance"],
    fees: { performance: 15, management: 0 },
    sparkline: [100, 101, 101, 102, 102, 103, 103, 104, 104, 105, 105, 106],
  },
];

export const markets: Market[] = [
  { ticker: "tAAPL", name: "Apple Inc.", price: 198.50, change24h: 1.24, volume: 12_400_000, liquidity: 45_000_000, marketCap: 3_080_000_000_000, sector: "Technology", issuer: "Elysium Markets" },
  { ticker: "tNVDA", name: "NVIDIA Corp.", price: 142.80, change24h: 3.56, volume: 18_900_000, liquidity: 38_000_000, marketCap: 3_500_000_000_000, sector: "Technology", issuer: "Elysium Markets" },
  { ticker: "tTSLA", name: "Tesla Inc.", price: 245.20, change24h: -2.18, volume: 22_100_000, liquidity: 28_000_000, marketCap: 780_000_000_000, sector: "Consumer", issuer: "Elysium Markets" },
  { ticker: "tMSFT", name: "Microsoft Corp.", price: 428.90, change24h: 0.87, volume: 8_200_000, liquidity: 52_000_000, marketCap: 3_200_000_000_000, sector: "Technology", issuer: "Elysium Markets" },
  { ticker: "tGOOG", name: "Alphabet Inc.", price: 176.30, change24h: -0.42, volume: 6_500_000, liquidity: 35_000_000, marketCap: 2_180_000_000_000, sector: "Technology", issuer: "Elysium Markets" },
  { ticker: "tAMZN", name: "Amazon.com Inc.", price: 192.40, change24h: 1.95, volume: 9_800_000, liquidity: 42_000_000, marketCap: 2_020_000_000_000, sector: "Consumer", issuer: "Elysium Markets" },
  { ticker: "tMETA", name: "Meta Platforms", price: 535.60, change24h: 0.33, volume: 7_100_000, liquidity: 30_000_000, marketCap: 1_370_000_000_000, sector: "Technology", issuer: "Elysium Markets" },
  { ticker: "tSPY", name: "S&P 500 ETF", price: 582.10, change24h: 0.56, volume: 32_000_000, liquidity: 120_000_000, marketCap: 540_000_000_000, sector: "Index", issuer: "Elysium Markets" },
  { ticker: "tQQQ", name: "Nasdaq-100 ETF", price: 498.70, change24h: 1.12, volume: 28_000_000, liquidity: 95_000_000, marketCap: 280_000_000_000, sector: "Index", issuer: "Elysium Markets" },
  { ticker: "tJPM", name: "JPMorgan Chase", price: 218.40, change24h: -0.91, volume: 4_200_000, liquidity: 18_000_000, marketCap: 620_000_000_000, sector: "Financials", issuer: "Elysium Markets" },
];

export const buybackRuns: BuybackRun[] = [
  { id: 1, date: "2026-11-01", siroSpent: 45_000, siroBurned: 42_500, avgPrice: 1.058, txHash: "0xabc123...def456", feeTier: "10%" },
  { id: 2, date: "2026-10-15", siroSpent: 38_200, siroBurned: 36_100, avgPrice: 1.058, txHash: "0x789abc...123def", feeTier: "10%" },
  { id: 3, date: "2026-10-01", siroSpent: 52_800, siroBurned: 50_100, avgPrice: 1.054, txHash: "0xdef789...abc123", feeTier: "10%" },
  { id: 4, date: "2026-09-15", siroSpent: 31_500, siroBurned: 29_800, avgPrice: 1.057, txHash: "0x456def...789abc", feeTier: "10%" },
  { id: 5, date: "2026-09-01", siroSpent: 61_200, siroBurned: 58_000, avgPrice: 1.055, txHash: "0x123456...abcdef", feeTier: "10%" },
];

export const blogPosts: BlogPost[] = [
  { slug: "introducing-siro", title: "Introducing Siro: Capital Follows Intelligence", date: "2026-10-15", excerpt: "Today we launch Siro  an agentic investment platform for tokenized stocks on Elysium." },
  { slug: "copy-trading-explained", title: "How Copy Trading Works on Siro", date: "2026-10-22", excerpt: "A deep dive into non-custodial copy vaults, AI-filtered execution, and risk management." },
  { slug: "siro-token-utility", title: "$SIRO Token: Useful, Not Required", date: "2026-11-01", excerpt: "Understanding the utility of $SIRO  fee discounts, agent credits, and buyback mechanics." },
];

export const roadmapItems: RoadmapItem[] = [
  { quarter: "Q4 2026", title: "Testnet Launch", description: "Copy vaults, leaderboard, and basic agent execution on Elysium testnet.", status: "done" },
  { quarter: "Q1 2027", title: "Mainnet Beta", description: "Production deployment with audited contracts, RainbowKit integration, and $SIRO staking.", status: "in-progress" },
  { quarter: "Q2 2027", title: "Strategy Studio", description: "Visual strategy builder, backtesting engine, and custom rule creation.", status: "planned" },
  { quarter: "Q3 2027", title: "x402 Micropayments", description: "HTTP 402 agent payments for premium data feeds and cross-platform strategy licensing.", status: "planned" },
];

export const teamMembers: TeamMember[] = [
  { name: "Core Team", role: "Engineering", bio: "Building the future of agentic finance on Elysium." },
];

export const faqItems: FaqItem[] = [
  { q: "What is Siro?", a: "Siro is an agentic investment platform for tokenized stocks on Elysium. Copy top traders, run AI agents, or build your own strategies." },
  { q: "Is $SIRO required to use the platform?", a: "No. $SIRO is useful but not required. You can copy trade and use basic features without holding any $SIRO." },
  { q: "How are fees structured?", a: "15% performance fee on profit only (10% to leaders, 5% to protocol). No management fees. No fees when you lose money." },
  { q: "Is it non-custodial?", a: "Yes. Your funds stay in your own vault. The keeper (AI agent) can only swap tokens through whitelisted DEX routers  it can never withdraw." },
  { q: "What chain does Siro run on?", a: "Siro runs on Elysium, Kinetiq's L2 on Arbitrum Orbit. Gas is paid in HYPE." },
];

export const platformStats = {
  totalAum: 20_460_000,
  totalStrategies: 47,
  totalFollowers: 3_127,
  totalVolume: 128_500_000,
  totalBurned: 216_500,
  burnPct: 2.16,
  buybackRuns: 5,
};

export const changelogEntries: ChangelogEntry[] = [
  { date: "2026-11-05", version: "0.4.0", title: "Market pages & token page", items: ["Added /markets with search & filter", "Added /token utility page", "Buyback receipts table"] },
  { date: "2026-10-28", version: "0.3.0", title: "Strategy marketplace", items: ["Strategy leaderboard with sparklines", "Strategy detail pages", "Risk badges"] },
  { date: "2026-10-15", version: "0.2.0", title: "Copy vaults", items: ["Non-custodial vault architecture", "AI keeper execution", "RiskGuard integration"] },
];
