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
async function navigate(path){await cmd('Page.navigate',{url:`http://localhost:3114${path}`});await delay(800);await evaluate('document.fonts.ready.then(()=>true)');await delay(250);}
async function screenshot(name){const {data}=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`.preview/${name}.png`,Buffer.from(data,'base64'));}
mkdirSync('.preview',{recursive:true});
mkdirSync('.preview/antique',{recursive:true});
try {
 await cmd('Runtime.enable');await cmd('Page.enable');
 for(const mode of ['light','dark']){
  await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:mode},{name:'prefers-reduced-motion',value:'reduce'}]});await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});await navigate('/');await evaluate('document.documentElement.style.scrollBehavior="auto"');
  for(const [name,selector] of [['pillar','#why'],['urn','.ed-manifesto'],['arch','.ed-faq-section']]){await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior:'instant',block:'center'})`);await delay(800);await screenshot(`antique/${mode}-${name}`);}
  console.log(mode,await evaluate('JSON.stringify({overflow:document.documentElement.scrollWidth>innerWidth,art:[...document.querySelectorAll(".classical-art")].map(e=>({name:e.className,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,color:getComputedStyle(e).color,mask:getComputedStyle(e.firstElementChild).maskImage})),faqPlus:getComputedStyle(document.querySelector(".rusd-faq-toggle"),"::before").margin})'));
 }
 for(const width of [375,768]){await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:true});await navigate('/');await evaluate('document.documentElement.style.scrollBehavior="auto";document.querySelector(".ed-manifesto").scrollIntoView({behavior:"instant",block:"center"})');await delay(500);await screenshot(`antique/mobile-${width}`);console.log(width,await evaluate('JSON.stringify({overflow:document.documentElement.scrollWidth>innerWidth,column:getComputedStyle(document.querySelector(".classical-why")).display,urn:document.querySelector(".classical-manifesto").getBoundingClientRect().toJSON(),arch:getComputedStyle(document.querySelector(".classical-faq")).display})'));}
 for(const name of ['column','urn','arch']){const r=await fetch(`http://localhost:3114/assets/illustrations/pyris-${name}.svg?framed=1`);console.log('Asset',name,r.status,(await r.text()).match(/viewBox="([^"]+)"/)?.[1]);}
 console.log('Browser errors',errors);
}finally{await call('Browser.close').catch(()=>{});socket.close();}
