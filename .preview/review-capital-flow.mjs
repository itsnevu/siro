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
socket.onmessage=event=>{const message=JSON.parse(event.data); if(message.id){const task=pending.get(message.id);if(task){pending.delete(message.id);message.error?task.reject(new Error(message.error.message)):task.resolve(message.result);}} if(message.method==='Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description??message.params.exceptionDetails.text);};
function call(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,sessionId}));});}
const {targetId}=await call('Target.createTarget',{url:'about:blank'});
const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
const cmd=(method,params={})=>call(method,params,sessionId);
const evaluate=async expression=>(await cmd('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result.value;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function navigate(path){await cmd('Page.navigate',{url:`http://localhost:3119${path}`});await delay(800);await evaluate('document.fonts.ready.then(()=>true)');await delay(250);}
async function screenshot(name){const {data}=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`.preview/${name}.png`,Buffer.from(data,'base64'));}
mkdirSync('.preview',{recursive:true});
mkdirSync('.preview/capital-flow',{recursive:true});
try{
 await cmd('Runtime.enable');await cmd('Page.enable');
 for(const mode of ['light','dark']){
  await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:mode},{name:'prefers-reduced-motion',value:'no-preference'}]});await cmd('Emulation.setDeviceMetricsOverride',{width:1600,height:1050,deviceScaleFactor:1,mobile:false});await navigate('/');await delay(900);await screenshot(`capital-flow/${mode}-desktop`);
  console.log(mode,await evaluate('JSON.stringify({overflow:document.documentElement.scrollWidth>innerWidth,moving:document.querySelector(".capital-flow").dataset.moving,coins:document.querySelectorAll(".capital-travelling-token").length,paused:document.querySelector(".capital-flow-lines").animationsPaused(),wallet:document.querySelector(".capital-wallet-anchor").getBoundingClientRect().toJSON(),ctaHit:(()=>{const e=document.querySelector(".ed-actions .btn-primary"),r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest("a")===e})()})'));
 }
 const coin1=await evaluate('document.querySelector(".capital-travelling-token").getCTM().e');await delay(500);console.log('Tokens travel',await evaluate(`document.querySelector('.capital-travelling-token').getCTM().e!==${coin1}`));
 await evaluate('document.documentElement.style.scrollBehavior="auto";document.querySelector("#how").scrollIntoView({behavior:"instant"})');await delay(700);console.log('Offscreen pause',await evaluate('JSON.stringify({moving:document.querySelector(".capital-flow").dataset.moving,paused:document.querySelector(".capital-flow-lines").animationsPaused()})'));
 for(const width of [375,768,1280]){await cmd('Emulation.setDeviceMetricsOverride',{width,height:950,deviceScaleFactor:1,mobile:width<769});await navigate('/');await delay(300);console.log(width,await evaluate('JSON.stringify({overflow:document.documentElement.scrollWidth>innerWidth,wallet:document.querySelector(".capital-wallet-anchor").getBoundingClientRect().toJSON(),primary:document.querySelector(".ed-actions .btn-primary").getBoundingClientRect().toJSON()})'));await screenshot(`capital-flow/dark-${width}`);}
 await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'},{name:'prefers-reduced-motion',value:'reduce'}]});await delay(300);console.log('Reduced motion',await evaluate('JSON.stringify({moving:document.querySelector(".capital-flow").dataset.moving,coins:document.querySelectorAll(".capital-travelling-token").length,paused:document.querySelector(".capital-flow-lines").animationsPaused(),walletAnimation:getComputedStyle(document.querySelector(".capital-wallet-float")).animationName})'));
 console.log('Browser errors',errors);
}finally{await call('Browser.close').catch(()=>{});socket.close();}
