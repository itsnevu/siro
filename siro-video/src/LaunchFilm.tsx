import {AbsoluteFill,Easing,Img,interpolate,spring,staticFile,useCurrentFrame} from 'remotion';
import {C,F} from './theme';
import {Accent,Brand,Logo,clamp} from './components/Siro';
import {Soundtrack} from './components/Soundtrack';

const travel=Easing.bezier(.65,0,.35,1);
const smooth=(f:number,a:number,b:number)=>interpolate(f,[a,b],[0,1],{...clamp,easing:travel});
const mix=(a:number,b:number,p:number)=>a+(b-a)*p;
const settle=(f:number,from:number)=>spring({fps:30,frame:f-from,config:{damping:19,stiffness:155,mass:.7}});

/** Each layout is a destination for the same surface, rather than a new scene. */
function geometry(f:number){
 const birth=settle(f,172),guard=smooth(f,230,273),desk=smooth(f,382,437),close=smooth(f,466,526);
 return {
  x:mix(mix(mix(960,1285,guard),520,desk),780,close),
  y:mix(mix(mix(498,515,guard),595,desk),430,close),
  w:mix(mix(mix(mix(1200,310,birth),330,guard),260,desk),190,close),
  h:mix(mix(mix(mix(186,310,birth),330,guard),260,desk),190,close),
  radius:mix(30,68,birth),birth,guard,desk,close,
 };
}

const Backdrop=()=>{
 const f=useCurrentFrame();
 const focus=smooth(f,76,125)*(1-smooth(f,475,540));
 return <AbsoluteFill style={{background:C.bg}}>
  <div style={{position:'absolute',inset:-80,opacity:mix(.15,.018,focus),scale:1.05+smooth(f,0,600)*.05,translate:`${mix(0,-65,smooth(f,75,440))}px 0`}}><Img src={staticFile('art/siro-architecture.webp')} style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>
  <AbsoluteFill style={{background:`linear-gradient(0deg,${C.bg},transparent 80%)`}}/>
  <AbsoluteFill style={{background:'radial-gradient(ellipse at 65% 48%,rgba(165,151,255,.075),transparent 55%)',translate:`${mix(-70,70,smooth(f,200,460))}px 0`}}/>
 </AbsoluteFill>;
};

const Headlines=()=>{
 const f=useCurrentFrame();
 const introOut=smooth(f,77,104);
 return <>
  <div style={{position:'absolute',left:0,right:0,top:295-introOut*125,textAlign:'center',fontFamily:F.display,fontSize:155,lineHeight:1.12,letterSpacing:-8,scale:1+introOut*.13,opacity:1-introOut,filter:`blur(${introOut*3}px)`}}>
   <div style={{overflow:'hidden'}}><div style={{translate:`0 ${110*(1-settle(f,4))}%`}}>Your strategy.</div></div>
   <div style={{overflow:'hidden'}}><div style={{translate:`0 ${110*(1-settle(f,20))}%`}}><Accent>Now autonomous.</Accent></div></div>
  </div>
  <div style={{position:'absolute',left:0,right:0,top:160,textAlign:'center',fontFamily:F.display,fontSize:94,letterSpacing:-4,opacity:smooth(f,97,111)*(1-smooth(f,221,242)),clipPath:`inset(${mix(100,0,smooth(f,97,118))}% 0 0 0)`}}>One idea. <Accent>Your agent.</Accent></div>
  <div style={{position:'absolute',left:130,top:330,fontFamily:F.display,fontSize:112,lineHeight:1.16,letterSpacing:-5,opacity:smooth(f,243,262)*(1-smooth(f,382,407)),clipPath:`inset(${mix(100,0,smooth(f,241,266))}% 0 0 0)`}}>
   <div style={{translate:`0 ${mix(42,0,settle(f,244))}px`}}>Your rules.</div><div style={{translate:`0 ${mix(52,0,settle(f,250))}px`}}><Accent>Always.</Accent></div>
  </div>
  <div style={{position:'absolute',left:0,right:0,top:145,textAlign:'center',fontFamily:F.display,fontSize:84,letterSpacing:-4,opacity:smooth(f,399,418)*(1-smooth(f,465,489)),translate:`0 ${mix(35,0,settle(f,399))}px`}}>Meet <Accent>your agent.</Accent></div>
  <div style={{position:'absolute',left:920,top:290,paddingRight:24,fontFamily:F.display,fontSize:210,letterSpacing:-15,opacity:smooth(f,502,523),clipPath:`inset(0 ${mix(100,0,smooth(f,499,528))}% 0 0)`}}>siro.</div>
  <div style={{position:'absolute',left:0,right:0,top:620,textAlign:'center',fontFamily:F.display,fontSize:64,letterSpacing:-2,opacity:smooth(f,525,547),translate:`0 ${mix(24,0,settle(f,524))}px`}}>Your strategy. <Accent>In motion.</Accent></div>
  <div style={{position:'absolute',left:0,right:0,top:795,textAlign:'center',fontSize:22,color:C.muted,opacity:smooth(f,543,563)}}>AI agents for tokenized stocks</div>
 </>;
};

