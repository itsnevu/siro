import type { ReactNode } from "react";
import { CinematicBackground } from "./CinematicBackground";

type Props = {
  headline: ReactNode;
  subtitle?: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  visual?: ReactNode;
};

export function CTABand({ headline, subtitle, primaryLabel, primaryHref, secondaryLabel, secondaryHref, visual }: Props) {
  return (
    <section data-tone="dark" className={`bg-bg text-fg ${visual ? "pt-12 pb-24 md:pt-16 md:pb-36" : "py-24 md:py-40"} cinematic-section`}>
      <CinematicBackground variant="night" />
      <div className="site-container text-center">
        {visual}
        <h2 className="serif-headline text-[44px] md:text-[72px] mb-6">{headline}</h2>
        {subtitle && <p className="text-[var(--fg-70)] text-lg mb-10 max-w-xl mx-auto">{subtitle}</p>}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a
            href={primaryHref}
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            {primaryLabel}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
          {secondaryLabel && secondaryHref && (
            <a
              href={secondaryHref}
              className="btn-secondary inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors"
            >
              {secondaryLabel}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
