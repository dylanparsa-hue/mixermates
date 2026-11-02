import { NextResponse, type NextRequest } from "next/server";
// Database-backed authorization lives in pages and handlers, never in Proxy.
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/_next/image") {
    const source = request.nextUrl.searchParams.get("url") || "";
    if (!/^\/(branding\/processed|images)\/[\w.-]+\.(png|jpg|webp)$/.test(source)) {
      return new NextResponse("Not found",{status:404,headers:{"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow, noarchive"}});
    }
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control","private, no-store, max-age=0, must-revalidate");
  response.headers.set("X-Robots-Tag","noindex, nofollow, noarchive");
  response.headers.set("Vary","Cookie");
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/webpack-hmr|branding/|fonts/|images/|manifest.webmanifest|icon.svg).*)"] };
