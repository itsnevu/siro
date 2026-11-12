import {interpolate, useCurrentFrame} from 'remotion';
import {clamp} from './Siro';

export const RevealText = ({text, start = 5, step = 1.1}: {text: string; start?: number; step?: number}) => {
  const f = useCurrentFrame();
  return <span aria-label={text}>{Array.from(text).map((letter,i)=>{
    const p=interpolate(f,[start+i*step,start+i*step+9],[0,1],clamp);
    return <span aria-hidden key={i} style={{display:'inline-block',whiteSpace:'pre',opacity:p,translate:`0 ${(1-p)*12}px`,filter:`blur(${(1-p)*2}px)`}}>{letter}</span>;
  })}</span>;
};
