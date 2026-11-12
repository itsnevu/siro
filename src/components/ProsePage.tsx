import Link from "next/link";
import type { ReactNode } from "react";
import "@/styles/siro.css";
import "@/styles/prose.css";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LINKS } from "@/lib/links";

/** A section that also earns an entry in the table of contents. */
export type TocEntry = { id: string; heading: string };

/**
 * Shell for every long-form page. It carries the site's own header and footer so
 * a reader arriving from the landing page never lands somewhere that looks like
 * a different product.
 */
export function ProsePage({
  eyebrow,
  title,
  lede,
  meta,
  toc,
  numbered,
  children,
  footNote,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  /** Small facts under the title: a date, a reading time, a version. */
  meta?: string[];
  /** When given, a sticky contents rail appears alongside the prose. */
  toc?: TocEntry[];
  /** Number the sections, for a document that refers to them by number. */
  numbered?: boolean;
  children: ReactNode;
  footNote?: ReactNode;
}) {
  return (
    <>
      <div className="rusd-shell p2p-app-shell editorial-site">
        <Header />
        <main className="rusd-frame rusd-main siro-doc" data-tone="light" id="main-content" tabIndex={-1}>
          <header className="siro-doc-head">
            {eyebrow && <p className="siro-doc-eyebrow">{eyebrow}</p>}
            <h1>{title}</h1>
            {lede && <p className="siro-doc-lede">{lede}</p>}
            {meta && meta.length > 0 && (
              <p className="siro-doc-meta">
                {meta.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </p>
            )}
          </header>

          <div className="siro-doc-body" data-toc={toc && toc.length > 0 ? "true" : "false"}>
            {toc && toc.length > 0 && (
              <nav className="siro-doc-toc" aria-label="On this page">
                <p>On this page</p>
                {toc.map((t) => (
                  <a key={t.id} href={`#${t.id}`}>
                    {t.heading}
                  </a>
                ))}
              </nav>
            )}
            <div className="blog-prose" data-numbered={numbered ? "true" : "false"}>
              {children}
            </div>
          </div>

          <div className="siro-doc-foot">
            <span>{footNote ?? "Siro is in open beta. Start with small amounts."}</span>
            <span className="siro-doc-next">
              <Link className="rusd-text-link" href={LINKS.docs}>
                Docs
              </Link>
              <Link className="rusd-text-link" href={LINKS.whitepaper}>
                Whitepaper
              </Link>
              <Link className="rusd-text-link" href={LINKS.risk}>
                Risk
              </Link>
              <Link className="rusd-text-link" href={LINKS.app}>
                Open the app
              </Link>
            </span>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}

/** A titled section inside a ProsePage. `id` anchors it for the contents rail. */
export function Section({ id, heading, children }: { id?: string; heading: string; children: ReactNode }) {
  return (
    <section id={id}>
      <h2>{heading}</h2>
      {children}
    </section>
  );
}

/** A pulled-out consequence or limit. Used sparingly, for the thing a reader must not miss. */
export function Note({ children }: { children: ReactNode }) {
  return <p className="siro-note">{children}</p>;
}

