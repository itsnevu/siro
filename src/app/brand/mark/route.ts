import type { NextRequest } from "next/server";
import { brandLogoData } from "@/lib/brand-palette";

export function GET(request:NextRequest) {
  const {svg}=brandLogoData(request.nextUrl.searchParams.get("mint")==="1");
  return new Response(svg,{headers:{"content-type":"image/svg+xml","cache-control":"public, max-age=86400"}});
}
