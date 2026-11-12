import {Audio} from '@remotion/media';
import {Sequence,staticFile,useCurrentFrame,interpolate} from 'remotion';
import {clamp} from './Siro';
import {SOUND_CUES,type Cue} from '../sound-cues';
import {TOTAL_FRAMES} from '../timing';

const MusicBed=()=>{
 const frame=useCurrentFrame();
 const envelope=interpolate(frame,[0,18,TOTAL_FRAMES-42,TOTAL_FRAMES],[0,.55,.55,0],clamp);
 const duck=SOUND_CUES.reduce((level,cue)=>Math.min(level,interpolate(frame,[cue.from-5,cue.from+2,cue.from+cue.duration,cue.from+cue.duration+9],[1,.8,.8,1],clamp)),1);
 return <Audio name="Hazy After Hours / background" src={staticFile('audio/designed/hazy-after-hours.mp3')} volume={envelope*duck}/>;
};

const SoundCue=({cue}:{cue:Cue})=>{
 const frame=useCurrentFrame();
 const fade=Math.min(5,Math.floor(cue.duration/3));
 return <Audio src={staticFile(`audio/designed/${cue.sound}.wav`)} volume={interpolate(frame,[0,1,cue.duration-fade,cue.duration],[0,cue.gain,cue.gain,0],clamp)}/>;
};

export const DesignedAudio=()=> <>
 <MusicBed/>
 {SOUND_CUES.map(cue=><Sequence key={cue.name} name={cue.name} from={cue.from} durationInFrames={cue.duration} layout="none"><SoundCue cue={cue}/></Sequence>)}
</>;
