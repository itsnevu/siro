import {Audio} from '@remotion/media';
import {staticFile,useCurrentFrame,interpolate} from 'remotion';
import {clamp} from './Siro';

export const Soundtrack=()=>{
 const f=useCurrentFrame();
 return <>
  <Audio name="Original Siro instrumental / no narration" src={staticFile('audio/siro-score.wav')} volume={interpolate(f,[0,12,570,600],[0,1,1,0],clamp)}/>
  <Audio name="Tactile clicks / air / guard confirmation" src={staticFile('audio/siro-foley.wav')} volume={.7}/>
 </>;
};
