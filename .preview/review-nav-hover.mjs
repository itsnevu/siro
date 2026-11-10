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
async function navigate(path){await cmd('Page.navigate',{url:`http://localhost:3115${path}`});await delay(800);await evaluate('document.fonts.ready.then(()=>true)');await delay(250);}
async function screenshot(name){const {data}=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`.preview/${name}.png`,Buffer.from(data,'base64'));}
mkdirSync('.preview',{recursive:true});
try {
 await cmd('Runtime.enable');await cmd('Page.enable');await cmd('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await navigate('/');
 const chipBefore=await evaluate('[...document.querySelectorAll("#nav>.nav-dropdown>button,#nav>a")].map(e=>({x:e.getBoundingClientRect().x,width:e.getBoundingClientRect().width}))');
 const trigger=await evaluate('(()=>{const r=document.querySelector(".nav-dropdown-trigger").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,bottom:r.bottom}})()');
 await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',x:trigger.x,y:trigger.y});await delay(35);
 const opening=await evaluate('(()=>{const e=document.querySelector(".nav-dropdown-menu");const r=e.getBoundingClientRect();return {center:r.x+r.width/2,animation:getComputedStyle(e).animationName}})()');await delay(250);
 const settled=await evaluate('(()=>{const r=document.querySelector(".nav-dropdown-menu").getBoundingClientRect();return {center:r.x+r.width/2,top:r.top}})()');
 console.log('Dropdown positioning',{opening,settled,horizontalJump:Math.abs(opening.center-settled.center)});
 await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',x:trigger.x,y:trigger.bottom+4});await delay(100);
 console.log('Hover bridge',await evaluate('document.querySelector(".nav-dropdown-trigger").getAttribute("aria-expanded")'));
 await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',x:trigger.x,y:settled.top+30});await delay(100);
 console.log('Pointer reaches panel',await evaluate('!!document.querySelector(".nav-dropdown-menu")'));
 await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',x:trigger.x,y:trigger.y});await cmd('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:trigger.x,y:trigger.y});await cmd('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:trigger.x,y:trigger.y});
 console.log('Click after hover stays open',await evaluate('document.querySelector(".nav-dropdown-trigger").getAttribute("aria-expanded")'));
 console.log('Chip geometry stable',await evaluate(`JSON.stringify([...document.querySelectorAll('#nav>.nav-dropdown>button,#nav>a')].map(e=>({x:e.getBoundingClientRect().x,width:e.getBoundingClientRect().width})))===${JSON.stringify(JSON.stringify(chipBefore))}`));
 await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});console.log('Escape closes',await evaluate('!document.querySelector(".nav-dropdown-menu")'));
 await cmd('Emulation.setDeviceMetricsOverride',{width:375,height:900,deviceScaleFactor:1,mobile:true});await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await navigate('/');await evaluate('document.querySelector(".dockyard-nav-toggle").click()');
 const touch=await evaluate('(()=>{const r=document.querySelector(".nav-dropdown-trigger").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
 async function tap(){await cmd('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await cmd('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(250);}
 await tap();console.log('Touch opens',await evaluate('document.querySelector(".nav-dropdown-trigger").getAttribute("aria-expanded")'));await tap();console.log('Touch closes',await evaluate('document.querySelector(".nav-dropdown-trigger").getAttribute("aria-expanded")'));
 console.log('Browser errors',errors);
}finally{await call('Browser.close').catch(()=>{});socket.close();}
