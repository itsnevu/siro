import { AbsoluteFill } from "remotion";
import {useId} from 'react';
import type { TransitionPresentationComponentProps } from "@remotion/transitions";

export type DepthProps = {
  mode: "turn" | "lift" | "focus" | "mosaic" | "match" | "brand";
  direction?: number;
};
/** Small camera angles retain legibility and safe margins during overlapping shots. */
export const DepthTransition = ({
  children,
  presentationDirection,
  presentationProgress: p,
  passedProps: { mode, direction = 1 },
}: TransitionPresentationComponentProps<DepthProps>) => {
  const maskId = `mosaic-${useId().replace(/[^a-zA-Z0-9]/g,'')}`;
  const incoming = presentationDirection === "entering";
  const amount = incoming ? 1 - p : p;
  // Keep the outgoing surface intact: two shrinking masks expose the black stage.
  // Objects already own their 3D motion; rotating the entire viewport creates gaps.
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
        clipPath: !incoming || mode === 'match' ? 'none' : mode === 'brand' ? `polygon(${100-p*125}% 0,100% 0,100% 100%,${125-p*125}% 100%)` : mode === 'mosaic' ? `url(#${maskId})` : clipPath,
        zIndex: incoming ? 2 : 1,
        opacity: mode === 'match' && incoming ? p : 1,
      }}
    >
      {mode === 'mosaic' ? <svg width="0" height="0" style={{position:'absolute'}}><defs><clipPath id={maskId} clipPathUnits="objectBoundingBox">{Array.from({length:40},(_,i)=>{
        const col=i%8,row=Math.floor(i/8);
        const delay=((col*3+row*7)%11)/11*.38;
        const t=Math.max(0,Math.min(1,(p-delay)/.62));
        const ease=t*t*(3-2*t);
        const size=incoming?ease:1-ease;
        return <rect key={i} x={(col+(1-size)/2)/8} y={(row+(1-size)/2)/5} width={size/8+.0001} height={size/5+.0001} rx={.009*Math.sin(size*Math.PI)}/>;
      })}</clipPath></defs></svg> : null}
      <AbsoluteFill
        style={{
          transform: mode === 'brand' ? incoming ? `translateX(${(1-p)*40}px) scale(${1.025-(p*.025)})` : `translateX(${-p*65}px) scale(${1-p*.035})` : incoming ? `scale(${1 + amount * (mode === 'match' ? .025 : .06)})` : 'none',
          transformOrigin: "50% 50%",
          filter: `blur(${mode === 'brand' ? incoming ? (1-p)*2 : p*4 : mode === 'match' ? Math.sin(p*Math.PI)*6 : incoming ? amount*1.2 : 0}px)`,
          backfaceVisibility: "hidden",
        }}
      >
        {children}
      </AbsoluteFill>
      {mode==='brand' && incoming ? <div style={{position:'absolute',pointerEvents:'none',top:'-20%',height:'150%',width:36,left:`${100-p*125}%`,rotate:'-14deg',background:'linear-gradient(90deg,transparent,rgba(165,151,255,.7),rgba(243,205,176,.6),transparent)',filter:'blur(10px)',opacity:Math.sin(p*Math.PI)*.6}}/> : null}
    </AbsoluteFill>
  );
};
