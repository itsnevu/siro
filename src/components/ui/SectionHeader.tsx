export function SectionHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mb-8">
      {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">{eyebrow}</p>}
      <h2 className="text-3xl font-semibold tracking-tight text-ink [&>em]:font-serif [&>em]:not-italic [&>em]:text-accent">{title}</h2>
      {subtitle && <p className="mt-2 max-w-2xl text-base text-fg-70">{subtitle}</p>}
    </div>
  );
}