const Surface=()=>{
 const f=useCurrentFrame();
 const g=geometry(f),prev=geometry(f-1);
 const dx=g.x-prev.x,dy=g.y-prev.y;
 const open=settle(f,99);
 const cardReveal=smooth(f,472,526);
 const tilt=mix(-9*g.birth,0,g.close)+dx*.1;
 const text='Keep my tech portfolio balanced.';
 return <div style={{position:'absolute',zIndex:5,left:g.x-g.w/2,top:g.y-g.h/2,width:g.w,height:g.h,opacity:smooth(f,96,105),scale:f<172?mix(.96,1,open):1,transform:`perspective(1600px) rotateX(${9*g.birth*(1-g.close)-dy*.06}deg) rotateY(${-8*g.birth*(1-g.close)+dx*.1}deg) rotateZ(${tilt}deg)`,filter:`blur(${Math.min(1.6,Math.hypot(dx,dy)*.025)}px)`}}>
  <div style={{position:'absolute',inset:0,borderRadius:g.radius,overflow:'hidden',background:'linear-gradient(135deg,#343247,#191B27 52%,#0A0B12)',border:'1px solid rgba(165,151,255,.28)',boxShadow:'inset 1px 2px 2px rgba(244,242,238,.12),0 30px 85px rgba(0,0,0,.4)',opacity:1-cardReveal}}>
   <div style={{position:'absolute',inset:0,background:'linear-gradient(130deg,rgba(165,151,255,.08),transparent 58%)'}}/>
   <div style={{position:'absolute',top:'-50%',height:'200%',width:80,left:`${mix(-60,145,smooth(f,185,395))}%`,rotate:'30deg',background:'linear-gradient(90deg,transparent,rgba(244,242,238,.07),transparent)'}}/>
   <div style={{position:'absolute',left:55,top:0,height:186,width:1090,display:'flex',alignItems:'center',gap:28,opacity:1-smooth(f,165,179),filter:`blur(${smooth(f,165,179)*4}px)`}}>
    <span style={{fontSize:34,color:C.purple}}>✧</span><span style={{fontSize:38,letterSpacing:-1}}>{text.slice(0,Math.floor(interpolate(f,[117,162],[0,text.length],clamp)))}<span style={{color:C.purple,opacity:f%24<12?1:0}}>|</span></span>
    <div style={{marginLeft:'auto',width:66,height:66,borderRadius:20,background:C.gradient,color:C.ink,display:'grid',placeItems:'center',fontSize:32,scale:1-smooth(f,163,171)*.09}}>↑</div>
   </div>
  </div>
  <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',opacity:smooth(f,184,201),scale:mix(.8,1,settle(f,185))}}><Logo size={g.w*mix(.46,1,cardReveal)}/></div>
  <div style={{position:'absolute',right:g.w*.1,bottom:g.h*.1,width:12,height:12,borderRadius:99,background:C.mint,boxShadow:`0 0 22px ${C.mint}`,opacity:smooth(f,309,318)*(1-cardReveal)}}/>
 </div>;
};

