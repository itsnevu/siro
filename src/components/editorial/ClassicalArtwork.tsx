import "@/styles/classical-artwork.css";

type Props = { name: "column" | "urn" | "arch"; className?: string };

/** Existing decorative engravings inherit the site's current color palette. */
export function ClassicalArtwork({ name, className = "" }: Props) {
  return <figure className={`classical-art classical-art--${name} ${className}`} aria-hidden="true"><span className="classical-art-drawing" /></figure>;
}
