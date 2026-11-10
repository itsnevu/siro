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
async function navigate(path){await cmd('Page.navigate',{url:`http://localhost:3001${path}`});await delay(800);await evaluate('document.fonts.ready.then(()=>true)');await delay(250);}
async function screenshot(name){const {data}=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`.preview/${name}.png`,Buffer.from(data,'base64'));}
mkdirSync('.preview',{recursive:true});
try{
await cmd('Runtime.enable');await cmd('Page.enable');await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
const results=[];
for(const path of ['/status','/changelog','/how-it-works','/brand','/referral','/contact','/community','/cookies','/x402','/app/onboarding']){await navigate(path);results.push(await evaluate('({path:location.pathname,h1:document.querySelector("h1")?.innerText,notFound:document.body.innerText.includes("This page could not be found"),overflow:document.documentElement.scrollWidth>innerWidth,broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)})'));}
for(const parent of ['/markets','/strategies','/blog']){await navigate(parent);const links=await evaluate('[...document.querySelectorAll("main a[href]")].map(a=>a.getAttribute("href"))');const route=links.find(h=>h.startsWith(parent+'/'));if(route){await navigate(route);results.push(await evaluate('({path:location.pathname,h1:document.querySelector("h1")?.innerText,notFound:document.body.innerText.includes("This page could not be found"),overflow:document.documentElement.scrollWidth>innerWidth})'));}}
await navigate('/app/policies');await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Save Policies"))?.click()');console.log('policies',await evaluate('document.body.innerText.slice(-240)'));
await navigate('/app/approvals');console.log('approval before',await evaluate('document.querySelector("main").innerText.slice(0,90)'));await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Approve")?.click()');console.log('approval after',await evaluate('document.querySelector("main").innerText.slice(0,90)'));
console.log(JSON.stringify(results,null,2));console.log('errors',errors);writeFileSync('.preview/testnet-extra-results.json',JSON.stringify({routes:results,errors},null,2));
}finally{await call('Browser.close').catch(()=>{});socket.close();}
