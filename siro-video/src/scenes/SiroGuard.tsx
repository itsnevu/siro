import {useCurrentFrame,interpolate} from 'remotion';
import {C,F} from '../theme';
import {Shell,Accent,enter,clamp} from '../components/Siro';
export const SiroGuard=()=>{
 const f=useCurrentFrame();
 return <Shell duration={183}>
  <div style={{position:'absolute',left:130,top:330,fontFamily:F.display,fontSize:112,lineHeight:1.16,letterSpacing:-5,opacity:enter(f),translate:`0 ${(1-enter(f))*45}px`}}>Your rules.<br/><Accent>Always.</Accent></div>
  <svg width="1920" height="1080" style={{position:'absolute',inset:0}}><ellipse cx="1280" cy="535" rx="470" ry="245" fill="none" stroke={C.line} strokeWidth="1" transform="rotate(-18 1280 535)"/><path d="M900 690 Q1050 850 1450 700" fill="none" stroke={C.purple} strokeWidth="2" pathLength="1" strokeDasharray="1" strokeDashoffset={1-enter(f,35,70)}/></svg>
  {['Trade cap  ·  $500','Max drawdown  ·  8%'].map((label,i)=><div key={label} style={{position:'absolute',left:i?1330:850,top:i?700:245,padding:'26px 35px',borderRadius:22,border:`1px solid ${C.line}`,background:C.surface,boxShadow:'0 20px 60px rgba(0,0,0,.35)',rotate:i?'5deg':'-4deg',opacity:enter(f,20+i*18),translate:`0 ${(1-enter(f,20+i*18))*50+Math.sin(f/27+i)*5}px`,fontSize:26}}><span style={{color:C.mint,marginRight:15}}>✓</span>{label}</div>)}
  <div style={{position:'absolute',left:1150,top:850,fontSize:22,color:C.mint,opacity:enter(f,75)}}>● Guard active</div>
  <div style={{position:'absolute',left:130,bottom:120,fontSize:16,color:C.muted,opacity:interpolate(f,[65,85],[0,1],clamp)}}>Illustrative policy settings</div>
 </Shell>;
};
