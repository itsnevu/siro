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
try {
await cmd('Runtime.enable');await cmd('Page.enable');await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
const routes=['/','/launch','/strategies','/studio','/agent','/markets','/token','/tokenomics','/buyback','/api','/stats','/pricing','/security','/roadmap','/about','/faq','/blog','/legal','/docs','/whitepaper','/risk','/terms','/privacy','/app','/app/portfolio','/app/strategies','/app/studio','/app/agent','/app/approvals','/app/schedules','/app/policies','/app/token','/app/settings'];
const results=[];
for(const path of routes){await navigate(path);const data=await evaluate('({path:location.pathname,title:document.title,h1:document.querySelector("h1")?.innerText,notFound:document.body.innerText.includes("This page could not be found"),overflow:document.documentElement.scrollWidth>innerWidth,brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.getAttribute("src"))})');results.push(data);console.log(JSON.stringify(data));}
await navigate('/launch');await evaluate('document.querySelector(".launch-continue-btn").click()');await delay(300);console.log('no-wallet',await evaluate('document.querySelector("[role=dialog]")?.innerText'));
await screenshot('audit-no-wallet');
const mock=`(()=>{const listeners={};window.__walletCalls=[];window.ethereum={isMetaMask:true,on:(n,f)=>(listeners[n]??=[]).push(f),removeListener:(n,f)=>{listeners[n]=(listeners[n]??[]).filter(x=>x!==f)},request:async({method,params})=>{window.__walletCalls.push({method,params});if(method==='eth_chainId')return '0x185d9';if(method==='eth_accounts'||method==='eth_requestAccounts')return ['0x1111111111111111111111111111111111111111'];if(method==='wallet_requestPermissions'||method==='wallet_getPermissions')return [{parentCapability:'eth_accounts'}];if(method==='eth_getBalance')return '0x0';if(method==='wallet_revokePermissions')return null;throw Object.assign(new Error('Unsupported test method: '+method),{code:4200});}}})();`;
await cmd('Page.addScriptToEvaluateOnNewDocument',{source:mock});await navigate('/launch');await delay(1000);
if(await evaluate('!!document.querySelector(".launch-continue-btn")')){await evaluate('document.querySelector(".launch-continue-btn").click()');await delay(500);console.log('detected-wallet',await evaluate('document.querySelector("[role=dialog]")?.innerText'));await evaluate('document.querySelector(".launch-wallet-item")?.click()');await delay(1800);}
console.log('connected',await evaluate('({path:location.pathname,disconnect:[...document.querySelectorAll("button")].some(b=>b.textContent.includes("Disconnect")),calls:window.__walletCalls})'));await screenshot('audit-connected');
await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Disconnect"))?.click()');await delay(500);console.log('disconnect',await evaluate('({connect:[...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Connect"),path:location.pathname})'));
await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
for(const path of ['/','/launch','/app','/app/portfolio','/app/policies','/markets','/token']){await navigate(path);console.log('mobile',path,await evaluate('document.documentElement.scrollWidth>innerWidth'));}
writeFileSync('.preview/testnet-browser-results.json',JSON.stringify({routes:results,errors},null,2));console.log('errors',errors);
}finally{await call('Browser.close').catch(()=>{});socket.close();}
