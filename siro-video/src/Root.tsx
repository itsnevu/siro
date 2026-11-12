import {useEffect,useState} from 'react';
import {Composition,continueRender,delayRender,cancelRender} from 'remotion';
import {fontsReady} from './fonts';
import {W,H,FPS,DUR} from './theme';
import {Montage} from './Montage';
const MotionStudy=()=>{
 const [handle]=useState(()=>delayRender('Loading Siro website fonts'));
 useEffect(()=>{fontsReady.then(()=>continueRender(handle)).catch(cancelRender);},[handle]);
 return <Montage/>;
};
export const RemotionRoot=()=> <Composition id="SIRO-AGENT-LAUNCH" component={MotionStudy} durationInFrames={DUR} fps={FPS} width={W} height={H}/>;
