import { ImageResponse } from "next/og";
import { brandPalette, brandLogoData } from "@/lib/brand-palette";

export const alt = "Siro  Agentic Investing on Tokenized Stocks.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social card for Siro. */
export default async function Image() {
  const palette=brandPalette();
  const markSrc=brandLogoData().data;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: palette.bg,
          color: palette.fg,
          padding: "78px 82px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" src={markSrc} width={52} height={52} />
          <div style={{ fontSize: 42, letterSpacing: -1 }}>siro.</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, letterSpacing: -2 }}>
            Agentic Investing on Tokenized Stocks.
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.4,
              color: palette.fg70,
              maxWidth: 920,
              fontFamily: "Helvetica, sans-serif",
            }}
          >
            Copy top traders into non-custodial vaults with AI agents. On Elysium.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: palette.fg70,
            fontFamily: "Helvetica, sans-serif",
          }}
        >
          <span>Non-custodial · 15% performance fee on profit only</span>
          <span>siro.trade</span>
        </div>
      </div>
    ),
    size,
  );
}
