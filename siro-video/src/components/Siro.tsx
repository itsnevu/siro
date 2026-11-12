import React from 'react';
import {AbsoluteFill,Easing,Img,interpolate,staticFile,useCurrentFrame} from 'remotion';
import {C,EASE,F} from '../theme';
export const ease=Easing.bezier(...EASE);
export const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
export const enter=(frame:number,delay=0,duration=26)=>interpolate(frame,[delay,delay+duration],[0,1],{...clamp,easing:ease});
export const Logo=({size=80}:{size?:number})=><Img src={staticFile('art/siro-mark.png')} style={{width:size,height:size*.74,objectFit:'contain',position:'relative',zIndex:1}}/>;
export const Brand=({size=36}:{size?:number})=><div style={{display:'flex',alignItems:'center',gap:size*.24}}><Logo size={size}/><span style={{fontFamily:F.display,fontSize:size*1.1,letterSpacing:-size*.06}}>siro.</span></div>;
export const Shell:React.FC<React.PropsWithChildren<{duration:number;architecture?:boolean}>>=({children,duration,architecture=false})=>{
 const f=useCurrentFrame();
 return <AbsoluteFill style={{color:C.text,fontFamily:F.sans,overflow:'hidden',opacity:interpolate(f,[0,20,duration-24,duration],[0,1,1,0],clamp),translate:`${interpolate(f,[0,24,duration-24,duration],[architecture?0:70,0,0,-85],{...clamp,easing:ease})}px 0`,filter:`blur(${interpolate(f,[0,20,duration-18,duration],[3,0,0,5],clamp)}px)`}}>
  {children}
 </AbsoluteFill>;
};
export const Accent:React.FC<React.PropsWithChildren>=({children})=><span style={{fontFamily:F.italic,fontStyle:'italic',background:C.gradient,backgroundClip:'text',WebkitBackgroundClip:'text',color:'transparent'}}>{children}</span>;
export const AgentTile=({size=300,frame=0,guard=false,reveal=0}:{size?:number;frame?:number;guard?:boolean;reveal?:number})=><div style={{width:size,height:size,display:'grid',placeItems:'center',position:'relative',transform:`perspective(1200px) rotateY(${(Math.sin(frame/65)*9-10)*(1-reveal)}deg) rotateX(${9*(1-reveal)}deg) rotateZ(${-9*(1-reveal)}deg)`}}>
 <div style={{position:'absolute',inset:0,borderRadius:size*.22,background:'linear-gradient(145deg,#343247 0%,#191B27 50%,#0A0B12 100%)',border:'1px solid rgba(165,151,255,.3)',boxShadow:'inset 1px 2px 2px rgba(244,242,238,.14),inset -8px -12px 20px rgba(0,0,0,.4),20px 38px 100px rgba(0,0,0,.5)',opacity:1-reveal,overflow:'hidden'}}>
  <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(165,151,255,.2),transparent 55%)'}}/>
  <div style={{position:'absolute',height:'200%',width:60,top:'-50%',left:`${(frame*1.1)%260-70}%`,rotate:'30deg',background:'linear-gradient(90deg,transparent,rgba(244,242,238,.08),transparent)'}}/>
 </div>
 <Logo size={size*(.46+.54*reveal)}/>
 {guard?<div style={{position:'absolute',bottom:size*.1,right:size*.1,width:12,height:12,borderRadius:99,background:C.mint,boxShadow:`0 0 24px ${C.mint}`,opacity:1-reveal}}/>:null}
</div>;
