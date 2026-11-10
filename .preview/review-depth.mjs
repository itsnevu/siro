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
async function navigate(path){await cmd('Page.navigate',{url:`http://localhost:3101${path}`});await delay(800);await evaluate('document.fonts.ready.then(()=>true)');await delay(250);}
async function screenshot(name){const {data}=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`.preview/${name}.png`,Buffer.from(data,'base64'));}
mkdirSync('.preview',{recursive:true});
try {
 await cmd('Runtime.enable');await cmd('Page.enable');
 await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
 await navigate('/');await delay(500);
 console.log('Original identity + floating header',await evaluate('JSON.stringify({logo:document.querySelector(".dockyard-logo-mark").getAttribute("src"),font:getComputedStyle(document.querySelector("h1")).fontFamily,bg:getComputedStyle(document.body).backgroundColor,headerTop:document.querySelector(".rusd-topbar-inner").getBoundingClientRect().top,radius:getComputedStyle(document.querySelector(".rusd-topbar-inner")).borderRadius})'));
 await screenshot('siro-floating-header');
 await evaluate('document.documentElement.style.scrollBehavior="auto";document.querySelector(".ed-hero-visual").scrollIntoView({behavior:"instant",block:"center"})');await delay(900);
 console.log('Idle float',await evaluate('JSON.stringify({active:document.querySelector(".ed-hero-depth").getAttribute("data-moving"),animation:getComputedStyle(document.querySelector(".ed-sculpture-float")).animationName,perspective:getComputedStyle(document.querySelector(".ed-hero-depth")).perspective})'));
 const point=await evaluate('(()=>{const r=document.querySelector(".ed-hero-depth").getBoundingClientRect();return {x:r.x+r.width*.85,y:r.y+r.height*.3}})()');
 const before=await evaluate('getComputedStyle(document.querySelector(".ed-brand-sculpture")).transform');
 await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x,y:point.y});await delay(900);
 console.log('3D pointer tilt',await evaluate(`JSON.stringify({changed:getComputedStyle(document.querySelector('.ed-brand-sculpture')).transform!==${JSON.stringify(before)},matrix:getComputedStyle(document.querySelector('.ed-brand-sculpture')).transform})`));
 await screenshot('siro-hero-3d');
 await evaluate('document.querySelector("#how").scrollIntoView({behavior:"instant",block:"start"})');await delay(800);
 console.log('Offscreen pause',await evaluate('JSON.stringify({active:document.querySelector(".ed-hero-depth").getAttribute("data-moving"),playState:getComputedStyle(document.querySelector(".ed-sculpture-float")).animationPlayState})'));
 await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await navigate('/');
 console.log('Mobile',await evaluate('JSON.stringify({overflow:document.documentElement.scrollWidth>innerWidth,headerTop:document.querySelector(".rusd-topbar-inner").getBoundingClientRect().top,headerWidth:document.querySelector(".rusd-topbar-inner").getBoundingClientRect().width})'));
 await evaluate('document.querySelector(".dockyard-nav-toggle").click()');await delay(300);
 console.log('Floating mobile menu',await evaluate('JSON.stringify({open:document.querySelector("#nav").getAttribute("data-open"),bounds:document.querySelector("#nav").getBoundingClientRect().toJSON(),locked:document.body.style.overflow})'));await screenshot('siro-floating-menu');
 console.log('Menu containing blocks',await evaluate('JSON.stringify((()=>{const result=[];for(let e=document.querySelector("#nav");e;e=e.parentElement){const s=getComputedStyle(e);result.push({tag:e.tagName,cls:e.className,position:s.position,inset:s.inset,transform:s.transform,filter:s.filter,backdrop:s.backdropFilter,contain:s.contain,willChange:s.willChange,translate:s.translate});}return result})())'));
 await evaluate('document.querySelector(".dockyard-nav-toggle").click();document.documentElement.style.scrollBehavior="auto";document.querySelector(".ed-hero-visual").scrollIntoView({behavior:"instant",block:"center"})');await delay(400);await screenshot('siro-3d-mobile');
 await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await delay(800);
 const reducedBefore=await evaluate('getComputedStyle(document.querySelector(".ed-sculpture-float")).transform');await delay(500);
 console.log('Reduced motion',await evaluate(`JSON.stringify({active:document.querySelector('.ed-hero-depth').getAttribute('data-moving'),animation:getComputedStyle(document.querySelector('.ed-sculpture-float')).animationName,stable:getComputedStyle(document.querySelector('.ed-sculpture-float')).transform===${JSON.stringify(reducedBefore)}})`));
 console.log('Browser errors',errors);
} finally {await call('Browser.close').catch(()=>{});socket.close();}
