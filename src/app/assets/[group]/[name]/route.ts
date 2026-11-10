import {readFile} from "node:fs/promises";
import {join} from "node:path";
import type {NextRequest} from "next/server";
import {brandPalette} from "@/lib/brand-palette";

const ENGRAVING_FRAMES:Record<string,string>={
  "siro-column.svg":"171 22 1194 988",
  "siro-urn.svg":"232 182 1076 756",
  "siro-arch.svg":"232 246 1076 694",
};

export async function GET(request:NextRequest,{params}:{params:Promise<{group:string;name:string}>}) {
  const {group,name}=await params;
  if(!["wallets","illustrations"].includes(group)||!/^[a-zA-Z0-9.-]+\.svg$/.test(name))return new Response(null,{status:404});
  try {
    const palette=brandPalette();
    let source=await readFile(join(process.cwd(),"src/assets",group,name),"utf8");
    const frame=group==="illustrations"&&request.nextUrl.searchParams.get("framed")==="1"?ENGRAVING_FRAMES[name]:undefined;
    if(frame){
      const [, ,width,height]=frame.split(" ");
      source=source.replace(/viewBox="[^"]*"/,`viewBox="${frame}"`).replace(/width="1536"/,`width="${width}"`).replace(/height="1024"/,`height="${height}"`);
    }
    return new Response(source.replaceAll("currentColor",request.nextUrl.searchParams.get("mint")==="1"?palette.primary:palette.fg),{headers:{"content-type":"image/svg+xml","cache-control":"public,max-age=86400"}});
  }catch{return new Response(null,{status:404});}
}
