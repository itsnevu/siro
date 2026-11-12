import {STARTS,TRANSITIONS,STRATEGY_OVERLAP} from './timing';

export type Cue={name:string;from:number;duration:number;sound:string;gain:number};
// Each cue follows its visual gesture. The continuous opening has no cut whoosh.
export const SOUND_CUES:Cue[]=[
 {name:'Coin approaches lens',from:18,duration:36,sound:'toss',gain:.65},
 {name:'Coin returns from lens',from:44,duration:38,sound:'recede',gain:.4},
 {name:'Portfolio ring draws',from:54,duration:15,sound:'sparkle',gain:.25},
 {name:'Coin settles in portfolio',from:82,duration:9,sound:'land',gain:.52},
 {name:'Phone to policy / horizontal',from:STARTS[2],duration:TRANSITIONS[0],sound:'sweep',gain:.65},
 {name:'Policy verified',from:STARTS[2]+28,duration:23,sound:'confirm',gain:.6},
 {name:'Policy to typography / mosaic',from:STARTS[3],duration:TRANSITIONS[1],sound:'mosaic',gain:.55},
 {name:'Typography to strategy / circular focus',from:STARTS[4],duration:STRATEGY_OVERLAP,sound:'focus',gain:.62},
 {name:'Strategy to laptop / horizontal',from:STARTS[5],duration:TRANSITIONS[2],sound:'sweep',gain:.6},
 {name:'Laptop to limits / vertical',from:STARTS[6],duration:TRANSITIONS[3],sound:'lift',gain:.55},
 {name:'Trade cap checked',from:STARTS[6]+12,duration:8,sound:'click',gain:.38},
 {name:'Drawdown checked',from:STARTS[6]+20,duration:8,sound:'click',gain:.34},
 {name:'Limits to phone / mosaic',from:STARTS[7],duration:TRANSITIONS[4],sound:'mosaic',gain:.5},
 {name:'Review notification lands',from:STARTS[7]+16,duration:24,sound:'notification',gain:.52},
 {name:'Phone to collage / horizontal',from:STARTS[8],duration:TRANSITIONS[5],sound:'sweep',gain:.58},
 {name:'Collage to type / vertical',from:STARTS[9],duration:TRANSITIONS[6],sound:'lift',gain:.52},
 {name:'Type to brand / diagonal signature',from:STARTS[10],duration:TRANSITIONS[7],sound:'brand',gain:.6},
 {name:'Brand resolves',from:STARTS[10]+TRANSITIONS[7],duration:23,sound:'confirm',gain:.4},
 {name:'Policy card lifts',from:STARTS[2]+6,duration:12,sound:'card',gain:.28},
 {name:'Policy trade cap arrives',from:STARTS[2]+24,duration:6,sound:'tick',gain:.22},
 {name:'Policy drawdown arrives',from:STARTS[2]+29,duration:6,sound:'tick',gain:.18},
 {name:'Your rules type entrance',from:STARTS[3]+9,duration:6,sound:'tick',gain:.2},
 {name:'Strategy surface settles',from:STARTS[4]+8,duration:12,sound:'card',gain:.4},
 ...Array.from({length:6},(_,i)=>({name:`Strategy badge ${i+1}`,from:STARTS[4]+5+i*2,duration:6,sound:'tick',gain:.12+i*.012})),
 {name:'Laptop allocation draws',from:STARTS[5]+18,duration:15,sound:'sparkle',gain:.24},
 ...Array.from({length:3},(_,i)=>({name:`Laptop allocation row ${i+1}`,from:STARTS[5]+18+i*5,duration:6,sound:'tick',gain:.16})),
 {name:'Trade cap card lands',from:STARTS[6]+2,duration:12,sound:'card',gain:.28},
 {name:'Drawdown card lands',from:STARTS[6]+7,duration:12,sound:'card',gain:.24},
 ...Array.from({length:6},(_,i)=>({name:`Collage disc ${i+1}`,from:STARTS[8]+i*2+3,duration:6,sound:'tick',gain:.11+i*.012})),
 {name:'In motion type entrance',from:STARTS[9]+6,duration:6,sound:'tick',gain:.18},
];

