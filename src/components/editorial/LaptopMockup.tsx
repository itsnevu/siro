/* eslint-disable @next/next/no-img-element */
"use client";

const C = {
  bg: "#0A0B12",
  surface: "#191B27",
  text: "#F4F2EE",
  muted: "rgba(244,242,238,0.56)",
  mint: "#8FE3B0",
  purple: "#A597FF",
  pink: "#EEB2CB",
  peach: "#F3CDB0",
};

const tickers = [
  { name: "AAPL", pct: 20, color: C.purple, bar: 100 },
  { name: "MSFT", pct: 20, color: C.pink, bar: 100 },
  { name: "GOOGL", pct: 20, color: C.peach, bar: 100 },
  { name: "AMZN", pct: 20, color: C.mint, bar: 100 },
  { name: "NVDA", pct: 20, color: "#F4F2EE", bar: 100 },
];

export function LaptopMockup() {
  return (
    <div style={{ width: "100%", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ position: "relative", transformStyle: "preserve-3d" }}>
        {/* Screen bezel */}
        <div
          style={{
            aspectRatio: "1000 / 640",
            padding: "1.8%",
            borderRadius: "clamp(12px, 2.4vw, 30px)",
            background: "linear-gradient(130deg, #b7b4bd, #474550 40%, #918e99)",
            boxShadow:
              "inset 1px 2px 1px rgba(255,255,255,.8), 5px 8px 0 #4c4956, 0 18px 25px rgba(27,22,32,.2), 0 55px 95px rgba(27,22,32,.2)",
          }}
        >
          {/* Screen content */}
          <div
            style={{
              height: "100%",
              borderRadius: "clamp(8px, 1.4vw, 18px)",
              background: C.bg,
              color: C.text,
              overflow: "hidden",
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Notch */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "43%",
                width: "14%",
                height: "3.4%",
                borderRadius: "0 0 9px 9px",
                background: "#15131b",
              }}
            />
            {/* Top bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6.2% 5.6% 3.7%",
              }}
            >
              <img
                src="/brand/mark?palette=ascendlaunch"
                alt=""
                width="28"
                height="28"
                style={{ width: "4.4%", height: "auto" }}
                draggable={false}
              />
              <span style={{ fontSize: "clamp(8px, 1.4vw, 18px)", color: C.muted }}>
                Agent Studio
              </span>
              <span style={{ fontSize: "clamp(7px, 1.2vw, 16px)", color: C.mint }}>
                ● Paper mode
              </span>
            </div>
            {/* Body */}
            <div
              style={{
                display: "flex",
                gap: "4.5%",
                padding: "3.7% 6.2%",
                flex: 1,
              }}
            >
              {/* Left: title + allocation ring */}
              <div style={{ width: "38%" }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(14px, 2.8vw, 37px)",
                    letterSpacing: -1,
                    marginBottom: "8%",
                  }}
                >
                  Blue Chip Hold
                </div>
                {/* Allocation ring */}
                <svg viewBox="0 0 200 200" style={{ width: "100%" }}>
                  <circle cx="100" cy="100" r="80" fill="none" stroke={C.surface} strokeWidth="18" />
                  {[C.purple, C.pink, C.peach, C.mint, "#F4F2EE"].map((color, i) => (
                    <circle
                      key={color}
                      cx="100" cy="100" r="80" fill="none"
                      stroke={color} strokeWidth="18"
                      strokeDasharray={`${100 - 4} ${503 - 100 + 4}`}
                      strokeDashoffset={`${-i * 100.5}`}
                      strokeLinecap="round"
                      transform="rotate(-90 100 100)"
                    />
                  ))}
                  <image
                    href="/brand/mark?palette=ascendlaunch"
                    x="68" y="68" width="64" height="64"
                  />
                </svg>
                <div
                  style={{
                    fontSize: "clamp(7px, 1.2vw, 16px)",
                    color: C.muted,
                    textAlign: "center",
                    marginTop: "6%",
                  }}
                >
                  Target allocation
                </div>
              </div>
              {/* Right: tickers */}
              <div style={{ flex: 1, paddingTop: "2%" }}>
                <div
                  style={{
                    fontSize: "clamp(8px, 1.4vw, 18px)",
                    color: C.muted,
                    marginBottom: "8%",
                  }}
                >
                  Equal-weight · 5 assets
                </div>
                {tickers.map((t) => (
                  <div
                    key={t.name}
                    style={{
                      padding: "5% 6%",
                      marginBottom: "4%",
                      borderRadius: "clamp(6px, 1.1vw, 14px)",
                      background: C.surface,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "clamp(10px, 1.8vw, 23px)",
                      }}
                    >
                      <span>{t.name}</span>
                      <span style={{ color: t.color }}>{t.pct}%</span>
                    </div>
                    <div
                      style={{
                        height: "clamp(2px, 0.4vw, 5px)",
                        borderRadius: 5,
                        marginTop: "5%",
                        background: "rgba(255,255,255,.06)",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 5,
                          width: `${t.bar}%`,
                          background: t.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    fontSize: "clamp(8px, 1.3vw, 17px)",
                    color: C.mint,
                    marginTop: "7%",
                  }}
                >
                  ✓ All limits passed · Ready to deploy
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Keyboard base */}
        <div
          style={{
            position: "relative",
            left: "-6.5%",
            width: "113%",
            height: "clamp(16px, 3vw, 38px)",
            borderRadius: "3px 3px 45px 45px",
            background: "linear-gradient(#e1dee5, #9995a3 35%, #5f5a6b)",
            boxShadow: "0 8px 5px rgba(27,22,32,.2), 0 35px 45px rgba(27,22,32,.18)",
            transform: "rotateX(28deg)",
            transformOrigin: "center top",
          }}
        >
          <div
            style={{
              margin: "0 auto",
              width: "17%",
              height: "32%",
              borderRadius: "0 0 16px 16px",
              background: "#827d8d",
            }}
          />
        </div>
      </div>
    </div>
  );
}
