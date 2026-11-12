import {useCurrentFrame} from 'remotion';
import {C,F} from '../theme';
import {Shell,Accent,enter} from '../components/Siro';
export const SiroOpening=()=>{
 const f=useCurrentFrame();
 return <Shell duration={102} architecture>
  <div style={{position:'absolute',left:0,right:0,top:295,textAlign:'center',fontFamily:F.display,fontSize:155,lineHeight:1.12,letterSpacing:-8,scale:.94+enter(f)*.06}}>
   <div style={{opacity:enter(f),translate:`0 ${(1-enter(f))*60}px`}}>Your strategy.</div>
   <div style={{opacity:enter(f,17),translate:`0 ${(1-enter(f,17))*65}px`}}><Accent>Now autonomous.</Accent></div>
  </div>
  <div style={{position:'absolute',bottom:135,left:0,right:0,textAlign:'center',fontSize:23,color:C.muted,opacity:enter(f,40)}}>Introducing Siro agents</div>
 </Shell>;
};
