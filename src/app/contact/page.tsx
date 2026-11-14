import type { Metadata } from "next";
import { ProsePage } from "@/components/ProsePage";
import { LINKS, X_HANDLE } from "@/lib/links";

export const metadata: Metadata = {
  title: "Contact | Siro",
  description: "How to reach Siro.",
};

export default function ContactPage() {
  return (
    <ProsePage eyebrow="Contact" title="Contact" lede="There is no contact form. Write by email.">
      <h2>General</h2>
      <p><a href="mailto:support@usesiro.xyz">support@usesiro.xyz</a></p>
      <h2>Security</h2>
      <p><a href="mailto:security@usesiro.xyz">security@usesiro.xyz</a>. For vulnerabilities, prefer a private GitHub security advisory as described in SECURITY.md.</p>
      <h2>Social</h2>
      <p>The only official social account is <a href={LINKS.x} rel="noopener noreferrer">{X_HANDLE}</a>. Other accounts claiming to be Siro are not official.</p>
    </ProsePage>
  );
}
