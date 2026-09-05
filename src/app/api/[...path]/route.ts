const backendBaseUrl = process.env.API_INTERNAL_BASE_URL ?? "http://127.0.0.1:8000";

type ApiProxyContext = { params: Promise<{ path: string[] }> };

const HOP_BY_HOP_HEADERS = [
  "connection",
  "content-length",
  "expect",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

function safeBackendPath(path: string[]) {
  if (path[0] !== "v2") return null;
  if (path.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\"))) {
    return null;
  }
  return `/api/${path.map((segment) => encodeURIComponent(segment)).join("/")}/`;
}

async function proxy(request: Request, context: ApiProxyContext) {
  const { path } = await context.params;
  const backendPath = safeBackendPath(path);
  if (!backendPath) return Response.json({ detail: "API route not found." }, { status: 404 });

  const method = request.method.toUpperCase();
  const incomingUrl = new URL(request.url);
  const backendUrl = new URL(backendPath, backendBaseUrl);
  backendUrl.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  for (const header of HOP_BY_HOP_HEADERS) headers.delete(header);

  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await request.arrayBuffer() : undefined;
  const response = await fetch(backendUrl, {
    method,
    headers,
    body,
    cache: "no-store",
    redirect: "manual",
  });

  const responseHeaders = new Headers(response.headers);
  for (const header of HOP_BY_HOP_HEADERS) responseHeaders.delete(header);
  responseHeaders.delete("content-encoding");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
