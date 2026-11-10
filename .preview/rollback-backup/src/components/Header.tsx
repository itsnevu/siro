import Link from "next/link";
import { HeaderNavigation } from "@/components/HeaderNavigation";
import { LINKS } from "@/lib/links";

/** The Siro mark. Used by the /app shell. */
export function PyrisMark({ size = 30 }: { size?: number }) {
  return <img alt="" aria-hidden="true" height={size} width={size} src="/brand/S-transparent.png" style={{ display: "block" }} />;
}

export function Banner() {
  return (
    <aside className="turret-beta-notice" aria-label="Open beta notice">
      <p>
        <strong>Siro is in open beta.</strong> AI-powered copy trading vaults.
      </p>
    </aside>
  );
}

export function Header() {
  return (
    <header className="rusd-topbar">
      <a href="#main-content" className="ed-skip-link">Skip to content</a>
      <div className="rusd-frame rusd-topbar-inner rusd-topbar-preview">
        <Link aria-label="Siro home" className="rusd-brand-link" href="/">
          <span aria-label="Siro" className="dockyard-logo" role="img" style={{ height: 36 }}>
            <span aria-hidden="true" className="dockyard-logo-mark-frame" style={{ height: 36, width: 36 }}>
              <img alt="" className="dockyard-logo-mark" height={36} width={36} src="/brand/S-transparent.png" />
            </span>
            <span className="dockyard-logo-wordmark" style={{ fontSize: "23.76px" }}>
              siro.
            </span>
          </span>
        </Link>

        <HeaderNavigation />

        <div className="rusd-account">
          {LINKS.x && (
            <a href={LINKS.x} aria-label="X (Twitter)" className="header-x-link" target="_blank" rel="noopener noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
          )}
          <Link href={LINKS.app} className="dockyard-wallet-button">
            Launch app
          </Link>
        </div>
      </div>
    </header>
  );
}
