import type { Metadata } from "next";
import { changelogEntries } from "@/lib/mock";

export const metadata: Metadata = {
  title: "Changelog | Siro",
  description: "What's new in Siro. Release notes and version history.",
};

export default function ChangelogPage() {
  return (
    <main className="site-container py-24 md:py-40 max-w-3xl mx-auto">
      <span className="eyebrow block mb-4">Changelog</span>
      <h1 className="serif-headline text-[44px] md:text-[84px] mb-16">
        What&apos;s new
      </h1>

      <div className="space-y-16">
        {changelogEntries.map((entry) => (
          <article key={entry.version} className="relative pl-8 border-l-2 border-line">
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-fg" />
            <div className="flex items-center gap-3 mb-4">
              <span className="pill-badge font-mono">{entry.version}</span>
              <span className="mono-meta">{entry.date}</span>
            </div>
            <h2 className="font-serif text-2xl mb-4">{entry.title}</h2>
            <ul className="space-y-2">
              {entry.items.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-muted text-[15px]">
                  <span className="text-accent mt-0.5 shrink-0">+</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </main>
  );
}
