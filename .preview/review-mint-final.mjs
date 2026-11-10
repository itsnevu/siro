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
async function navigate(path){await cmd('Page.navigate',{url:`http://localhost:3111${path}`});await delay(800);await evaluate('document.fonts.ready.then(()=>true)');await delay(250);}
async function screenshot(name){const {data}=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`.preview/${name}.png`,Buffer.from(data,'base64'));}
mkdirSync('.preview',{recursive:true});
mkdirSync('.preview/mint',{recursive:true});
try {
 await cmd('Runtime.enable');await cmd('Page.enable');
 await cmd('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 for(const mode of ['light','dark']) {
  await cmd('Page.navigate',{url:'about:blank'});await delay(150);
  await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:mode},{name:'prefers-reduced-motion',value:'reduce'}]});await navigate('/');await delay(800);
  await evaluate('document.documentElement.style.scrollBehavior="auto"');await screenshot(`mint/${mode}-hero`);
  console.log(mode,await evaluate('JSON.stringify({bg:getComputedStyle(document.body).backgroundColor,primaryText:getComputedStyle(document.querySelector(".btn-primary")).color,headlineText:getComputedStyle(document.querySelector(".headline-pill")).color,themeMeta:document.querySelector("meta[name=theme-color]").content})'));
  for(const [name,selector] of [['visual','.ed-hero-visual'],['cards','.ed-strategies'],['dark-section','.ed-home > [data-tone=dark]'],['footer','.ed-footer']]){await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior:'instant',block:'center'})`);await delay(1000);await screenshot(`mint/${mode}-${name}`);}
  await cmd('Emulation.setDeviceMetricsOverride',{width:375,height:900,deviceScaleFactor:1,mobile:true});await navigate('/');await screenshot(`mint/${mode}-mobile`);
  await evaluate('document.querySelector(".dockyard-nav-toggle").click()');await delay(200);console.log(mode+' mobile menu',await evaluate('JSON.stringify({width:document.querySelector("#nav").getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth})'));
  await cmd('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 }
 for(const path of ['/strategies','/token','/buyback']){await navigate(path);console.log('Financial copy '+path,await evaluate('JSON.stringify({meta:[...document.querySelectorAll("main [style*=color]")].slice(0,3).map(e=>({color:getComputedStyle(e).color,text:e.textContent.slice(0,20)})),overflow:document.documentElement.scrollWidth>innerWidth})'));}
 for(const path of ['/favicon.ico','/icon','/opengraph-image','/brand/mark?mint=1']){const r=await fetch('http://localhost:3111'+path);console.log('Asset',path,r.status,r.headers.get('content-type'));}
 console.log('Browser errors',errors);
}finally{await call('Browser.close').catch(()=>{});socket.close();}
