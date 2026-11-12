const fs=require('node:fs/promises');
const sharp=require('../node_modules/sharp');
(async()=>{
 await fs.mkdir('public/fonts/siro',{recursive:true});
 const families=[['sans','Instrument+Sans:wght@400'],['sans500','Instrument+Sans:wght@500'],['sans600','Instrument+Sans:wght@600'],['sans700','Instrument+Sans:wght@700'],['display','Hedvig+Letters+Serif'],['italic','Instrument+Serif:ital@1']];
 for(const [name,family] of families){
  const css=await (await fetch('https://fonts.googleapis.com/css2?family='+family+'&display=swap',{headers:{'User-Agent':'Mozilla/5.0'}})).text();
  const urls=[...css.matchAll(/url\((https:[^)]+)\)/g)];
  if(!urls.length)throw Error('No font: '+name);
  const font=await fetch(urls.at(-1)[1]);
  if(!font.ok)throw Error('Font download failed');
  await fs.writeFile('public/fonts/siro/'+name+'.woff2',Buffer.from(await font.arrayBuffer()));
 }
 const {data,info}=await sharp('../src/assets/siro-bw.png').grayscale().raw().toBuffer({resolveWithObject:true});
 const pixels=Buffer.alloc(info.width*info.height*4);
 for(let i=0;i<info.width*info.height;i++){pixels[i*4]=255;pixels[i*4+1]=255;pixels[i*4+2]=255;pixels[i*4+3]=data[i*info.channels]>32?data[i*info.channels]:0;}
 await sharp(pixels,{raw:{width:info.width,height:info.height,channels:4}}).trim().png().toFile('public/art/siro-mark.png');
 await fs.copyFile('../public/images/siro-hero-architecture.webp','public/art/siro-architecture.webp');
 console.log('Siro website fonts, sharp logo, and architecture ready.');
})().catch(e=>{console.error(e);process.exit(1)});
