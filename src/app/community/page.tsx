import type { Metadata } from "next";
import { ProsePage } from "@/components/ProsePage";
import { LINKS, X_HANDLE } from "@/lib/links";

export const metadata: Metadata = {
  title: "Community | Siro",
  description: "Siro's one official social account, and what is not official.",
};

export default function CommunityPage() {
  return (
    <ProsePage eyebrow="Community" title="One official account" lede="Siro's only official social account is on X. There is no official Discord or Telegram, and no ambassador program or rewards pool.">
      <p>Official: <a href={LINKS.x} rel="noopener noreferrer">{X_HANDLE}</a>.</p>
      <p>Any other channel, account or ambassador offer that claims to be Siro is not official until it is listed on this page. Siro will never ask for a seed phrase, a private key or a deposit to join anything.</p>
      <p>To report a vulnerability, use the process in SECURITY.md in the repository.</p>
    </ProsePage>
  );
}
