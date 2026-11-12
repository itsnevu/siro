export function CTABand({ heading, sub, children }: { heading: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-bg px-8 py-12 text-center text-fg md:px-16">
      <h2 className="text-2xl font-semibold md:text-3xl">{heading}</h2>
      {sub && <p className="mx-auto mt-3 max-w-xl text-base text-fg/70">{sub}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div>
    </section>
  );
}
