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
socket.onmessage=event=>{const message=JSON.parse(event.data); if(message.id){const task=pending.get(message.id);if(task){pending.delete(message.id);message.error?task.reject(new Error(message.error.message)):task.resolve(message.result);}} if(message.method==='Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description??JSON.stringify(message.params.exceptionDetails));};
function call(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,sessionId}));});}
const {targetId}=await call('Target.createTarget',{url:'about:blank'});
const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
const cmd=(method,params={})=>call(method,params,sessionId);
const evaluate=async expression=>(await cmd('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result.value;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function navigate(path){await cmd('Page.navigate',{url:`http://localhost:3116${path}`});await delay(800);await evaluate('document.fonts.ready.then(()=>true)');await delay(250);}
async function screenshot(name){const {data}=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`.preview/${name}.png`,Buffer.from(data,'base64'));}
mkdirSync('.preview',{recursive:true});
mkdirSync('.preview/launch',{recursive:true});
try{
 await cmd('Runtime.enable');await cmd('Page.enable');
 for(const mode of ['light','dark']){
  await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:mode},{name:'prefers-reduced-motion',value:'reduce'}]});
  await cmd('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});await navigate('/launch');await delay(500);await screenshot(`launch/${mode}-desktop`);
  console.log(mode+' launch',await evaluate('JSON.stringify({overflow:document.documentElement.scrollWidth>innerWidth,bg:getComputedStyle(document.body).backgroundColor,button:getComputedStyle(document.querySelector(".launch-continue-btn")).backgroundColor,panel:getComputedStyle(document.querySelector(".launch-left")).backgroundColor,logo:!!document.querySelector(".launch-feature-mark.siro-brand-mask"),fakeEmail:!!document.querySelector(".launch-email-submit")})'));
  await evaluate('document.querySelector(".launch-continue-btn").click()');await delay(500);await screenshot(`launch/${mode}-modal`);console.log(mode+' modal',await evaluate('JSON.stringify({dialog:!!document.querySelector("[role=dialog]"),locked:document.body.style.overflow,text:document.querySelector(".launch-wallet-list").innerText,focused:document.activeElement?.getAttribute("aria-label")})'));
  await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});console.log('Modal closes',await evaluate('!document.querySelector("[role=dialog]")'));
  await cmd('Emulation.setDeviceMetricsOverride',{width:375,height:900,deviceScaleFactor:1,mobile:true});await navigate('/launch');await screenshot(`launch/${mode}-mobile`);console.log(mode+' mobile',await evaluate('JSON.stringify({overflow:document.documentElement.scrollWidth>innerWidth,leftWidth:document.querySelector(".launch-left").getBoundingClientRect().width,rightWidth:document.querySelector(".launch-right").getBoundingClientRect().width})'));
 }
 await cmd('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 for(const path of ['/app','/app/portfolio','/app/studio','/app/agent','/app/strategies','/app/approvals','/app/schedules','/app/policies','/app/token','/app/settings','/studio','/agent','/security','/about','/roadmap','/stats','/pricing','/strategies','/token','/markets','/docs','/blog']){await navigate(path);console.log(path,await evaluate('JSON.stringify({h1:document.querySelector("h1")?.innerText,overflow:document.documentElement.scrollWidth>innerWidth,active:document.querySelector(".workspace-sections [aria-current=page]")?.textContent})'));if(path==='/app')await screenshot('launch/workspace');if(path==='/studio')await screenshot('launch/studio');}
 await cmd('Emulation.setDeviceMetricsOverride',{width:375,height:900,deviceScaleFactor:1,mobile:true});await navigate('/app/studio');console.log('Workspace mobile',await evaluate('JSON.stringify({overflow:document.documentElement.scrollWidth>innerWidth,navScroll:document.querySelector(".workspace-sections").scrollWidth>document.querySelector(".workspace-sections").clientWidth})'));await screenshot('launch/workspace-mobile');
 console.log('Browser errors',errors);
}finally{await call('Browser.close').catch(()=>{});socket.close();}
