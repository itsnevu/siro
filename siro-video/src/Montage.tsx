import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
} from "remotion";
import { C, F } from "./theme";
import { Brand, Logo, clamp } from "./components/Siro";
import { Soundtrack } from "./components/Soundtrack";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { DepthTransition } from "./components/DepthTransition";

const pop = (f: number, d = 0) =>
  spring({
    frame: f - d,
    fps: 30,
    config: { damping: 22, stiffness: 180, mass: 0.75 },
  });
const ramp = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], clamp);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const light = C.cream;
const Stage: React.FC<
  React.PropsWithChildren<{ dark?: boolean; purple?: boolean }>
> = ({ children, dark = false, purple = false }) => (
  <AbsoluteFill
    style={{
      background: dark ? C.bg : purple ? C.purple : light,
      color: dark ? C.text : C.ink,
      fontFamily: F.sans,
      overflow: "hidden",
    }}
  >
    {children}
  </AbsoluteFill>
);

const Coin = ({
  size = 400,
  rotation = 0,
}: {
  size?: number;
  rotation?: number;
}) => (
  <div
    style={{
      position: "relative",
      width: size,
      height: size,
      transform: `perspective(1800px) rotateY(${rotation}deg) rotateZ(-16deg)`,
      transformStyle: "preserve-3d",
    }}
  >
    {[12, 8, 4, 0].map((z) => (
      <div
        key={z}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          transform: `translateZ(${-z}px)`,
          background: z ? "#7566B5" : C.gradient,
          border: "2px solid rgba(244,242,238,.25)",
          boxShadow:
            z === 0
              ? "inset 8px 12px 18px rgba(244,242,238,.22),inset -9px -12px 22px rgba(27,22,32,.2),0 35px 75px rgba(10,11,18,.25)"
              : undefined,
          display: "grid",
          placeItems: "center",
          backfaceVisibility: z === 0 ? "hidden" : "visible",
        }}
      >
        {z === 0 ? (
          <div style={{ filter: "brightness(0)", opacity: 0.84 }}>
            <Logo size={size * 0.5} />
          </div>
        ) : null}
      </div>
    ))}
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        transform: "translateZ(-14px) rotateY(180deg)",
        backfaceVisibility: "hidden",
        background: C.gradient,
        border: "2px solid rgba(244,242,238,.25)",
        display: "grid",
        placeItems: "center",
        boxShadow: "inset 8px 12px 18px rgba(244,242,238,.22)",
      }}
    >
      <div style={{ filter: "brightness(0)", opacity: 0.84 }}>
        <Logo size={size * 0.5} />
      </div>
    </div>
  </div>
);

const Allocation = ({
  progress = 1,
  size = 250,
}: {
  progress?: number;
  size?: number;
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: `conic-gradient(${C.purple} 0deg ${144 * progress}deg,${C.pink} ${144 * progress}deg ${270 * progress}deg,${C.peach} ${270 * progress}deg ${360 * progress}deg,${C.surface} ${360 * progress}deg)`,
      padding: 18,
      boxSizing: "border-box",
    }}
  >
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        background: C.bg,
        display: "grid",
        placeItems: "center",
      }}
    >
      <Logo size={size * 0.3} />
    </div>
  </div>
);

const Phone: React.FC<
  React.PropsWithChildren<{ style?: React.CSSProperties }>
> = ({ children, style }) => (
  <div
    style={{
      width: 480,
      height: 930,
      boxSizing: "border-box",
      borderRadius: 68,
      padding: 13,
      background:
        "linear-gradient(140deg,#676570,#0A0B12 35%,#4c4b55 80%,#0A0B12)",
      boxShadow: "15px 30px 65px rgba(10,11,18,.2)",
      position: "relative",
      transformStyle: "preserve-3d",
      ...style,
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 68,
        background: "#34333f",
        transform: "translateZ(-14px)",
        boxShadow: "8px 7px 0 #22212b,10px 9px 0 #11121b",
      }}
    />
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 55,
        overflow: "hidden",
        position: "relative",
        background: C.bg,
        color: C.text,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 18,
          left: "50%",
          translate: "-50% 0",
          width: 130,
          height: 32,
          borderRadius: 99,
          background: "#000",
          zIndex: 10,
        }}
      />
      {children}
    </div>
  </div>
);

