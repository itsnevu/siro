import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/styles/effects.css";
import "@/styles/editorial.css";
import "@/styles/palette.css";
import "@/styles/wide-layout.css";
import "@/styles/cinematic.css";
import { Providers } from "@/components/Providers";
import Effects from "@/components/Effects";
import { SITE_URL } from "@/lib/links";
import { ToneController } from "@/components/editorial/ToneController";
import { ResponsiveTables } from "@/components/editorial/ResponsiveTables";
import { ColorMode } from "@/components/editorial/ColorMode";
import { brandPalette } from "@/lib/brand-palette";

export const viewport:Viewport={themeColor:brandPalette().bg};

const TITLE = "Siro | Agentic Investing on Tokenized Stocks";
const DESCRIPTION =
  "Copy top traders into non-custodial vaults with AI agents on Robinhood Chain. Tokenized stocks, onchain risk guards, and $SIRO utility token.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s" },
  description: DESCRIPTION,
  applicationName: "Siro",
  keywords: [
    "agentic investing",
    "tokenized stocks",
    "AI trading agent",
    "non-custodial vault",
    "onchain risk guard",
    "Robinhood Chain",
    "$SIRO token",
    "autonomous portfolio",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Siro",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@1&family=Hedvig+Letters+Serif&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <Effects />
        <ToneController />
        <ResponsiveTables />
        <ColorMode />
      </body>
    </html>
  );
}
