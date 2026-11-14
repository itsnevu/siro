import {useEffect,useState} from 'react';
import {Composition,continueRender,delayRender,cancelRender} from 'remotion';
import {fontsReady} from './fonts';
import {W,H,FPS,DUR} from './theme';
import {Montage} from './Montage';
import {LiveLoop,LOOP,LOOP_W,LOOP_H} from './LiveLoop';
const useFonts=()=>{
 const [handle]=useState(()=>delayRender('Loading Siro website fonts'));
 useEffect(()=>{fontsReady.then(()=>continueRender(handle)).catch(cancelRender);},[handle]);
};
const MotionStudy=()=>{useFonts();return <Montage/>;};
const LiveStudy=()=>{useFonts();return <LiveLoop/>;};
export const RemotionRoot=()=> <>
 <Composition id="SIRO-AGENT-LAUNCH" component={MotionStudy} durationInFrames={DUR} fps={FPS} width={W} height={H}/>
 <Composition id="SIRO-LIVE-LOOP" component={LiveStudy} durationInFrames={LOOP} fps={FPS} width={LOOP_W} height={LOOP_H}/>
</>;
