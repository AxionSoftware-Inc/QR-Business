"use client";

import { authorizedV2Fetch } from "@/modules/auth/v2-session";

export type V2Tenant = { id:string; name:string; slug:string; status:"trial"|"active"|"suspended"|"archived"; plan:"free"|"starter"|"pro"|"business"; locale:string; timezone:string };
export type V2SiteVersion = { id:string; version:number; title:string; description:string; template_key:string; theme:Record<string,unknown>; blocks:unknown[]; seo:Record<string,unknown>; created_at:string };
export type V2Site = { id:string; tenant:string; slug:string; name:string; status:"draft"|"published"|"disabled"; draft:V2SiteVersion|null; published:V2SiteVersion|null; published_at:string|null; created_at:string; updated_at:string };
export type V2Domain = { id:string; tenant:string; site:string|null; hostname:string; kind:"subdomain"|"custom"; status:"pending"|"verified"|"failed"|"disabled"; verified_at:string|null };
export type V2QRCode = { id:string; tenant:string; site:string; code:string; label:string; campaign:string; is_active:boolean };
export type V2MediaAsset = { id:string; tenant:string; kind:"image"; url:string; original_name:string; content_type:"image/jpeg"|"image/png"|"image/webp"; byte_size:number; width:number; height:number; sha256:string; alt:string; created_at:string };
export type V2Analytics = { totals:Array<{event_type:"view"|"qr_scan"|"cta_click";count:number}>; top_targets:Array<{target:string;count:number}>; daily?:Array<{day:string;event_type:string;count:number}> };
export type V2DraftPayload = { title:string; description?:string; template_key?:string; theme?:Record<string,unknown>; blocks?:unknown[]; seo?:Record<string,unknown> };
export type V2Entitlements = { plan:V2Tenant["plan"]; limits:{sites:number;members:number;media_assets:number}; features:{custom_domains:boolean;advanced_analytics:boolean;remove_branding:boolean}; usage:{sites:number;members:number;media_assets:number;custom_domains:number} };
export type V2MembershipRow = { id:string; user:number; email:string; name:string; role:"owner"|"admin"|"editor"|"analyst"; is_active:boolean; created_at:string; updated_at:string };
export type V2TeamInvitation = { id:string; tenant:string; email:string; role:"admin"|"editor"|"analyst"; status:"pending"|"accepted"|"revoked"|"expired"; expires_at:string; invited_by:number|null; accepted_by:number|null; accepted_at:string|null; created_at:string; token?:string };

async function json<T>(path:string, init:RequestInit={}):Promise<T>{ const response=await authorizedV2Fetch(path,init); if(!response.ok){let detail=`Request failed (${response.status})`;try{const body=await response.json() as {detail?:string};if(body.detail)detail=body.detail;}catch{} throw new Error(detail);} return await response.json() as T; }

export const listV2Tenants=()=>json<V2Tenant[]>("/api/v2/tenants/");
export function createV2Tenant(input:{name:string;slug:string;locale?:string;timezone?:string}){return json<V2Tenant>("/api/v2/tenants/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:input.name,slug:input.slug,locale:input.locale??"uz",timezone:input.timezone??"Asia/Tashkent"})});}
export function updateV2Tenant(tenantId:string,input:Partial<Pick<V2Tenant,"name"|"slug"|"locale"|"timezone">>){return json<V2Tenant>(`/api/v2/tenants/${tenantId}/`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});}
export const getV2Entitlements=(tenantId:string)=>json<V2Entitlements>(`/api/v2/tenants/${tenantId}/entitlements/`);
export const listV2Members=(tenantId:string)=>json<V2MembershipRow[]>(`/api/v2/tenants/${tenantId}/members/`);
export const listV2TeamInvitations=(tenantId:string)=>json<V2TeamInvitation[]>(`/api/v2/tenants/${tenantId}/team/invitations/`);
export function createV2TeamInvitation(tenantId:string,input:{email:string;role:"admin"|"editor"|"analyst"}){return json<V2TeamInvitation>(`/api/v2/tenants/${tenantId}/team/invitations/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});}
export const revokeV2TeamInvitation=(invitationId:string)=>json<V2TeamInvitation>(`/api/v2/team/invitations/${invitationId}/revoke/`,{method:"POST"});
export const acceptV2TeamInvitation=(token:string)=>json<V2MembershipRow>("/api/v2/team/invitations/accept/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});

export const listV2Sites=()=>json<V2Site[]>("/api/v2/sites/");
export const getV2Site=(siteId:string)=>json<V2Site>(`/api/v2/sites/${siteId}/`);
export function createV2Site(input:{tenant:string;slug:string;name:string}){return json<V2Site>("/api/v2/sites/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});}
export function saveV2Draft(siteId:string,payload:V2DraftPayload){return json<V2SiteVersion>(`/api/v2/sites/${siteId}/draft/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});}
export const publishV2Site=(siteId:string)=>json<V2SiteVersion>(`/api/v2/sites/${siteId}/publish/`,{method:"POST"});
export const listV2Domains=()=>json<V2Domain[]>("/api/v2/domains/");
export const listV2QRCodes=()=>json<V2QRCode[]>("/api/v2/qr-codes/");
export const getV2SiteAnalytics=(siteId:string)=>json<V2Analytics>(`/api/v2/sites/${siteId}/analytics/`);
export function createV2Domain(input:{tenant:string;site?:string;hostname:string}){return json<V2Domain>("/api/v2/domains/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tenant:input.tenant,site:input.site||null,hostname:input.hostname})});}
export const getV2DomainVerification=(domainId:string)=>json<{hostname:string;record_type:"TXT";record_name:string;record_value:string;status:V2Domain["status"]}>(`/api/v2/domains/${domainId}/verification/`);
export const verifyV2Domain=(domainId:string)=>json<{hostname:string;verified:boolean;status:V2Domain["status"];observed:string[]}>(`/api/v2/domains/${domainId}/verification/`,{method:"POST"});
export function createV2QRCode(input:{tenant:string;site:string;label?:string;campaign?:string}){return json<V2QRCode>("/api/v2/qr-codes/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});}

export async function uploadV2Image(input:{tenant:string;file:File;alt?:string}){const form=new FormData();form.append("tenant",input.tenant);form.append("file",input.file);if(input.alt)form.append("alt",input.alt);const response=await authorizedV2Fetch("/api/v2/media/",{method:"POST",body:form});if(!response.ok){let detail=`Upload failed (${response.status})`;try{const payload=await response.json() as {detail?:string};if(payload.detail)detail=payload.detail;}catch{}throw new Error(detail);}return await response.json() as V2MediaAsset;}
export async function fetchV2QRCodeBlob(qrId:string,format:"png"|"svg"="png"){const response=await authorizedV2Fetch(`/api/v2/qr-codes/${qrId}/image/?format=${format}`);if(!response.ok)throw new Error(`QR download failed (${response.status})`);return response.blob();}
export async function downloadV2QRCode(qr:V2QRCode,siteSlug:string,format:"png"|"svg"){const blob=await fetchV2QRCodeBlob(qr.id,format);const url=URL.createObjectURL(blob);try{const anchor=document.createElement("a");anchor.href=url;anchor.download=`${siteSlug}-qr.${format}`;anchor.click();}finally{window.setTimeout(()=>URL.revokeObjectURL(url),1000);}}
