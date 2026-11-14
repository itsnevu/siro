// Next 16 Proxy (formerly middleware): geo-gating and locale negotiation at the edge.
import { NextResponse, type NextRequest } from "next/server";
import { decideGeo, STOCK_PATHS } from "@/lib/geo";
import { pickLocale, LOCALE_COOKIE, t } from "@/lib/i18n";

export function proxy(request: NextRequest) {
  const locale = pickLocale(request.cookies.get(LOCALE_COOKIE)?.value, request.headers.get("accept-language"));
  const country = request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry");
  const geo = decideGeo(country, request.headers.get("x-vercel-ip-country-region"));
  const path = request.nextUrl.pathname;
  if (geo.action === "block") {
    // 451 Unavailable For Legal Reasons, in both languages; nothing else is served.
    return new NextResponse(`${t("en", "geo.blocked")}\n${t("id", "geo.blocked")}\n`, { status: 451, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }
  if (geo.action === "no_stocks" && STOCK_PATHS.some(re => re.test(path))) {
    return new NextResponse(`${t("en", "geo.no_stocks")}\n${t("id", "geo.no_stocks")}\n`, { status: 451, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }
  const headers = new Headers(request.headers);
  headers.set("x-siro-locale", locale);
  headers.set("x-siro-geo", geo.country ? `${geo.action}:${geo.country}` : "unknown");
  const response = NextResponse.next({ request: { headers } });
  if (!request.cookies.get(LOCALE_COOKIE)) response.cookies.set(LOCALE_COOKIE, locale, { path: "/", sameSite: "lax", maxAge: 31_536_000 });
  return response;
}

export const config = {
  // Everything except static assets and Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|mp4|webm|woff2?)$).*)"],
};
