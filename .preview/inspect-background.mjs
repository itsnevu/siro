import {readFileSync,existsSync} from 'node:fs';
for(const path of ['src/styles/siro.css','src/styles/pyris.css','src/app/globals.css','src/styles/editorial.css']){
 if(!existsSync(path))continue;const text=readFileSync(path,'utf8');
 console.log(path,'length',text.length,'head',text.slice(0,320));
 console.log('root declarations',text.match(/(?:html[^{}]*|:root|\.dark|\[data-tone[^\]]*\])\s*\{[^}]*\}/g)?.map(s=>s.slice(0,600)).slice(0,8));
}
const html=readFileSync('.preview/live-3001.html','utf8');
console.log('CSS links',[...html.matchAll(/href="([^"]+\.css[^"]*)"/g)].map(m=>m[1]).slice(0,12));
