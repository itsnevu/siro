import type { CSSProperties } from "react";

type Props = {
  variant?: "dusk" | "night";
  image?: string;
};

/** Decorative layers only; content, focus and pointer events stay with the host. */
export function CinematicBackground({ variant = "dusk", image }: Props) {
  const style = image ? { "--cinematic-image": `url(${JSON.stringify(image)})` } as CSSProperties : undefined;
  return (
    <div className="cinematic-background" data-variant={variant} data-image={image ? "true" : undefined} style={style} aria-hidden="true">
      <div className="cinematic-sky" />
      <div className="cinematic-clouds"><i /><i /><i /><i /><i /></div>
      <div className="cinematic-horizon" />
      <div className="cinematic-shade" />
      <div className="cinematic-grain" />
    </div>
  );
}
