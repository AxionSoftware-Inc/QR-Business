const backendBaseUrl=process.env.API_INTERNAL_BASE_URL??"http://127.0.0.1:8000";

type ApiProxyContext={params:Promise<{path:string[]}>};

async function proxy(request:Request,context:ApiProxyContext){
  const {path}=await context.params;
  if(path[0]!=="v2")return Response.json({detail:"Legacy API is disabled."},{status:404});
  const method=request.method.toUpperCase();
  const url=new URL(request.url);
  const backendUrl=new URL(`/api/${path.join("/")}/`,backendBaseUrl);
  backendUrl.search=url.search;
  const headers=new Headers(request.headers);
  headers.delete("host");headers.delete("content-length");headers.delete("expect");
  const hasBody=!["GET","HEAD"].includes(method);
  const body=hasBody?await request.arrayBuffer():undefined;
  const response=await fetch(backendUrl,{method,headers,body,cache:"no-store",redirect:"manual"});
  const responseHeaders=new Headers(response.headers);
  responseHeaders.delete("content-encoding");responseHeaders.delete("content-length");
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers:responseHeaders});
}

export const GET=proxy;export const POST=proxy;export const PATCH=proxy;export const PUT=proxy;export const DELETE=proxy;export const OPTIONS=proxy;
