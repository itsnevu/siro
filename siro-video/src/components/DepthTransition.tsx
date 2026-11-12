import { AbsoluteFill } from "remotion";
import type { TransitionPresentationComponentProps } from "@remotion/transitions";

export type DepthProps = {
  mode: "turn" | "lift" | "focus";
  direction?: number;
};
/** Small camera angles retain legibility and safe margins during overlapping shots. */
export const DepthTransition = ({
  children,
  presentationDirection,
  presentationProgress: p,
  passedProps: { mode, direction = 1 },
}: TransitionPresentationComponentProps<DepthProps>) => {
  const incoming = presentationDirection === "entering";
  const amount = incoming ? 1 - p : p;
  const sign = incoming ? direction : -direction;
  const rotation =
    mode === "turn"
      ? amount * sign * 16
      : mode === "lift"
        ? amount * sign * 5
        : 0;
  const x = mode === "turn" ? amount * sign * 155 : 0;
  const y = mode === "lift" ? amount * (incoming ? 90 : -65) : 0;
  const scale =
    mode === "focus"
      ? 1 + amount * (incoming ? 0.14 : -0.07)
      : 1 + amount * 0.12;
  const edge = (incoming ? 1 - p : p) * 100;
  const clipPath =
    mode === "focus"
      ? incoming
        ? `circle(${p * 150}% at 50% 50%)`
        : "none"
      : mode === "lift"
        ? incoming
          ? `inset(${edge}% 0 0 0)`
          : `inset(0 0 ${edge}% 0)`
        : incoming
          ? direction === 1
            ? `inset(0 0 0 ${edge}%)`
            : `inset(0 ${edge}% 0 0)`
          : direction === 1
            ? `inset(0 ${edge}% 0 0)`
            : `inset(0 0 0 ${edge}%)`;
  return (
    <AbsoluteFill
      style={{
        perspective: 1800,
        overflow: "hidden",
        clipPath,
        zIndex: incoming ? 2 : 1,
      }}
    >
      <AbsoluteFill
        style={{
          transform: `translate3d(${x}px,${y}px,${-amount * 100}px) rotateY(${rotation}deg) rotateX(${mode === "lift" ? amount * (incoming ? -9 : 6) : 0}deg) scale(${scale})`,
          transformOrigin: "50% 50%",
          filter: `blur(${amount * (mode === "focus" ? 4 : 1.4)}px)`,
          backfaceVisibility: "hidden",
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
