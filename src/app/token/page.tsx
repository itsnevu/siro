import type { Metadata } from "next";
import { ProsePage } from "@/components/ProsePage";

export const metadata: Metadata = {
  title: "Token | Siro",
  description: "Status of the SIRO token: planned, not deployed.",
};

export default function TokenPage() {
  return (
    <ProsePage eyebrow="Token · PLANNED" title="No SIRO token exists" lede="There is no SIRO token contract in this repository and none is deployed. Holder tiers, fee discounts, AI credits and staking boosts are not available.">
      <h2>What exists in code today</h2>
      <p>Per-agent tokens: an agent creator can mint one fixed-supply ERC-20 for their agent. It is not connected to fees, vaults or agent results.</p>
      <p>A buyback-and-burn contract and a fee splitter (15% of realised profit above the high-water mark: 10% to the strategy creator, 5% to the protocol). Neither is connected to a SIRO token.</p>
      <h2>What a token would not be</h2>
      <p>Not equity, not a dividend, not a claim on protocol revenue, and holding it would not change any agent&apos;s decisions or results. If protocol fees are ever used for buybacks, that links its market price to revenue economically, even without any legal claim.</p>
      <p>Details and open questions are in the repository under docs/token.md.</p>
    </ProsePage>
  );
}
