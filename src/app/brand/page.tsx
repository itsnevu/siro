import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Brand | Siro",
  description: "Siro brand assets, colors, and usage guidelines.",
};

const COLORS = [
  { name: "Page Background", hex: "#dce5d8", var: "--page-bg" },
  { name: "Surface", hex: "#e8eee5", var: "--surface" },
  { name: "Card", hex: "#f3f6f1", var: "--card" },
  { name: "Foreground", hex: "#102a24", var: "--fg" },
  { name: "Muted", hex: "#5d6f68", var: "--muted" },
  { name: "Faint", hex: "#a9b8b0", var: "--faint" },
  { name: "Accent Soft", hex: "#b9cfa8", var: "--accent-soft" },
  { name: "Cream", hex: "#eef2ea", var: "--cream" },
];

export default function BrandPage() {
  return (
    <main className="site-container py-24 md:py-40">
      <span className="eyebrow block mb-4">Brand</span>
      <h1 className="serif-headline text-[44px] md:text-[84px] mb-6">
        Brand assets
      </h1>
      <p className="text-muted text-lg max-w-2xl mb-16">
        Use these assets when referencing Siro. Please do not modify, distort, or recolor the logo.
      </p>

      <section className="mb-24">
        <h2 className="serif-headline text-[36px] md:text-[48px] mb-8">Logo</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-[28px] p-12 flex items-center justify-center">
            <div className="flex items-center gap-4">
              <Image src="/brand/S-transparent.png" alt="Siro mark" width={64} height={64} />
              <span className="font-serif text-[48px] tracking-tight">siro.</span>
            </div>
          </div>
          <div className="bg-[#102a24] rounded-[28px] p-12 flex items-center justify-center">
            <div className="flex items-center gap-4">
              <Image src="/brand/S-transparent.png" alt="Siro mark" width={64} height={64} className="brightness-200 invert" />
              <span className="font-serif text-[48px] tracking-tight text-[#eef2ea]">siro.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-24">
        <h2 className="serif-headline text-[36px] md:text-[48px] mb-8">Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {COLORS.map((c) => (
            <div key={c.var} className="bg-card rounded-xl overflow-hidden">
              <div className="h-20 rounded-t-xl" style={{ backgroundColor: c.hex }} />
              <div className="p-4">
                <div className="text-sm font-medium mb-1">{c.name}</div>
                <div className="mono-meta">{c.hex}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-24">
        <h2 className="serif-headline text-[36px] md:text-[48px] mb-8">Typography</h2>
        <div className="space-y-6">
          <div className="bg-card rounded-xl p-8">
            <div className="text-sm text-muted mb-2">Headlines</div>
            <div className="font-serif text-[48px] leading-tight">Hedvig Letters Serif</div>
          </div>
          <div className="bg-card rounded-xl p-8">
            <div className="text-sm text-muted mb-2">Body / UI</div>
            <div className="text-[24px]">Instrument Sans</div>
          </div>
          <div className="bg-card rounded-xl p-8">
            <div className="text-sm text-muted mb-2">Data / Meta</div>
            <div className="font-mono text-[24px]">ui-monospace</div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="serif-headline text-[36px] md:text-[48px] mb-8">Usage guidelines</h2>
        <div className="space-y-4 text-[15px] text-muted max-w-2xl">
          <p>Do not stretch, rotate, or recolor the Siro logo.</p>
          <p>Maintain clear space around the logo equal to the height of the &ldquo;S&rdquo; mark.</p>
          <p>Do not place the logo on busy backgrounds without a container.</p>
          <p>Use the dark variant on light backgrounds and the light variant on dark backgrounds.</p>
        </div>
      </section>
    </main>
  );
}
