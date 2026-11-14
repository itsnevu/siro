/* eslint-disable @next/next/no-img-element -- tiny local SVGs; next/image adds nothing here */
export function TokenLogo({ src, size = 28 }: { src: string; size?: number }) {
  return <img src={src} alt="" width={size} height={size} className="token-logo" draggable={false} />;
}
