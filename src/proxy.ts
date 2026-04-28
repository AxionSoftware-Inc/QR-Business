import { NextResponse, type NextRequest } from "next/server";
import { resolveHost } from "@/modules/tenants/host-resolver";

const PUBLIC_FILE = /\.(.*)$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const rootDomain = process.env.ROOT_DOMAIN ?? "localhost";
  const host = request.headers.get("host") ?? rootDomain;
  const resolved = resolveHost(host, rootDomain);

  if (resolved.kind !== "tenant") {
    return NextResponse.next();
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/site/${resolved.tenant.slug}${pathname === "/" ? "" : pathname}`;

  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
