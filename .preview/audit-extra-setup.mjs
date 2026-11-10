import fs from 'node:fs';
let base=fs.readFileSync('.preview/review-launch-final.mjs','utf8').split('\ntry{')[0].replace('localhost:3117','localhost:3001');
base+=`\ntry{
await cmd('Runtime.enable');await cmd('Page.enable');await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
const results=[];
for(const path of ['/status','/changelog','/how-it-works','/brand','/referral','/contact','/community','/cookies','/x402','/app/onboarding']){await navigate(path);results.push(await evaluate('({path:location.pathname,h1:document.querySelector("h1")?.innerText,notFound:document.body.innerText.includes("This page could not be found"),overflow:document.documentElement.scrollWidth>innerWidth,broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)})'));}
for(const parent of ['/markets','/strategies','/blog']){await navigate(parent);const links=await evaluate('[...document.querySelectorAll("main a[href]")].map(a=>a.getAttribute("href"))');const route=links.find(h=>h.startsWith(parent+'/'));if(route){await navigate(route);results.push(await evaluate('({path:location.pathname,h1:document.querySelector("h1")?.innerText,notFound:document.body.innerText.includes("This page could not be found"),overflow:document.documentElement.scrollWidth>innerWidth})'));}}
await navigate('/app/policies');await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Save Policies"))?.click()');console.log('policies',await evaluate('document.body.innerText.slice(-240)'));
await navigate('/app/approvals');console.log('approval before',await evaluate('document.querySelector("main").innerText.slice(0,90)'));await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Approve")?.click()');console.log('approval after',await evaluate('document.querySelector("main").innerText.slice(0,90)'));
console.log(JSON.stringify(results,null,2));console.log('errors',errors);writeFileSync('.preview/testnet-extra-results.json',JSON.stringify({routes:results,errors},null,2));
}finally{await call('Browser.close').catch(()=>{});socket.close();}
`;
fs.writeFileSync('.preview/audit-extra.mjs',base);
