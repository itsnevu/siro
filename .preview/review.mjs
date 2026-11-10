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
async function navigate(path){await cmd('Page.navigate',{url:`http://localhost:3100${path}`});await delay(800);await evaluate('document.fonts.ready.then(()=>true)');await delay(250);}
async function screenshot(name){const {data}=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`.preview/${name}.png`,Buffer.from(data,'base64'));}
mkdirSync('.preview',{recursive:true});
try {
 await cmd('Runtime.enable');await cmd('Page.enable');
 await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
 await navigate('/');
 console.log('Desktop',await evaluate('JSON.stringify({title:document.title,h1:document.querySelector("h1").innerText,background:getComputedStyle(document.body).backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth,serif:getComputedStyle(document.querySelector("h1")).fontFamily})'));
 await screenshot('siro-desktop');
 await evaluate('document.querySelector("#how").scrollIntoView()');await delay(200);
 await evaluate('[...document.querySelectorAll(".ed-tabs button")].find(b=>b.textContent.includes("Studio")).click()');await delay(600);
 console.log('Tabs',await evaluate('document.querySelector(".ed-product-copy h3").innerText'));
 await screenshot('siro-workspace');
 await evaluate('document.documentElement.style.scrollBehavior="auto";document.querySelector(".ed-home > [data-tone=dark]").scrollIntoView({behavior:"instant"})');await delay(1100);
 console.log('Dark tone',await evaluate('JSON.stringify({target:document.documentElement.style.getPropertyValue("--page-bg"),actual:getComputedStyle(document.documentElement).getPropertyValue("--page-bg")})'));await screenshot('siro-footer');
 await evaluate('scrollTo({top:0,behavior:"instant"})');await delay(1100);console.log('Return to light',await evaluate('getComputedStyle(document.documentElement).getPropertyValue("--page-bg")'));
 await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await navigate('/');await screenshot('siro-mobile');
 console.log('Mobile',await evaluate('JSON.stringify({overflow:document.documentElement.scrollWidth>innerWidth,menuButton:getComputedStyle(document.querySelector(".dockyard-nav-toggle")).display})'));
 await evaluate('document.querySelector(".dockyard-nav-toggle").click()');await delay(200);
 console.log('Menu',await evaluate('JSON.stringify({open:document.querySelector("#nav").getAttribute("data-open"),height:document.querySelector("#nav").getBoundingClientRect().height,lock:document.body.style.overflow})'));await screenshot('siro-mobile-menu');
 await navigate('/strategies');
 console.log('Mobile table',await evaluate('JSON.stringify({overflow:document.documentElement.scrollWidth>innerWidth,table:!!document.querySelector(".ed-responsive-table"),label:document.querySelector("tbody td")?.getAttribute("data-label"),rowDisplay:getComputedStyle(document.querySelector("tbody tr")).display})'));await screenshot('siro-mobile-strategies');
 if (!process.argv.includes('--quick')) for (const path of ['/studio','/agent','/pricing','/markets','/token','/tokenomics','/buyback','/stats','/security','/roadmap','/about','/blog','/terms','/api','/faq','/legal','/strategies/alpha-momentum']) {await navigate(path);console.log(path,await evaluate('JSON.stringify({h1:document.querySelector("h1")?.innerText,overflow:document.documentElement.scrollWidth>innerWidth,header:!!document.querySelector("header"),footer:!!document.querySelector("footer")})'));}
 await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await navigate('/');const before=await evaluate('document.querySelector(".headline-pill").innerText');await delay(3000);console.log('Reduced motion',await evaluate(`JSON.stringify({stable:document.querySelector('.headline-pill').innerText===${JSON.stringify(before)},wordOpacity:getComputedStyle(document.querySelector('.ed-manifesto .serif-headline span')).opacity})`));
 console.log('Browser errors',errors);
} finally { await call('Browser.close').catch(()=>{});socket.close(); }
