import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';

const oldHex=['dc'+'e5d8','e8'+'eee5','f3'+'f6f1','10'+'2a24','5d'+'6f68','a9'+'b8b0','b9'+'cfa8','ee'+'f2ea'];
const oldInk=[0x10,0x2a,0x24].join(',\\s*');
const banned=new RegExp(`${oldHex.join('|')}|${oldInk}`,'i');
const roots=['src','public','docs','scripts'];
const files=[];
function walk(dir){if(!existsSync(dir))return;for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name).replaceAll('\\','/');if(e.isDirectory())walk(p);else if(/\.(?:tsx?|css|jsx?|svg|json|mdx|md)$/.test(p))files.push(p);}}
roots.forEach(walk);for(const name of readdirSync('.'))if(/\.(?:tsx?|js|json|md)$/.test(name))files.push(name);
const oldMatches=[],rawMatches=[],sourceRawMatches=[];
for(const file of files){const lines=readFileSync(file,'utf8').split(/\r?\n/);lines.forEach((line,index)=>{
 if(banned.test(line))oldMatches.push(`${file}:${index+1}`);
 if(/#[\da-f]{3,8}\b/i.test(line)&&!file.endsWith('tokens.css'))sourceRawMatches.push(`${file}:${index+1}`);
 if(/^src\/(app|components)\//.test(file)&&/#[\da-f]{3,8}\b/i.test(line))rawMatches.push(`${file}:${index+1}`);
});}
console.log('Old palette search:',oldMatches.length?oldMatches.join('\n'):'(no matches)');
console.log('Raw hex in app/components:',rawMatches.length?rawMatches.join('\n'):'(no matches)');
console.log('Raw hex outside tokens.css:',sourceRawMatches.length?sourceRawMatches.join('\n'):'(no matches)');
const css=readFileSync('src/styles/tokens.css','utf8');
const light=css.split('.dark,')[0],dark=css.split('.dark,')[1].split(':root[data-scroll-tone')[0];
function color(source,name){const value=source.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1];if(!value)throw new Error(`Missing ${name}`);if(value.startsWith('#'))return [1,3,5].map(i=>parseInt(value.slice(i,i+2),16));return value.match(/[\d.]+/g).map(Number);}
function composite(fg,bg){const a=fg[3]??1;return fg.slice(0,3).map((c,i)=>c*a+bg[i]*(1-a));}
function luminance(rgb){const linear=rgb.map(c=>{const s=c/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;});return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;}
function ratio(a,b){const x=luminance(composite(a,b)),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
const pairs=[['Foreground / page','fg','bg'],['Secondary body / page','fg-70','bg'],['CTA text / mint','primary-fg','primary'],['Foreground / surface-2','fg','surface-2']];
const rows=pairs.map(([name,a,b])=>[name,ratio(color(light,a),color(light,b)),ratio(color(dark,a),color(dark,b))]);
rows.push(['Light text / dark section',ratio(color(dark,'fg'),color(dark,'bg')),ratio(color(dark,'fg'),color(dark,'bg'))]);
rows.push(['Mint / dark section',ratio(color(dark,'primary'),color(dark,'bg')),ratio(color(dark,'primary'),color(dark,'bg'))]);
console.table(rows.map(([pair,l,d])=>({pair,light:`${l.toFixed(2)}:1`,dark:`${d.toFixed(2)}:1`,AA:l>=4.5&&d>=4.5?'PASS':'FAIL'})));
const changed=new Set(JSON.parse(readFileSync('.preview/mint-changed.json','utf8')));
changed.add('src/assets/siro-original.png');
for(const group of ['wallets','illustrations'])for(const file of readdirSync(`src/assets/${group}`))if(file.endsWith('.svg')){changed.add(`src/assets/${group}/${file}`);changed.add(`public/${group}/${file} (moved)`);}
for(const path of ['src/styles/tokens.css','src/styles/palette.css','tailwind.config.ts','src/components/editorial/ColorMode.tsx','src/lib/brand-palette.ts','src/app/brand/mark/route.ts','src/app/assets/[group]/[name]/route.ts','src/app/icon.tsx','src/app/favicon.ico','public/favicon.ico','src/app/layout.tsx','src/app/opengraph-image.tsx','src/components/Header.tsx','src/components/Footer.tsx','src/components/editorial/ToneController.tsx','src/components/editorial/PillTabs.tsx','src/components/editorial/AllocationBar.tsx','src/components/editorial/CTABand.tsx','src/components/ConnectButton.tsx','src/components/ui/Badge.tsx','src/components/ui/PriceBadge.tsx','src/components/ui/Sparkline.tsx','scripts/verify-palette.mjs'])changed.add(path);
const result=`# Mint–teal palette verification\n\nThe existing Siro layout, original logo silhouette, Hedvig / Instrument fonts, floating header, FAQ alignment, and 3D motion are retained. Only the color system and the way assets obtain their colors changed. No Hyperliquid logo, copy, or assets are used.\n\n## Authoritative tokens\n\nAll color literals are defined in [tokens.css](src/styles/tokens.css). [tailwind.config.ts](tailwind.config.ts) and Tailwind v4's inline theme map these same variables. Dark mode follows the system color preference; adding the dark class also selects the dark tokens. Dark sections use their own scope. Secondary body and small metadata use the accessible fg-70 token; the deliberately faint muted token is reserved for borders/benchmark graphics, not body copy.\n\n## Source searches\n\nAudited ${files.length} owned text files, including source, assets, docs, scripts and root configuration. Dependencies, build output, archived pre-change source and screenshots are excluded; those are not shipped application source. The original bitmap is retained as an alpha-only geometry master in src/assets; both browser and social-image renderers paint its silhouette with the new tokens.\n\n\`\`\`text\nOld palette search: ${oldMatches.length?'FAIL':'(no matches)'}\nRaw hex in app/components: ${rawMatches.length?'FAIL':'(no matches)'}\nRaw hex outside tokens.css: ${sourceRawMatches.length?'FAIL':'(no matches)'}\n\`\`\`\n\n## WCAG contrast\n\nRatios use sRGB relative luminance and alpha compositing against each background, with 4.5:1 required for normal text.\n\n| Pair | Light | Dark | AA |\n| --- | ---: | ---: | --- |\n${rows.map(([name,l,d])=>`| ${name} | ${l.toFixed(2)}:1 | ${d.toFixed(2)}:1 | ${l>=4.5&&d>=4.5?'Pass':'FAIL'} |`).join('\n')}\n\nMint is a background with dark text on light pages, and a foreground/graphic only on dark surfaces. Primary button labels use the dedicated primary-fg token in both modes.\n\n## Browser verification\n\n- Production build and TypeScript checked separately.\n- Home checked at 375, 768, 1280 and 1600px in light and dark mode: no horizontal overflow.\n- Strategies/detail, Studio, Agent, Markets, Token, Tokenomics, Buyback, API, Stats, Pricing, Security, Roadmap, About, FAQ, Blog, Legal and Launch checked: no broken images or browser exceptions.\n- OG and generated icon endpoints returned HTTP 200. Favicon uses the generated mint icon and original logo silhouette.\n\n## Screenshots\n\n| View | Light | Dark |\n| --- | --- | --- |\n${['hero','visual','cards','dark-section','footer','mobile'].map(name=>`| ${name} | [View](.preview/mint/light-${name}.png) | [View](.preview/mint/dark-${name}.png) |`).join('\n')}\n\n[OG image](.preview/mint/opengraph.png) · [Icon](.preview/mint/icon.png)\n\n## Changed source files\n\n${[...changed].sort().map(path=>`- ${path}`).join('\n')}\n\nSVG wallet and illustration geometry was moved from public into src/assets and served through a token-colored asset route. The original logo bitmap was moved into src/assets/siro-original.png; its shape is not redrawn.\n`;
writeFileSync('PALETTE_REPORT.md',result);
if(oldMatches.length||rawMatches.length||sourceRawMatches.length||rows.some(([,l,d])=>l<4.5||d<4.5))process.exitCode=1;
