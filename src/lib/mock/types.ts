export interface Strategy {
  id: string;
  name: string;
  description: string;
  creator: string;
  creatorAddress: string;
  type: "buy-hold" | "dca" | "fixed-weight" | "rebalance" | "momentum";
  riskLevel: "low" | "moderate" | "high";
  status: "backtested" | "paper" | "live";
  cagr: number;
  maxDrawdown: number;
  sharpe: number;
  aum: number;
  followers: number;
  returns30d: number;
  returns90d: number;
  sparklineData: number[];
  assets: { ticker: string; weight: number }[];
  createdAt: string;
}

export interface Market {
  ticker: string;
  name: string;
  issuer: string;
  price: number;
  change24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  sector: string;
}

export interface BuybackRun {
  id: string;
  date: string;
  feesClaimed: number;
  amountSpent: number;
  avgPrice: number;
  tokensBurned: number;
  txHash: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readingMin: number;
  coverImage: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: "shipped" | "in-progress" | "planned";
  quarter: string;
  category: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string;
  twitter?: string;
  linkedin?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: "general" | "wallet" | "strategies" | "agent" | "token" | "fees" | "safety";
}

export interface PlatformStats {
  totalUsers: number;
  totalStrategies: number;
  backtestsRun: number;
  totalVolume: number;
  tvl: number;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}
