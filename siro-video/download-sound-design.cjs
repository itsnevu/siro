const fs=require('node:fs/promises');
const path=require('node:path');
const dir=path.join(__dirname,'public/audio/library');
const tracks=[
 ['music-digital-clouds.mp3','https://assets.mixkit.co/music/175/175.mp3'],
 ['music-hazy-after-hours.mp3','https://assets.mixkit.co/music/132/132.mp3'],
 ['slide.wav','https://assets.mixkit.co/active_storage/sfx/3120/3120.wav'],
 ['sweep.wav','https://assets.mixkit.co/active_storage/sfx/166/166.wav'],
 ['zoom.wav','https://assets.mixkit.co/active_storage/sfx/2608/2608.wav'],
 ['mosaic.wav','https://assets.mixkit.co/active_storage/sfx/3114/3114.wav'],
 ['alert.wav','https://assets.mixkit.co/active_storage/sfx/3121/3121.wav'],
 ['click.wav','https://assets.mixkit.co/active_storage/sfx/2568/2568.wav'],
 ['confirm.wav','https://assets.mixkit.co/active_storage/sfx/2574/2574.wav'],
 ['notification.wav','https://assets.mixkit.co/active_storage/sfx/1107/1107.wav'],
];
(async()=>{
 await fs.mkdir(dir,{recursive:true});
 for(const [name,url] of tracks){
  const target=path.join(dir,name);
  try{await fs.access(target);console.log('Cached',name);continue;}catch{}
  const response=await fetch(url);
  if(!response.ok)throw new Error(`${name}: HTTP ${response.status}`);
  await fs.writeFile(target,Buffer.from(await response.arrayBuffer()));
  console.log('Downloaded',name);
 }
})().catch(e=>{console.error(e);process.exitCode=1});
