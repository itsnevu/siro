import fs from 'node:fs';
let base=fs.readFileSync('.preview/review.mjs','utf8').split('\ntry {')[0].replace('localhost:3100','localhost:3001');
base+=`\ntry {
await cmd('Runtime.enable'); await cmd('Page.enable');
await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
for(const mode of ['dark','light']) {
 await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:mode}]});
 await navigate('/');await delay(2000);
 console.log(mode,await evaluate('JSON.stringify({bg:getComputedStyle(document.body).backgroundColor,fg:getComputedStyle(document.querySelector("h1")).color,inline:document.documentElement.style.cssText,broken:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),overflow:document.documentElement.scrollWidth>innerWidth,header:document.querySelector("header").getBoundingClientRect().toJSON()})'));
 await screenshot('background-'+mode);
}
await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await navigate('/');await delay(1000);await screenshot('background-mobile');
console.log('mobile',await evaluate('document.documentElement.scrollWidth>innerWidth'));
console.log('errors',errors);
} finally {await call('Browser.close').catch(()=>{});socket.close();}
`;
fs.writeFileSync('.preview/check-background.mjs',base);
