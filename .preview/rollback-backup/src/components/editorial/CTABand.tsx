import type { ReactNode } from "react";

type Props = {
  headline: ReactNode;
  subtitle?: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export function CTABand({ headline, subtitle, primaryLabel, primaryHref, secondaryLabel, secondaryHref }: Props) {
  return (
    <section data-tone="dark" className="bg-[#102a24] text-[#eef2ea] py-24 md:py-40">
      <div className="site-container text-center">
        <h2 className="serif-headline text-[44px] md:text-[72px] mb-6">{headline}</h2>
        {subtitle && <p className="text-[#a9b8b0] text-lg mb-10 max-w-xl mx-auto">{subtitle}</p>}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a
            href={primaryHref}
            className="inline-flex items-center gap-2 bg-[#eef2ea] text-[#102a24] px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            {primaryLabel}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
          {secondaryLabel && secondaryHref && (
            <a
              href={secondaryHref}
              className="inline-flex items-center gap-2 border border-[rgba(238,242,234,0.2)] text-[#eef2ea] px-6 py-3 rounded-xl font-medium hover:bg-[rgba(238,242,234,0.05)] transition-colors"
            >
              {secondaryLabel}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
