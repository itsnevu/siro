import type { Metadata } from "next";
import "./globals.css";
import "@/styles/effects.css";
import "@/styles/editorial.css";
import { Providers } from "@/components/Providers";
import Effects from "@/components/Effects";
import { SITE_URL } from "@/lib/links";
import { ToneController } from "@/components/editorial/ToneController";
import { ResponsiveTables } from "@/components/editorial/ResponsiveTables";

const TITLE = "Siro | Copy Top Onchain Traders Automatically";
const DESCRIPTION =
  "Mirror real trader portfolios with verified onchain track records. AI agent copies trades into your non-custodial vault within your risk limits.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s" },
  description: DESCRIPTION,
  applicationName: "Siro",
  keywords: [
    "copy trading",
    "onchain portfolio",
    "AI trading agent",
    "non-custodial vault",
    "leaderboard",
    "smart money",
    "portfolio mirror",
    "DeFi copy trade",
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
    <html lang="en" className="h-full">
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
      </body>
    </html>
  );
}
