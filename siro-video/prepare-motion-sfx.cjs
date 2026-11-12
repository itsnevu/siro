// Deterministic original sound assets. The edit places each sound on its component cue.
const fs = require('node:fs');
const sr = 48000;
let seed = 2718;
const noise = () => {seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2147483648 - 1;};
for (const kind of ['air', 'land', 'click', 'confirm']) {
  const seconds = kind === 'click' ? .09 : kind === 'air' ? .65 : .75;
  const count = Math.round(seconds * sr);
  const wav = Buffer.alloc(44 + count * 4);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length-8,4); wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(2,22);
  wav.writeUInt32LE(sr,24); wav.writeUInt32LE(sr*4,28); wav.writeUInt16LE(4,32); wav.writeUInt16LE(16,34);
  wav.write('data',36); wav.writeUInt32LE(count*4,40);
  let filtered=0;
  for(let i=0;i<count;i++) {
    const t=i/sr; filtered += .12*(noise()-filtered);
    let x;
    if(kind==='air') x=filtered*Math.sin(Math.PI*t/seconds)**2*.7;
    if(kind==='land') x=Math.sin(2*Math.PI*(78*t+1.3*(1-Math.exp(-t*25))))*Math.exp(-t*13)*(1-Math.exp(-t*180))*.4;
    if(kind==='click') x=(filtered+Math.sin(2*Math.PI*720*t)*.2)*Math.exp(-t*100)*.55;
    if(kind==='confirm') x=(Math.sin(2*Math.PI*660*t)+.45*Math.sin(2*Math.PI*990*t))*Math.exp(-t*7)*(1-Math.exp(-t*150))*.18;
    const value=Math.round(Math.max(-1,Math.min(1,x))*32767);
    wav.writeInt16LE(value,44+i*4); wav.writeInt16LE(value,46+i*4);
  }
  fs.writeFileSync(`public/audio/motion-${kind}.wav`,wav);
}
console.log('Created four original motion cues.');
