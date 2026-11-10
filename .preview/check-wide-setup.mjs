import fs from 'node:fs';
let base=fs.readFileSync('.preview/review-launch-final.mjs','utf8').split('\ntry{')[0].replace('localhost:3117','localhost:3001');
base+=`\ntry{
await cmd('Runtime.enable');await cmd('Page.enable');
await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'},{name:'prefers-reduced-motion',value:'reduce'}]});
for(const width of [2560,1920,1440,390]){
 await cmd('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
 await navigate('/');await delay(500);
 console.log(width,await evaluate('JSON.stringify({header:document.querySelector(".rusd-topbar-inner").getBoundingClientRect().width,section:document.querySelector(".site-container").getBoundingClientRect().width,footer:document.querySelector("footer .site-container").getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth})'));
 if(width===1920){await screenshot('wide-home');await evaluate('scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"})');await delay(300);await screenshot('wide-footer');}
 if(width===390)await screenshot('wide-mobile');
}
for(const path of ['/studio','/docs','/app']){await navigate(path);console.log(path,await evaluate('JSON.stringify({overflow:document.documentElement.scrollWidth>innerWidth})'));}
console.log('errors',errors);
}finally{await call('Browser.close').catch(()=>{});socket.close();}
`;
fs.writeFileSync('.preview/check-wide.mjs',base);
