const fs = require('node:fs/promises');
const files = {
 'references/site.css':'/_next/static/css/a787cd951bb683d7.css',
 'public/fonts/display-200.woff2':'/_next/static/media/c150f0c57bc48529-s.p.woff2',
 'public/fonts/display-300.woff2':'/_next/static/media/eeb8a9ff846037ce-s.p.woff2',
 'public/fonts/mono-400.woff2':'/_next/static/media/558ca1a6aa3cb55e-s.p.woff2',
 'public/fonts/sans-400.woff2':'/_next/static/media/61d96c4884191721-s.p.woff2',
 'public/fonts/sans-500.woff2':'/_next/static/media/b0bb26939bb40fdb-s.p.woff2',
 'public/fonts/serif-400.woff2':'/_next/static/media/5c1dcbfbff27328a-s.p.woff2',
 'public/art/plate.png':'/art/engraving/plate.png',
 'public/meter.svg':'/brand/meter.svg',
 'references/site.html':'/'
};
Promise.all(Object.entries(files).map(async ([file,url])=>{
 const response=await fetch('https://raqio.xyz'+url,{signal:AbortSignal.timeout(45000)});
 if(!response.ok) throw Error(`${url}: ${response.status}`);
 await fs.mkdir(require('node:path').dirname(file),{recursive:true});
 await fs.writeFile(file,Buffer.from(await response.arrayBuffer()));
 console.log('Saved '+file);
})).catch(e=>{console.error(e);process.exitCode=1});
