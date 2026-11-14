import type { Metadata } from "next";
import { ProsePage } from "@/components/ProsePage";

export const metadata: Metadata = {
  title: "Referral | Siro",
  description: "There is no referral program.",
};

export default function ReferralPage() {
  return (
    <ProsePage eyebrow="Referral · PLANNED" title="No referral program" lede="Siro has no referral program, referral links, token rewards or fee sharing for referrals.">
      <p>Earlier versions of this page offered SIRO rewards and a fee share per referral. No system or contract implements that, and no SIRO token exists. Nothing earned through a link claiming to be a Siro referral is real.</p>
    </ProsePage>
  );
}
