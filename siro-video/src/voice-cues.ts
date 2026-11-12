import {STARTS,TRANSITIONS} from './timing';
import {VOICE_ASSETS} from './voice-assets';

const positions:Record<string,number>={
 policy:STARTS[2]+18,
 rules:STARTS[3]+32,
 strategy:STARTS[4]+14,
 built:STARTS[5]+20,
 limits:STARTS[6]+20,
 review:STARTS[7]+40,
 motion:STARTS[9]+20,
 brand:STARTS[10]+TRANSITIONS[7]+2,
};
export const VOICE_CUES=VOICE_ASSETS.map(asset=>({...asset,from:positions[asset.id],duration:Math.ceil(asset.seconds*30)+2}));
export const voiceDucking=(frame:number,depth:number)=>VOICE_CUES.reduce((level,cue)=>{
 const times=[cue.from-8,cue.from,cue.from+cue.duration,cue.from+cue.duration+12];
 if(frame<times[0]||frame>=times[3])return level;
 const gain=frame<times[1]?1-(1-depth)*(frame-times[0])/8:frame<=times[2]?depth:depth+(1-depth)*(frame-times[2])/12;
 return Math.min(level,gain);
},1);
