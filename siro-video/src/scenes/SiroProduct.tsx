import {useCurrentFrame} from 'remotion';
import {C,F} from '../theme';
import {Shell,Accent,Brand,enter} from '../components/Siro';
export const SiroProduct=()=>{
 const f=useCurrentFrame();
 return <Shell duration={123}>
  <div style={{position:'absolute',top:145,left:0,right:0,textAlign:'center',fontFamily:F.display,fontSize:84,letterSpacing:-4,opacity:enter(f)}}>Meet <Accent>your agent.</Accent></div>
  <div style={{position:'absolute',left:340,top:305,width:1240,height:610,border:`1px solid ${C.line}`,borderRadius:32,background:'linear-gradient(140deg,#20202e,#11121b)',boxShadow:'0 65px 150px rgba(0,0,0,.5)',overflow:'hidden',transform:`perspective(1800px) rotateX(${(1-enter(f))*12+2}deg) rotateY(${(1-enter(f))*-8}deg)`,scale:.9+enter(f)*.1,translate:`0 ${(1-enter(f))*140}px`}}>
   <div style={{height:90,borderBottom:`1px solid ${C.line}`,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 40px'}}><Brand size={28}/><span style={{fontSize:17,color:C.muted}}>Agent Studio</span><span style={{fontSize:17,color:C.mint}}>● Paper mode</span></div>
   <div style={{display:'flex',padding:45,gap:55}}><div style={{width:260,flexShrink:0}}/><div style={{flex:1}}>
    <div style={{fontFamily:F.display,fontSize:47,letterSpacing:-2}}>Tech Balance</div><div style={{fontSize:19,color:C.muted,marginTop:8}}>Your strategy, within limits.</div>
    <div style={{display:'flex',height:12,borderRadius:99,overflow:'hidden',margin:'35px 0 25px'}}>{[C.purple,C.pink,C.peach].map((c,i)=><div key={c} style={{background:c,width:`${[40,35,25][i]*enter(f,15,35)}%`}}/>)}</div>
    {['NVDA','AAPL','TSLA'].map((t,i)=><div key={t} style={{display:'flex',justifyContent:'space-between',fontSize:21,padding:'15px 0',borderBottom:`1px solid ${C.line}`,opacity:enter(f,15+i*7)}}><span>{t}</span><span style={{color:C.muted}}>{[40,35,25][i]}%</span></div>)}
   </div></div>
   <div style={{position:'absolute',bottom:28,left:400,right:45,fontSize:17,color:C.muted,display:'flex',justifyContent:'space-between'}}><span>✓ Policy checked</span><span>↗ Ready for review</span></div>
  </div>
 </Shell>;
};
