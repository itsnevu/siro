const {bundle}=require('@remotion/bundler');
const {selectComposition,renderStill}=require('@remotion/renderer');
const sharp=require('../node_modules/sharp');
const fs=require('node:fs/promises');
(async()=>{
 await fs.mkdir('out/audit',{recursive:true});
 const serveUrl=await bundle({entryPoint:require('node:path').resolve('src/index.ts')});
 const composition=await selectComposition({serveUrl,id:'SIRO-AGENT-LAUNCH'});
 const timing=await fs.readFile('src/timing.ts','utf8');
 const shots=JSON.parse(timing.match(/SHOTS = (\[[^;]+\])/)[1]);
 const transitions=JSON.parse(timing.match(/TRANSITIONS = (\[[^;]+\])/)[1]);
 const intro=Number(timing.match(/INTRO_OVERLAP = (\d+)/)[1]);
 const strategy=Number(timing.match(/STRATEGY_OVERLAP = (\d+)/)[1]);
 const overlaps=[intro,transitions[0],transitions[1],strategy,...transitions.slice(2)];
 let start=0;
 const sampled=[0,18,44,66,82,100,115,composition.durationInFrames-1];
 for(let i=1;i<shots.length;i++){
  start+=shots[i-1]-overlaps[i-1];
  const length=overlaps[i-1];
  sampled.push(start-1,start,start+Math.floor(length*.25),start+Math.floor(length*.5),start+Math.floor(length*.75),start+length-1,start+length);
  sampled.push(Math.min(composition.durationInFrames-1,start+Math.floor(shots[i]*.6)));
 }
 const frames=[...new Set(sampled)].sort((a,b)=>a-b);
 for(let i=0;i<frames.length;i+=3){await Promise.all(frames.slice(i,i+3).map(frame=>renderStill({serveUrl,composition,frame,scale:1/3,imageFormat:'png',output:'out/audit/'+frame+'.png',logLevel:'error'})));}
 const layers=[];
 for(let i=0;i<frames.length;i++){
  const label=Buffer.from(`<svg width="640" height="30"><rect width="640" height="30" fill="#191B27"/><text x="12" y="22" font-family="Arial" font-size="18" fill="white">FRAME ${frames[i]}</text></svg>`);
  layers.push({input:'out/audit/'+frames[i]+'.png',left:i%4*640,top:Math.floor(i/4)*390});
  layers.push({input:label,left:i%4*640,top:Math.floor(i/4)*390+360});
 }
 await sharp({create:{width:2560,height:Math.ceil(frames.length/4)*390,channels:3,background:'#0A0B12'}}).composite(layers).png().toFile('out/audit/contact.png');
 console.log('Checked '+frames.length+' frames: out/audit/contact.png');
})().catch(e=>{console.error(e);process.exit(1)});
