const {bundle}=require('@remotion/bundler');
const {selectComposition,renderStill}=require('@remotion/renderer');
const sharp=require('../node_modules/sharp');
const fs=require('node:fs/promises');
(async()=>{
 await fs.mkdir('out/audit',{recursive:true});
 const serveUrl=await bundle({entryPoint:require('node:path').resolve('src/index.ts')});
 const composition=await selectComposition({serveUrl,id:'SIRO-AGENT-LAUNCH'});
 const frames=[12,40,53,77,100,110,128,147,158,175,193,200,222,252,260,285,312,320,342,363,372,398,432,440,470,507,517,537,550,575,599];
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
