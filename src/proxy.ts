import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;
const LOCALHOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

type PublicRoute = { tenantSlug: string; siteSlug: string };

function normalizeHost(value: string) {
  const raw = value.trim().toLowerCase();
  if (!raw) return "";
  if (raw.startsWith("[")) {
    const closing = raw.indexOf("]");
    if (closing >= 0) return raw.slice(1, closing);
  }
  return raw.replace(/^www\./, "").split(":")[0] ?? raw;
}

function apiBase() {
  return process.env.API_INTERNAL_BASE_URL ?? process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
}

async function fetchResolvedRoute(path: string): Promise<PublicRoute | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(`${apiBase()}${path}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json() as { tenant_slug?: string; site_slug?: string; slug?: string };
    const tenantSlug = payload.tenant_slug;
    const siteSlug = payload.site_slug ?? payload.slug;
    return tenantSlug && siteSlug ? { tenantSlug, siteSlug } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function resolveCustomHost(host: string) {
  return fetchResolvedRoute(`/api/v2/public/resolve-host/?host=${encodeURIComponent(host)}`);
}

function resolveTenantDefault(tenantSlug: string) {
  return fetchResolvedRoute(`/api/v2/public/sites/${encodeURIComponent(tenantSlug)}/`);
}

function rewriteToSite(request: NextRequest, route: PublicRoute) {
  const rewrite = request.nextUrl.clone();
  rewrite.pathname = `/${route.tenantSlug}/${route.siteSlug}`;
  return NextResponse.rewrite(rewrite);
}

function notFound() {
  return new NextResponse("Not found", {
    status: 404,
    headers: {
      "Cache-Control": "public, max-age=30",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname === "/favicon.ico" || PUBLIC_FILE.test(pathname)) {
    return NextResponse.next();
  }

  const root = normalizeHost(process.env.ROOT_DOMAIN ?? "localhost");
  const host = normalizeHost(request.headers.get("host") ?? root);
  if (!host || LOCALHOSTS.has(host) || host === root) return NextResponse.next();

  if (host.endsWith(`.${root}`)) {
    const tenantSlug = host.slice(0, -(root.length + 1));
    if (!tenantSlug || tenantSlug.includes(".")) return notFound();
    if (pathname !== "/") return notFound();
    const route = await resolveTenantDefault(tenantSlug);
    return route ? rewriteToSite(request, route) : notFound();
  }

  if (pathname !== "/") return notFound();
  const route = await resolveCustomHost(host);
  return route ? rewriteToSite(request, route) : notFound();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