const Portfolio = ({
  f = 100,
  interactive = false,
}: {
  f?: number;
  interactive?: boolean;
}) => (
  <div style={{ padding: "80px 30px 30px" }}>
    <Brand size={30} />
    <div
      style={{
        fontFamily: F.display,
        fontSize: 36,
        letterSpacing: -1,
        marginTop: 35,
      }}
    >
      Tech Balance
    </div>
    <div style={{ fontSize: 15, color: C.muted, marginTop: 10 }}>
      Paper mode
    </div>
    <div
      style={{ display: "flex", justifyContent: "center", margin: "35px 0" }}
    >
      <Allocation size={280} progress={Math.min(pop(f, 8), 1)} />
    </div>
    {["NVDA", "AAPL", "TSLA"].map((t, i) => (
      <div
        key={t}
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "23px 12px",
          borderRadius: 8,
          background:
            interactive && f > 28 && i === 0
              ? "rgba(165,151,255,.12)"
              : undefined,
          borderBottom: `1px solid ${C.line}`,
          fontSize: 22,
        }}
      >
        <span>{t}</span>
        <span style={{ color: [C.purple, C.pink, C.peach][i] }}>
          {[40, 35, 25][i]}%
        </span>
      </div>
    ))}
    {interactive && f >= 22 && f < 44 ? (
      <div
        style={{
          position: "absolute",
          left: 332,
          top: 589,
          width: 58,
          height: 58,
          borderRadius: "50%",
          border: `2px solid ${C.purple}`,
          background: "rgba(165,151,255,.12)",
          scale: lerp(0.4, 1.5, ramp(f, 22, 44)),
          opacity: 1 - ramp(f, 22, 44),
          pointerEvents: "none",
        }}
      />
    ) : null}
  </div>
);

