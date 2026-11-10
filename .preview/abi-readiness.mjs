import fs from 'node:fs';
import {toFunctionSelector} from 'viem';
const formatAbiItem=i=>i.name+'('+i.inputs.map(x=>x.type).join(',')+')';
const shape=items=>items?.map(({type,name,components})=>({type,name,...(components?{components:shape(components)}:{})}));
const source=fs.readFileSync('src/lib/generated/abis.ts','utf8');
const output=[];
for(const name of ['SiroCopyVault','SiroRiskGuard','SiroLeaderboard']){
 const text=source.match(new RegExp('export const '+name+'Abi = ([\\s\\S]*?) as const;'))[1];
 const front=JSON.parse(text);
 const actual=JSON.parse(fs.readFileSync('contracts/out/'+name+'.sol/'+name+'.json','utf8')).abi;
 const functions=actual.filter(i=>i.type==='function').map(i=>formatAbiItem(i));
 const missing=front.filter(i=>i.type==='function'&&!functions.includes(formatAbiItem(i))).map(i=>formatAbiItem(i));
 const mismatch=front.filter(i=>i.type==='function'&&functions.includes(formatAbiItem(i))).filter(i=>{
   const compiled=actual.find(a=>a.type==='function'&&toFunctionSelector(a)===toFunctionSelector(i));
   return JSON.stringify(shape(i.outputs))!==JSON.stringify(shape(compiled.outputs));
 }).map(i=>i.name);
 output.push({contract:name,missingFrontendFunctions:missing,outputShapeNeedsReview:mismatch});
}
fs.writeFileSync('.preview/abi-readiness.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
