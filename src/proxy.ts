import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;
const LOCALHOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeHost(value:string){return value.toLowerCase().replace(/^www\./,"").split(":")[0]??value;}

async function resolveCustomHost(host:string){
  const base=process.env.API_INTERNAL_BASE_URL ?? process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),1200);
  try{
    const response=await fetch(`${base}/api/v2/public/resolve-host/?host=${encodeURIComponent(host)}`,{headers:{Accept:"application/json"},cache:"no-store",signal:controller.signal});
    if(!response.ok)return null;
    const payload=await response.json() as {tenant_slug?:string;site_slug?:string};
    return payload.tenant_slug&&payload.site_slug?{tenantSlug:payload.tenant_slug,siteSlug:payload.site_slug}:null;
  }catch{return null;}finally{clearTimeout(timeout);}
}

export async function proxy(request:NextRequest){
  const {pathname}=request.nextUrl;
  if(pathname.startsWith("/_next")||pathname.startsWith("/api")||pathname==="/favicon.ico"||PUBLIC_FILE.test(pathname))return NextResponse.next();

  const root=normalizeHost(process.env.ROOT_DOMAIN??"localhost");
  const host=normalizeHost(request.headers.get("host")??root);
  if(LOCALHOSTS.has(host)||host===root)return NextResponse.next();

  if(host.endsWith(`.${root}`)){
    const tenantSlug=host.slice(0,-(root.length+1));
    if(!tenantSlug||tenantSlug.includes("."))return NextResponse.next();
    const rewrite=request.nextUrl.clone();
    rewrite.pathname=`/site/${tenantSlug}${pathname==="/"?"":pathname}`;
    return NextResponse.rewrite(rewrite);
  }

  const resolved=await resolveCustomHost(host);
  if(!resolved)return NextResponse.next();
  const rewrite=request.nextUrl.clone();
  rewrite.pathname=`/${resolved.tenantSlug}/${resolved.siteSlug}${pathname==="/"?"":pathname}`;
  return NextResponse.rewrite(rewrite);
}

export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
