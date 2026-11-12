import {interpolate,useCurrentFrame} from 'remotion';
import {C,F} from '../theme';
import {Shell,Accent,enter,clamp} from '../components/Siro';
export const SiroPrompt=()=>{
 const f=useCurrentFrame();
 const text='Keep my tech portfolio balanced.';
 const formed=enter(f,85,35);
 return <Shell duration={168}>
  <div style={{position:'absolute',left:0,right:0,top:160,textAlign:'center',fontFamily:F.display,fontSize:94,letterSpacing:-4,opacity:enter(f)}}>One idea. <Accent>Your agent.</Accent></div>
  <div style={{position:'absolute',left:360,top:405,width:1200,height:186,borderRadius:30,border:`1px solid ${C.line}`,background:'linear-gradient(120deg,#242331,#151620)',boxShadow:'0 40px 100px rgba(0,0,0,.35)',display:'flex',alignItems:'center',padding:'0 55px',gap:28,opacity:1-formed,scale:1-formed*.2,translate:`0 ${(1-enter(f,5))*80}px`}}>
   <span style={{fontSize:34,color:C.purple}}>✧</span><span style={{fontSize:38,letterSpacing:-1}}>{text.slice(0,Math.floor(interpolate(f,[15,66],[0,text.length],clamp)))}<span style={{opacity:f%24<12?1:0,color:C.purple}}>|</span></span>
   <div style={{marginLeft:'auto',width:66,height:66,borderRadius:20,background:C.gradient,color:C.ink,display:'grid',placeItems:'center',fontSize:32}}>↑</div>
  </div>
  {['NVDA','AAPL','TSLA'].map((ticker,i)=><div key={ticker} style={{position:'absolute',left:[560,1240,900][i],top:[420,475,760][i],fontSize:24,color:C.text,background:C.surface,border:`1px solid ${C.line}`,borderRadius:99,padding:'18px 30px',opacity:enter(f,96+i*7),translate:`0 ${(1-enter(f,96+i*7))*40}px`}}>{ticker}</div>)}
 </Shell>;
};
