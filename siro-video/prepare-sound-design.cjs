// Licensed sources stay untouched in audio/library; edits live in audio/designed.
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
fs.mkdirSync('public/audio/designed',{recursive:true});
const edits=[
 ['sweep','sweep',.7,'atempo=1.22',-18],
 ['lift','slide',.68,'atempo=2,atempo=1.21',-19],
 ['mosaic','mosaic',1.6,'atempo=0.755',-20],
 ['focus','zoom',1.2,'atempo=1.06',-20],
 ['toss','zoom',1.2,'atempo=1.06',-19],
 ['land','click',.3,'anull',-20],
 ['click','click',.3,'anull',-22],
 ['confirm','confirm',.8,'anull',-22],
 ['notification','notification',.8,'anull',-21],
 ['brand','slide',1.27,'atempo=1.3',-21],
 ['tick','click',.2,'atempo=1.6,lowpass=f=5500',-24],
 ['card','click',.4,'atempo=0.85,lowpass=f=2400,aecho=0.6:0.25:36:0.15',-23],
 ['sparkle','notification',.5,'atempo=1.6,highpass=f=600',-25],
 ['recede','zoom',1.27,'areverse,atempo=1.01,lowpass=f=6500',-23],
];
for(const [name,source,duration,speed,lufs] of edits){
 const fade=name==='mosaic'?.2:.08;
 const texture=name==='mosaic'?'tremolo=f=17:d=0.65,aecho=0.6:0.25:29:0.18,':'';
 const filters=`silenceremove=start_periods=1:start_duration=0.005:start_threshold=-55dB,${speed},${texture}highpass=f=90,lowpass=f=12500,apad,atrim=duration=${duration},afade=t=in:d=0.012,afade=t=out:st=${duration-fade}:d=${fade},loudnorm=I=${lufs}:TP=-3:LRA=7`;
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',`public/audio/library/${source}.wav`,'-af',filters,'-ar','48000','-ac','2',`public/audio/designed/${name}.wav`]);
 console.log('Prepared',name,duration+'s');
}
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss','8','-i','public/audio/library/music-hazy-after-hours.mp3','-t','60','-af','highpass=f=35,lowpass=f=14500,loudnorm=I=-23:TP=-4:LRA=9','-ar','48000','-ac','2','-c:a','libmp3lame','-b:a','192k','public/audio/designed/hazy-after-hours.mp3']);
console.log('Prepared Hazy After Hours music bed.');
