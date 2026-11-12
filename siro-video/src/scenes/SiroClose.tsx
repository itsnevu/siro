import {useCurrentFrame} from 'remotion';
import {C,F} from '../theme';
import {Shell,Accent,enter} from '../components/Siro';
export const SiroClose=()=>{
 const f=useCurrentFrame();
 return <Shell duration={90} architecture>
  <div style={{position:'absolute',top:290,left:920,fontFamily:F.display,fontSize:210,letterSpacing:-15,opacity:enter(f,5),translate:`${(1-enter(f,5))*50}px 0`}}>siro.</div>
  <div style={{position:'absolute',top:620,left:0,right:0,textAlign:'center',fontFamily:F.display,fontSize:64,letterSpacing:-2,opacity:enter(f,15)}}>Your strategy. <Accent>In motion.</Accent></div>
  <div style={{position:'absolute',top:795,left:0,right:0,textAlign:'center',fontSize:22,color:C.muted,opacity:enter(f,28)}}>AI agents for tokenized stocks</div>
 </Shell>;
};
