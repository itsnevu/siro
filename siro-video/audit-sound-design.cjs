const fs=require('node:fs');
const ts=require('typescript');
const {execFileSync}=require('node:child_process');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
const {SOUND_CUES}=require('./src/sound-cues.ts');
const {TOTAL_FRAMES}=require('./src/timing.ts');
const rate=48000,seconds=TOTAL_FRAMES/30,count=Math.ceil(seconds*rate);
const mixed=new Float32Array(count*2);
function decode(file,duration){
 const bytes=execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i',file,'-t',String(duration),'-f','f32le','-ar',String(rate),'-ac','2','pipe:1'],{maxBuffer:64*1024*1024});
 return new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
}
function at(f,positions,values){
 if(f<=positions[0])return values[0];
 for(let i=1;i<positions.length;i++)if(f<positions[i])return values[i-1]+(values[i]-values[i-1])*(f-positions[i-1])/(positions[i]-positions[i-1]);
 return values[values.length-1];
}
const bed=decode('public/audio/designed/hazy-after-hours.mp3',seconds);
for(let n=0;n<count;n++){
 const frame=n/rate*30;
 const envelope=at(frame,[0,18,TOTAL_FRAMES-42,TOTAL_FRAMES],[0,.55,.55,0]);
 const duck=SOUND_CUES.reduce((level,cue)=>Math.min(level,at(frame,[cue.from-5,cue.from+2,cue.from+cue.duration,cue.from+cue.duration+9],[1,.8,.8,1])),1);
 for(let ch=0;ch<2;ch++)mixed[n*2+ch]=(bed[n*2+ch]||0)*envelope*duck;
}
for(const cue of SOUND_CUES){
 if(cue.from<0 || cue.from+cue.duration>TOTAL_FRAMES)throw new Error(`Cue outside timeline: ${cue.name}`);
 const samples=decode(`public/audio/designed/${cue.sound}.wav`,cue.duration/30);
 if(samples.length<Math.floor(cue.duration/30*rate)*2-100)throw new Error(`Short asset: ${cue.name}`);
 const offset=Math.round(cue.from/30*rate),fade=Math.min(5,Math.floor(cue.duration/3));
 for(let n=0;n<samples.length/2 && offset+n<count;n++){
  const gain=at(n/rate*30,[0,1,cue.duration-fade,cue.duration],[0,cue.gain,cue.gain,0]);
  for(let ch=0;ch<2;ch++)mixed[(offset+n)*2+ch]+=samples[n*2+ch]*gain;
 }
}
let peak=0,power=0;
for(const sample of mixed){peak=Math.max(peak,Math.abs(sample));power+=sample*sample;}
if(peak>=1)throw new Error(`Mix clips: ${peak}`);
const report={duration:seconds,cues:SOUND_CUES.length,peakDbFS:20*Math.log10(peak),rmsDbFS:10*Math.log10(power/mixed.length),cueSheet:SOUND_CUES};
fs.mkdirSync('out',{recursive:true});fs.writeFileSync('out/audio-cue-sheet.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,cueSheet:undefined},null,2));