const Notification = () => (
  <div
    style={{
      padding: "26px 30px",
      borderRadius: 26,
      background:
        "linear-gradient(120deg,rgba(244,242,238,.95),rgba(233,225,214,.91))",
      color: C.ink,
      display: "flex",
      alignItems: "center",
      gap: 24,
      boxShadow: "0 15px 45px rgba(0,0,0,.15)",
    }}
  >
    <div
      style={{
        background: C.gradient,
        width: 76,
        height: 76,
        borderRadius: 20,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      <div style={{ filter: "brightness(0)", opacity: 0.85 }}>
        <Logo size={42} />
      </div>
    </div>
    <div>
      <div style={{ fontWeight: 600, fontSize: 25 }}>
        Siro{" "}
        <span style={{ fontWeight: 400, fontSize: 19, opacity: 0.5 }}>
          {" "}
          · Paper mode
        </span>
      </div>
      <div style={{ fontSize: 25, marginTop: 8 }}>
        Strategy ready for review.
      </div>
    </div>
    <div
      style={{
        marginLeft: "auto",
        fontSize: 17,
        opacity: 0.5,
        alignSelf: "flex-start",
      }}
    >
      Now
    </div>
  </div>
);

const Toss = () => {
  const f = useCurrentFrame(),
    flight = ramp(f, 22, 48);
  return (
    <Stage dark>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center,rgba(165,151,255,.13),transparent 62%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          translate: "-50% -50%",
          scale: lerp(0.85, 5.6, flight ** 2),
          rotate: `${lerp(-12, 4, flight)}deg`,
          filter: `blur(${Math.max(0, flight - 0.7) * 6}px)`,
        }}
      >
        <Coin size={380} rotation={lerp(-22, 348, flight)} />
      </div>
    </Stage>
  );
};
const Catch = () => {
  const f = useCurrentFrame(),
    land = pop(f, 2);
  return (
    <Stage>
      <div
        style={{
          position: "absolute",
          left: 720,
          top: 75,
          translate: `0 ${lerp(160, 0, pop(f, 4))}px`,
          rotate: `${lerp(4, 0, pop(f, 4))}deg`,
          transform: `perspective(1800px) rotateY(${lerp(-22, 6, pop(f, 4)) + Math.sin(f / 24) * 2}deg) rotateX(${lerp(8, -2, pop(f, 4))}deg)`,
        }}
      >
        <Phone>
          <Portfolio f={f} />
        </Phone>
      </div>
      <div
        style={{
          position: "absolute",
          left: 960,
          top: lerp(540, 590, Math.min(land, 1)),
          translate: "-50% -50%",
          scale: lerp(5.0, 0.7, land),
          rotate: `${lerp(4, 0, land)}deg`,
          opacity: 1 - ramp(f, 35, 49),
        }}
      >
        <Coin size={400} rotation={lerp(348, 360, land)} />
      </div>
    </Stage>
  );
};
const NotificationMacro = () => {
  const f = useCurrentFrame();
  return (
    <Stage purple>
      <div
        style={{
          position: "absolute",
          left: 800,
          top: 180,
          width: 320,
          height: 240,
          display: "grid",
          placeItems: "center",
          opacity: 0.14,
          scale: 1 + f * 0.001,
        }}
      >
        <div style={{ filter: "brightness(0)" }}>
          <Logo size={220} />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 320,
          top: 465,
          width: 1280,
          scale: lerp(0.94, 1, pop(f)),
          translate: `0 ${lerp(55, 0, pop(f))}px`,
          transform: `perspective(1800px) rotateX(${lerp(-22, 3, pop(f))}deg) rotateY(${Math.sin(f / 30) * 3}deg) translateZ(35px)`,
        }}
      >
        <div
          style={{
            padding: "35px 45px",
            borderRadius: 28,
            background: C.gradient,
            color: C.ink,
            display: "flex",
            alignItems: "center",
            gap: 30,
            boxShadow: "0 25px 65px rgba(10,11,18,.15)",
          }}
        >
          <span style={{ fontSize: 56 }}>✓</span>
          <span style={{ fontSize: 43 }}>Policy checked.</span>
          <span style={{ marginLeft: "auto", fontSize: 25 }}>
            Within your limits
          </span>
        </div>
      </div>
    </Stage>
  );
};
const TypeCut = () => {
  const f = useCurrentFrame();
  return (
    <Stage>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
          fontFamily: F.display,
          fontSize: 148,
          letterSpacing: -7,
          scale: lerp(0.96, 1, pop(f)),
        }}
      >
        Your{" "}
        <span
          style={{ fontFamily: F.italic, fontStyle: "italic", color: C.ink }}
        >
          rules.
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 650,
          top: 715,
          width: 620,
          height: 5,
          borderRadius: 9,
          background: C.gradient,
          scale: `${pop(f, 4)} 1`,
        }}
      />
    </Stage>
  );
};
const AssetBurst = () => {
  const f = useCurrentFrame();
  return (
    <Stage dark>
      {[
        "NVDA · 40%",
        "AAPL · 35%",
        "TSLA · 25%",
        "Policy checked",
        "Paper mode",
        "Ready for review",
      ].map((s, i) => {
        const d = pop(f, 5 + i * 2);
        return (
          <div
            key={s}
            style={{
              position: "absolute",
              left: i < 3 ? 290 : 1630,
              top: 350 + (i % 3) * 185,
              translate: `calc(-50% + ${lerp(i < 3 ? -65 : 65, 0, d)}px) -50%`,
              width: 280,
              height: 78,
              borderRadius: 20,
              border: `1px solid ${C.line}`,
              background: C.surface,
              color: C.text,
              display: "grid",
              placeItems: "center",
              fontSize: 26,
              opacity: ramp(f, 3 + i * 2, 12 + i * 2),
              transform: `perspective(1400px) rotateY(${(i < 3 ? 12 : -12) + Math.sin(f / 25 + i) * 2}deg) rotateX(4deg)`,
              boxShadow: "0 18px 35px rgba(0,0,0,.2)",
            }}
          >
            {s}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 960,
          top: 540,
          translate: "-50% -50%",
          width: 670,
          boxSizing: "border-box",
          padding: 55,
          borderRadius: 34,
          background: C.gradient,
          color: C.ink,
          boxShadow: "0 35px 70px rgba(0,0,0,.3)",
          scale: lerp(0.92, 1, pop(f)),
          transform: `perspective(1500px) rotateY(${lerp(-20, -5, pop(f)) + Math.sin(f / 32) * 2}deg) rotateX(${lerp(10, 3, pop(f))}deg)`,
        }}
      >
        <Brand size={38} />
        <div
          style={{
            fontFamily: F.display,
            fontSize: 76,
            marginTop: 40,
            letterSpacing: -4,
          }}
        >
          Tech Balance
        </div>
        <div style={{ marginTop: 25, fontSize: 23 }}>
          Your idea, structured.
        </div>
      </div>
    </Stage>
  );
};
const Dial = () => {
  const f = useCurrentFrame();
  return (
    <Stage>
      <div
        style={{
          position: "absolute",
          left: 1080,
          top: 75,
          scale: lerp(1.025, 1, pop(f)),
          translate: `0 ${lerp(45, 0, pop(f))}px`,
          transform: `perspective(1800px) rotateY(${lerp(22, -7, pop(f)) + Math.sin(f / 28) * 2}deg) rotateX(2deg)`,
        }}
      >
        <Phone>
          <Portfolio f={f} interactive />
        </Phone>
      </div>
      <div
        style={{
          position: "absolute",
          left: 240,
          top: 380,
          fontFamily: F.display,
          fontSize: 86,
          lineHeight: 1.12,
          letterSpacing: -4,
          opacity: ramp(f, 9, 20),
        }}
      >
        Built
        <br />
        around you.
      </div>
    </Stage>
  );
};
const GuardMacro = () => {
  const f = useCurrentFrame();
  return (
    <Stage dark>
      <div
        style={{
          position: "absolute",
          left: 260,
          top: 210,
          fontFamily: F.display,
          fontSize: 100,
          letterSpacing: -4,
        }}
      >
        Always{" "}
        <span
          style={{ fontFamily: F.italic, fontStyle: "italic", color: C.purple }}
        >
          within limits.
        </span>
      </div>
      <div style={{ position: "absolute", left: 260, top: 430, width: 1400 }}>
        {[
          ["Trade cap", "$500"],
          ["Max drawdown", "8%"],
        ].map(([a, b], i) => (
          <div
            key={a}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "36px 45px",
              background: i ? C.gradient : C.surface,
              color: i ? C.ink : C.text,
              borderRadius: 22,
              marginBottom: 24,
              fontSize: 44,
              translate: `0 ${lerp(45, 0, pop(f, i * 5))}px`,
              opacity: ramp(f, i * 5, i * 5 + 8),
              boxShadow: "0 20px 50px rgba(0,0,0,.2)",
              transform: `perspective(1800px) rotateX(${lerp(-15, 2, pop(f, i * 5))}deg) rotateY(${(i ? 1 : -1) * 3}deg)`,
            }}
          >
            <span>{a}</span>
            <span style={{ display: "flex", gap: 32, alignItems: "center" }}>
              {b}
              <span style={{ color: i ? C.ink : C.mint }}>✓</span>
            </span>
          </div>
        ))}
      </div>
    </Stage>
  );
};
const PhoneNotification = () => {
  const f = useCurrentFrame();
  return (
    <Stage>
      <div
        style={{
          position: "absolute",
          left: 210,
          top: 330,
          fontFamily: F.display,
          fontSize: 84,
          lineHeight: 1.12,
          letterSpacing: -4,
        }}
      >
        Ready for
        <br />
        your review.
      </div>
      <div
        style={{
          position: "absolute",
          left: 1120,
          top: 75,
          transform: `perspective(1800px) rotateY(${lerp(-22, 7, pop(f)) + Math.sin(f / 26) * 2}deg) rotateX(-2deg)`,
          translate: `0 ${lerp(45, 0, pop(f))}px`,
        }}
      >
        <Phone>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(145deg,#191B27,#0A0B12 65%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 155,
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: 76,
              letterSpacing: -3,
            }}
          >
            09:41
          </div>
          <div
            style={{
              position: "absolute",
              top: 265,
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: 19,
              color: C.muted,
            }}
          >
            Your next move, on your terms.
          </div>
          <div
            style={{ position: "absolute", top: 420, left: 127, opacity: 0.18 }}
          >
            <Logo size={200} />
          </div>
        </Phone>
      </div>
      <div
        style={{
          position: "absolute",
          left: 580,
          top: 705,
          width: 1070,
          scale: lerp(0.94, 1, pop(f, 6)),
          translate: `0 ${lerp(45, 0, pop(f, 6))}px`,
          opacity: ramp(f, 5, 13),
          transform: `perspective(1800px) translateZ(45px) rotateX(${lerp(18, -2, pop(f, 6))}deg) rotateY(-3deg)`,
        }}
      >
        <Notification />
      </div>
    </Stage>
  );
};
const Collage = () => {
  const f = useCurrentFrame();
  return (
    <Stage>
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 304 + (i % 3) * 456,
            top: 108 + Math.floor(i / 3) * 464,
            translate: `0 ${Math.sin(f / 40 + i) * 8}px`,
            width: 400,
            height: 400,
            borderRadius: "50%",
            overflow: "hidden",
            background: i === 1 ? C.gradient : C.bg,
            color: C.text,
            scale: lerp(0.9, 1, pop(f, i * 2)),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `perspective(1500px) rotateY(${Math.sin(f / 32 + i) * 7}deg) rotateX(${Math.cos(f / 36 + i) * 4}deg)`,
            boxShadow: `${Math.sin(f / 32 + i) * 8}px 16px 30px rgba(10,11,18,.12)`,
          }}
        >
          {i === 0 ? (
            <Allocation size={280} />
          ) : i === 1 ? (
            <div style={{ filter: "brightness(0)", opacity: 0.85 }}>
              <Logo size={190} />
            </div>
          ) : i === 2 ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 42, color: C.mint }}>✓</div>
              <div
                style={{ fontFamily: F.display, fontSize: 36, marginTop: 20 }}
              >
                Ready for
                <br />
                review.
              </div>
            </div>
          ) : i === 3 ? (
            <div style={{ width: 235 }}>
              {["NVDA", "AAPL", "TSLA"].map((t, j) => (
                <div
                  key={t}
                  style={{
                    fontSize: 26,
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "20px 0",
                    borderBottom: `1px solid ${C.line}`,
                  }}
                >
                  <span>{t}</span>
                  <span style={{ color: [C.purple, C.pink, C.peach][j] }}>
                    {[40, 35, 25][j]}%
                  </span>
                </div>
              ))}
            </div>
          ) : i === 4 ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, color: C.muted }}>Trade cap</div>
              <div
                style={{ fontFamily: F.display, fontSize: 76, marginTop: 18 }}
              >
                $500
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, color: C.mint }}>● Paper mode</div>
              <div
                style={{ fontFamily: F.display, fontSize: 38, marginTop: 28 }}
              >
                Your rules.
                <br />
                Always.
              </div>
            </div>
          )}
        </div>
      ))}
    </Stage>
  );
};
const MotionCut = () => {
  const f = useCurrentFrame();
  return (
    <Stage purple>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: F.italic,
          fontStyle: "italic",
          fontSize: 170,
          letterSpacing: -5,
          scale: lerp(1.2, 1, pop(f)),
        }}
      >
        In motion.
      </div>
    </Stage>
  );
};
const End = () => {
  const f = useCurrentFrame();
  return (
    <Stage dark>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          scale: lerp(0.9, 1, pop(f)),
        }}
      >
        <Brand size={160} />
      </div>
    </Stage>
  );
};

