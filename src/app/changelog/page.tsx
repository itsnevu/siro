import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import { ProsePage } from "@/components/ProsePage";

export const metadata: Metadata = {
  title: "Changelog | Siro",
  description: "Release notes from the repository CHANGELOG.md.",
};
export const dynamic = "force-dynamic";

// Rendered from the repository file so the page cannot drift from the reviewed changelog.
export default function ChangelogPage() {
  let text: string | null = null;
  try { text = fs.readFileSync(path.join(/* turbopackIgnore: true */ process.cwd(), "CHANGELOG.md"), "utf8"); } catch { text = null; }
  return (
    <ProsePage eyebrow="Changelog" title="Changelog" lede="Rendered from CHANGELOG.md in the repository, including metric changes.">
      {text ? <pre style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6 }}>{text}</pre> : <p>CHANGELOG.md is not available in this deployment.</p>}
    </ProsePage>
  );
}
