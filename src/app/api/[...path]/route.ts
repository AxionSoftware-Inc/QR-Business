const backendBaseUrl = process.env.API_INTERNAL_BASE_URL ?? "http://127.0.0.1:8000";
const adminCookieName = "qr-admin-session";

function adminSessionValue() {
  const password = process.env.ADMIN_PASSWORD ?? "";
  return password.length >= 8
    ? Buffer.from(`admin:${password}`).toString("base64url")
    : "";
}

type ApiProxyContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function proxy(request: Request, context: ApiProxyContext) {
  const { path } = await context.params;
  const method = request.method.toUpperCase();

  if (isProtectedAdminApi(path, method) && !hasAdminSession(request)) {
    return Response.json({ detail: "Admin auth required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const backendUrl = new URL(`/api/${path.join("/")}/`, backendBaseUrl);
  backendUrl.search = url.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("expect");

  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const response = await fetch(backendUrl, {
    method,
    headers,
    body,
    cache: "no-store",
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

function isProtectedAdminApi(path: string[], method: string) {
  const [resource, second, third] = path;

  if (resource === "tenants" || resource === "domains") {
    return true;
  }

  if (resource !== "sites") {
    return false;
  }

  if (method === "GET") {
    return second === undefined || second === "admin-analytics";
  }

  if (method === "POST") {
    return third === "duplicate" || second === undefined;
  }

  if (["PATCH", "PUT", "DELETE"].includes(method)) {
    return true;
  }

  return false;
}

function hasAdminSession(request: Request) {
  const expected = adminSessionValue();

  if (!expected) {
    return false;
  }

  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((item) => item.trim())
    .includes(`${adminCookieName}=${expected}`);
}

export async function GET(request: Request, context: ApiProxyContext) {
  return proxy(request, context);
}

export async function POST(request: Request, context: ApiProxyContext) {
  return proxy(request, context);
}

export async function PATCH(request: Request, context: ApiProxyContext) {
  return proxy(request, context);
}

export async function PUT(request: Request, context: ApiProxyContext) {
  return proxy(request, context);
}

export async function DELETE(request: Request, context: ApiProxyContext) {
  return proxy(request, context);
}

export async function OPTIONS(request: Request, context: ApiProxyContext) {
  return proxy(request, context);
}