export const Montage = () => (
  <AbsoluteFill style={{ background: C.bg, perspective: 1800 }}>
    <TransitionSeries>
      <TransitionSeries.Sequence
        name="01 / Toss into lens"
        durationInFrames={48}
      >
        <Toss />
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence
        name="02 / Match cut into phone"
        durationInFrames={69}
      >
        <Catch />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={{
          component: DepthTransition,
          props: { mode: "turn", direction: 1 },
        }}
        timing={linearTiming({
          durationInFrames: 12,
          easing: Easing.bezier(0.65, 0, 0.35, 1),
        })}
      />
      <TransitionSeries.Sequence
        name="03 / Policy notification macro"
        durationInFrames={55}
      >
        <NotificationMacro />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={{ component: DepthTransition, props: { mode: "focus" } }}
        timing={linearTiming({
          durationInFrames: 10,
          easing: Easing.bezier(0.65, 0, 0.35, 1),
        })}
      />
      <TransitionSeries.Sequence name="04 / Your rules" durationInFrames={45}>
        <TypeCut />
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence
        name="05 / Strategy burst"
        durationInFrames={72}
      >
        <AssetBurst />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={{
          component: DepthTransition,
          props: { mode: "turn", direction: -1 },
        }}
        timing={linearTiming({
          durationInFrames: 12,
          easing: Easing.bezier(0.65, 0, 0.35, 1),
        })}
      />
      <TransitionSeries.Sequence
        name="06 / Portfolio dial"
        durationInFrames={72}
      >
        <Dial />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={{ component: DepthTransition, props: { mode: "lift" } }}
        timing={linearTiming({
          durationInFrames: 12,
          easing: Easing.bezier(0.65, 0, 0.35, 1),
        })}
      />
      <TransitionSeries.Sequence name="07 / Guard macro" durationInFrames={63}>
        <GuardMacro />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={{ component: DepthTransition, props: { mode: "focus" } }}
        timing={linearTiming({
          durationInFrames: 12,
          easing: Easing.bezier(0.65, 0, 0.35, 1),
        })}
      />
      <TransitionSeries.Sequence
        name="08 / Phone notification"
        durationInFrames={81}
      >
        <PhoneNotification />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={{
          component: DepthTransition,
          props: { mode: "turn", direction: 1 },
        }}
        timing={linearTiming({
          durationInFrames: 12,
          easing: Easing.bezier(0.65, 0, 0.35, 1),
        })}
      />
      <TransitionSeries.Sequence
        name="09 / Product collage"
        durationInFrames={85}
      >
        <Collage />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={{ component: DepthTransition, props: { mode: "lift" } }}
        timing={linearTiming({
          durationInFrames: 10,
          easing: Easing.bezier(0.65, 0, 0.35, 1),
        })}
      />
      <TransitionSeries.Sequence name="10 / In motion" durationInFrames={40}>
        <MotionCut />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={{
          component: DepthTransition,
          props: { mode: "turn", direction: -1 },
        }}
        timing={linearTiming({
          durationInFrames: 10,
          easing: Easing.bezier(0.65, 0, 0.35, 1),
        })}
      />
      <TransitionSeries.Sequence name="11 / Siro" durationInFrames={60}>
        <End />
      </TransitionSeries.Sequence>
    </TransitionSeries>
    <Soundtrack />
  </AbsoluteFill>
);
