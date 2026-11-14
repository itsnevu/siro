import type { Metadata } from "next";
import { ProsePage } from "@/components/ProsePage";

export const metadata: Metadata = {
  title: "Tokenomics | Siro",
  description: "No token supply, allocation or vesting has been decided.",
};

export default function TokenomicsPage() {
  return (
    <ProsePage eyebrow="Tokenomics · PLANNED" title="No allocation has been decided" lede="There is no SIRO token, so there is no supply, allocation, vesting schedule, treasury or governance to describe.">
      <p>Earlier versions of this page showed allocation percentages and vesting terms. They were placeholders, not decisions, and have been removed.</p>
      <p>Any future allocation will be published together with the deployed contract address, so the numbers can be checked on chain instead of read from this page.</p>
    </ProsePage>
  );
}
