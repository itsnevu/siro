import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Siro — Copy Top Onchain Traders Automatically.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social card for Siro. */
export default async function Image() {
  const mark = await readFile(join(process.cwd(), "public/brand/S-transparent.png"));
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#E9F9F4",
          color: "#043D32",
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
            Copy Top Onchain Traders.
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.4,
              color: "#3d7a68",
              maxWidth: 920,
              fontFamily: "Helvetica, sans-serif",
            }}
          >
            Mirror real trader portfolios with AI-powered copy vaults. Non-custodial, risk-managed.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#5a7d6a",
            fontFamily: "Helvetica, sans-serif",
          }}
        >
          <span>15% performance fee only on profit · Non-custodial</span>
          <span>siro.trade</span>
        </div>
      </div>
    ),
    size,
  );
}
