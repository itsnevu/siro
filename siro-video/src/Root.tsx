import {useEffect,useState} from 'react';
import {Composition,continueRender,delayRender,cancelRender} from 'remotion';
import {fontsReady} from './fonts';
import {W,H,FPS,DUR} from './theme';
import {Montage} from './Montage';
import {LiveLoop,LOOP,LOOP_W,LOOP_H} from './LiveLoop';
import {PlanBanner,PB_W,PB_H,PB_DUR} from './PlanBanner';
import {HowTo,HOWTO_FRAMES} from './HowTo';
const useFonts=()=>{
 const [handle]=useState(()=>delayRender('Loading Siro website fonts'));
 useEffect(()=>{fontsReady.then(()=>continueRender(handle)).catch(cancelRender);},[handle]);
};
const MotionStudy=()=>{useFonts();return <Montage/>;};
const LiveStudy=()=>{useFonts();return <LiveLoop/>;};
const PlanStudy=()=>{useFonts();return <PlanBanner/>;};
const HowToStudy=()=>{useFonts();return <HowTo/>;};
export const RemotionRoot=()=> <>
 <Composition id="SIRO-AGENT-LAUNCH" component={MotionStudy} durationInFrames={DUR} fps={FPS} width={W} height={H}/>
 <Composition id="SIRO-LIVE-LOOP" component={LiveStudy} durationInFrames={LOOP} fps={FPS} width={LOOP_W} height={LOOP_H}/>
 <Composition id="SIRO-PLAN-BANNER" component={PlanStudy} durationInFrames={PB_DUR} fps={FPS} width={PB_W} height={PB_H}/>
 <Composition id="SIRO-HOW-TO" component={HowToStudy} durationInFrames={HOWTO_FRAMES} fps={FPS} width={W} height={H}/>
</>;
