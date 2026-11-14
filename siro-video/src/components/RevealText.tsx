import {interpolate, useCurrentFrame} from 'remotion';
import {clamp} from './Siro';

// Letters reveal one by one; each word stays on one line so wrapping never splits a word.
export const RevealText = ({text, start = 5, step = 1.1}: {text: string; start?: number; step?: number}) => {
  const f = useCurrentFrame();
  let index = 0;
  return <span aria-label={text}>{text.split(/(\s+)/).map((word,w)=>/^\s+$/.test(word)?<span key={w}>{word}</span>:<span key={w} style={{display:'inline-block',whiteSpace:'nowrap'}}>{Array.from(word).map((letter)=>{
    const i=index++;
    const p=interpolate(f,[start+i*step,start+i*step+9],[0,1],clamp);
    return <span aria-hidden key={i} style={{display:'inline-block',opacity:p,translate:`0 ${(1-p)*12}px`,filter:`blur(${(1-p)*2}px)`}}>{letter}</span>;
  })}</span>)}</span>;
};
