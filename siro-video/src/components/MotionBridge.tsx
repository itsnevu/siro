import {AbsoluteFill,Img,interpolate,staticFile,useCurrentFrame} from 'remotion';
import {C} from '../theme';
import {AgentTile,clamp,ease,enter} from './Siro';

/** One object traverses all five scenes; it never cuts at a scene boundary. */
export const AgentJourney=()=>{
 const f=useCurrentFrame();
 const x=interpolate(f,[175,220,230,270,385,438,493,539],[960,960,960,1285,1285,520,520,780],{...clamp,easing:ease});
 const y=interpolate(f,[175,220,230,270,385,438,493,539],[545,500,500,515,515,595,595,430],{...clamp,easing:ease});
 const size=interpolate(f,[175,210,230,270,385,438,493,539],[120,300,300,330,330,260,260,190],{...clamp,easing:ease});
 return <div style={{position:'absolute',left:x-size/2,top:y-size/2,opacity:enter(f,175,23),zIndex:5,pointerEvents:'none'}}><AgentTile size={size} frame={f} guard={f>=300} reveal={enter(f,500,40)}/></div>;
};

export const ContinuousBackdrop=()=>{
 const f=useCurrentFrame();
 return <AbsoluteFill style={{background:C.bg}}>
  <AbsoluteFill style={{opacity:interpolate(f,[0,80,130,480,535,599],[.14,.14,.025,.025,.14,.14],clamp),scale:1+f*.00015,translate:`${-f*.012}px 0`}}><Img src={staticFile('art/siro-architecture.webp')} style={{width:'100%',height:'100%',objectFit:'cover'}}/><AbsoluteFill style={{background:`linear-gradient(0deg,${C.bg},transparent 75%)`}}/></AbsoluteFill>
  <AbsoluteFill style={{background:'radial-gradient(ellipse at 68% 45%,rgba(165,151,255,.09),transparent 60%)',translate:`${Math.sin(f/120)*60}px 0`}}/>
 </AbsoluteFill>;
};

/** Parallel diagonal ribbons echo the brand mark, instead of fading to black. */
export const RibbonHandoffs=()=>{
 const f=useCurrentFrame();
 return <AbsoluteFill style={{pointerEvents:'none',overflow:'hidden'}}>{[90,240,405,510].map((cut)=>{
  const p=interpolate(f,[cut-17,cut+18],[0,1],{...clamp,easing:ease});
  if(p===0||p===1)return null;
  return <div key={cut} style={{position:'absolute',left:interpolate(p,[0,1],[-2200,2300]),top:300,rotate:'-32deg',opacity:Math.sin(p*Math.PI)*.18,filter:'blur(3px)'}}>
   <div style={{width:1700,height:100,background:C.gradient,clipPath:'polygon(7% 0,100% 0,93% 100%,0 100%)'}}/>
   <div style={{width:1700,height:100,marginTop:45,marginLeft:180,background:C.gradient,clipPath:'polygon(7% 0,100% 0,93% 100%,0 100%)'}}/>
  </div>;
 })}</AbsoluteFill>;
};