/** The guard boundary physically opens into the product window. */
const GuardToDesk=()=>{
 const f=useCurrentFrame();
 const p=smooth(f,382,437),close=smooth(f,466,510);
 const w=mix(940,1240,p),h=mix(490,610,p);
 return <div style={{position:'absolute',left:mix(815,340,p),top:mix(290,305,p),width:w,height:h,border:`1px solid ${C.line}`,borderRadius:mix(245,32,p),rotate:`${mix(-18,0,p)}deg`,opacity:smooth(f,248,276)*(1-close),scale:mix(mix(.92,1,settle(f,253)),.55,close),transformOrigin:'25% 45%',background:`rgba(25,27,39,${p*.96})`,boxShadow:p>.5?'0 45px 100px rgba(0,0,0,.3)':undefined,overflow:'hidden'}}>
  <div style={{position:'absolute',inset:0,width:1240,height:610,opacity:smooth(f,401,426),clipPath:`inset(0 ${mix(100,0,smooth(f,398,432))}% 0 0)`}}>
   <div style={{height:90,borderBottom:`1px solid ${C.line}`,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 40px'}}><Brand size={28}/><span style={{fontSize:17,color:C.muted}}>Agent Studio</span><span style={{fontSize:17,color:C.mint}}>● Paper mode</span></div>
   <div style={{position:'absolute',left:360,right:45,top:132}}><div style={{fontFamily:F.display,fontSize:47,letterSpacing:-2}}>Momentum Swing</div><div style={{fontSize:19,color:C.muted,marginTop:8}}>High conviction · 3 assets</div>
    <div style={{display:'flex',height:12,borderRadius:99,overflow:'hidden',margin:'35px 0 25px'}}>{[C.purple,C.pink,C.peach,C.mint,'#F4F2EE'].map((c,i)=><div key={c} style={{background:c,width:`${20*settle(f,421)}%`}}/>)}</div>
    {['AAPL','MSFT','GOOGL','AMZN','NVDA'].map((t,i)=><div key={t} style={{display:'flex',justifyContent:'space-between',fontSize:21,padding:'12px 0',borderBottom:`1px solid ${C.line}`,opacity:smooth(f,423+i*3,433+i*3)}}><span>{t}</span><span style={{color:C.muted}}>20%</span></div>)}
   </div>
   <div style={{position:'absolute',bottom:28,left:360,right:45,fontSize:17,color:C.muted,display:'flex',justifyContent:'space-between'}}><span>✓ Policy checked</span><span>↗ Ready for review</span></div>
  </div>
 </div>;
};

const Satellites=()=>{
 const f=useCurrentFrame();
 const policy=smooth(f,243,276),intoDesk=smooth(f,382,419);
 return <>{['NVDA','AAPL','TSLA'].map((label,i)=>{
  const startX=[620,1300,960][i],startY=[453,508,793][i];
  const destX=[1000,1480,960][i],destY=[285,740,850][i];
  const p=settle(f,204+i*5);
  const x=mix(startX,destX,policy)+Math.sin(f/30+i)*5;
  const y=mix(startY,destY,policy)+mix(60,0,p);
  return <div key={label} style={{position:'absolute',zIndex:3,left:mix(x,1300,intoDesk),top:mix(y,530+i*55,intoDesk),width:mix(132,i<2?325:132,policy),height:mix(64,80,policy),translate:'-50% -50%',borderRadius:mix(99,22,policy),border:`1px solid ${C.line}`,background:C.surface,display:'grid',placeItems:'center',fontSize:24,opacity:smooth(f,201+i*5,213+i*5)*(i===2?1-policy:1-intoDesk),scale:mix(.75,1,p),rotate:`${mix(0,i===0?-4:4,policy)*(1-intoDesk)}deg`}}>
   <span style={{position:'absolute',opacity:1-policy}}>{label}</span>
   {i<2?<span style={{opacity:policy,whiteSpace:'nowrap'}}><span style={{color:C.mint,marginRight:12}}>✓</span>{i===0?'Trade cap · $500':'Drawdown · 8%'}</span>:null}
  </div>;
 })}<div style={{position:'absolute',left:1150,top:850,fontSize:22,color:C.mint,opacity:smooth(f,310,326)*(1-smooth(f,380,405))}}>● Guard active</div></>;
};

export const LaunchFilm=()=> <AbsoluteFill style={{fontFamily:F.sans,color:C.text,overflow:'hidden'}}>
 <Backdrop/><Headlines/><GuardToDesk/><Satellites/><Surface/><Soundtrack/>
</AbsoluteFill>;
