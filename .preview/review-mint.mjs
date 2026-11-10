import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const profile = mkdtempSync(join(tmpdir(),'siro-ui-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--disable-default-apps','about:blank'], { windowsHide:true, stdio:['ignore','ignore','pipe'] });
const url = await new Promise((resolve,reject) => {
  let output='';
  const timer=setTimeout(()=>reject(new Error('Browser startup timed out')),15000);
  chrome.on('error',reject);
  chrome.stderr.on('data',chunk=>{output+=chunk; const match=output.match(/DevTools listening on (ws:\/\/[^\s]+)/); if(match){clearTimeout(timer);resolve(match[1]);}});
});
const socket = new WebSocket(url);
await new Promise((resolve,reject)=>{ socket.onopen=resolve;socket.onerror=reject; });
let nextId=0;
const pending=new Map();
const errors=[];
socket.onmessage=event=>{const message=JSON.parse(event.data); if(message.id){const task=pending.get(message.id);if(task){pending.delete(message.id);message.error?task.reject(new Error(message.error.message)):task.resolve(message.result);}} if(message.method==='Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);};
function call(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,sessionId}));});}
const {targetId}=await call('Target.createTarget',{url:'about:blank'});
const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
const cmd=(method,params={})=>call(method,params,sessionId);
const evaluate=async expression=>(await cmd('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result.value;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function navigate(path){await cmd('Page.navigate',{url:`http://localhost:3110${path}`});await delay(800);await evaluate('document.fonts.ready.then(()=>true)');await delay(250);}
async function screenshot(name){const {data}=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`.preview/${name}.png`,Buffer.from(data,'base64'));}
mkdirSync('.preview',{recursive:true});
mkdirSync('.preview/mint',{recursive:true});
try {
 await cmd('Runtime.enable');await cmd('Page.enable');
 await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await cmd('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 for(const mode of ['light','dark']) {
  await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:mode},{name:'prefers-reduced-motion',value:'reduce'}]});
  await navigate('/');await delay(300);
  await evaluate('document.documentElement.style.scrollBehavior="auto"');
  console.log(mode+' hero',await evaluate('JSON.stringify({dark:document.documentElement.classList.contains("dark"),bg:getComputedStyle(document.body).backgroundColor,fg:getComputedStyle(document.querySelector("h1")).color,primaryBg:getComputedStyle(document.querySelector(".ed-actions .btn-primary")).backgroundColor,primaryText:getComputedStyle(document.querySelector(".ed-actions .btn-primary")).color,overflow:document.documentElement.scrollWidth>innerWidth,shape:document.querySelector(".ed-brand-sculpture img").getAttribute("src"),imageLoaded:document.querySelector(".ed-brand-sculpture img").naturalWidth})'));
  await screenshot(`mint/${mode}-hero`);
  for(const [name,selector] of [['visual','.ed-hero-visual'],['cards','.ed-strategies'],['dark-section','.ed-home > [data-tone=dark]'],['footer','.ed-footer']]) {
   await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior:'instant',block:'center'})`);await delay(950);await screenshot(`mint/${mode}-${name}`);
  }
  console.log(mode+' footer',await evaluate('JSON.stringify({bg:getComputedStyle(document.querySelector("footer")).backgroundColor,text:getComputedStyle(document.querySelector("footer .ed-wordmark")).color,cta:getComputedStyle(document.querySelector(".ed-home>[data-tone=dark] .btn-primary")).backgroundColor,ctaText:getComputedStyle(document.querySelector(".ed-home>[data-tone=dark] .btn-primary")).color})'));
 }
 for(const mode of ['light','dark']) {
  await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:mode},{name:'prefers-reduced-motion',value:'reduce'}]});
  for(const width of [375,768,1600]) {
   await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<769});await navigate('/');
   console.log(mode+' '+width,await evaluate('JSON.stringify({overflow:document.documentElement.scrollWidth>innerWidth,bg:getComputedStyle(document.body).backgroundColor})'));
   if(width===375)await screenshot(`mint/${mode}-mobile`);
  }
 }
 await cmd('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 for(const path of ['/strategies','/strategies/alpha-momentum','/studio','/agent','/markets','/token','/tokenomics','/buyback','/api','/stats','/pricing','/security','/roadmap','/about','/faq','/blog','/legal','/launch']) {
  await navigate(path);console.log(path,await evaluate('JSON.stringify({h1:document.querySelector("h1")?.innerText,overflow:document.documentElement.scrollWidth>innerWidth,brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)})'));
 }
 const icon=await fetch('http://localhost:3110/icon');const png=Buffer.from(await icon.arrayBuffer());
 console.log('Icon endpoint',{status:icon.status,bytes:png.length,signature:png.subarray(1,4).toString()});writeFileSync('.preview/mint/icon.png',png);
 if(icon.ok&&png.subarray(1,4).toString()==='PNG') {
  const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header[6]=64;header[7]=64;header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);
  writeFileSync('src/app/favicon.ico',Buffer.concat([header,png]));writeFileSync('public/favicon.ico',Buffer.concat([header,png]));
 }
 const og=await fetch('http://localhost:3110/opengraph-image');console.log('OG endpoint',og.status);if(og.ok)writeFileSync('.preview/mint/opengraph.png',Buffer.from(await og.arrayBuffer()));
 console.log('Browser errors',errors);
}finally{await call('Browser.close').catch(()=>{});socket.close();}
