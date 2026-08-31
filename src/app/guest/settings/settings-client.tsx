"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createV2TeamInvitation,
  getV2Entitlements,
  listV2Members,
  listV2TeamInvitations,
  listV2Tenants,
  revokeV2TeamInvitation,
  updateV2Tenant,
  type V2Entitlements,
  type V2MembershipRow,
  type V2TeamInvitation,
  type V2Tenant,
} from "@/modules/api/v2-management-client";
import { getCachedV2User, refreshV2Session } from "@/modules/auth/v2-session";

const activeTenantKey = "qr-business-v2-active-tenant";

export function SettingsClient() {
  const [tenant, setTenant] = useState<V2Tenant | null>(null);
  const [entitlements, setEntitlements] = useState<V2Entitlements | null>(null);
  const [members, setMembers] = useState<V2MembershipRow[]>([]);
  const [invitations, setInvitations] = useState<V2TeamInvitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin"|"editor"|"analyst">("editor");
  const [inviteToken, setInviteToken] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    const session = getCachedV2User() ? { user:getCachedV2User() } : await refreshV2Session();
    if (!session?.user) { setMessage("Account bilan kirish kerak."); setLoading(false); return; }
    const tenants = await listV2Tenants();
    const saved = window.localStorage.getItem(activeTenantKey) ?? "";
    const active = tenants.find((x)=>x.id===saved) ?? tenants[0] ?? null;
    setTenant(active);
    if (!active) { setLoading(false); return; }
    window.localStorage.setItem(activeTenantKey,active.id);
    const [e,m,i] = await Promise.all([getV2Entitlements(active.id), listV2Members(active.id).catch(()=>[]), listV2TeamInvitations(active.id).catch(()=>[])]);
    setEntitlements(e); setMembers(m); setInvitations(i); setLoading(false);
  }
  useEffect(()=>{void reload();},[]);

  async function saveTenant(patch:Partial<Pick<V2Tenant,"name"|"locale"|"timezone">>) {
    if (!tenant) return;
    try { const updated=await updateV2Tenant(tenant.id,patch); setTenant(updated); setMessage("Workspace sozlamalari saqlandi."); }
    catch(error){setMessage(error instanceof Error?error.message:"Saqlanmadi.");}
  }
  async function invite() {
    if (!tenant || !email.trim()) return;
    try { const created=await createV2TeamInvitation(tenant.id,{email:email.trim().toLowerCase(),role}); setInviteToken(created.token??""); setEmail(""); setMessage("Invite yaratildi. Token faqat shu javobda ko‘rsatiladi."); await reload(); }
    catch(error){setMessage(error instanceof Error?error.message:"Invite yaratilmadi.");}
  }
  async function revoke(id:string){try{await revokeV2TeamInvitation(id);await reload();}catch(error){setMessage(error instanceof Error?error.message:"Revoke bajarilmadi.");}}

  if (loading) return <Panel>Settings yuklanmoqda...</Panel>;
  if (!tenant) return <Panel><p>Workspace topilmadi.</p><Link className="mt-4 inline-flex text-sm font-semibold text-teal-700" href="/guest/builder?plan=plus">Birinchi workspace yaratish</Link></Panel>;

  const membership=getCachedV2User()?.memberships.find((m)=>m.tenant_id===tenant.id);
  const canAdmin=Boolean(getCachedV2User()?.is_staff || membership?.role==="owner" || membership?.role==="admin");

  return <div className="space-y-5">
    {message?<p className="rounded-md bg-white px-4 py-3 text-sm ring-1 ring-black/5">{message}</p>:null}
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-teal-700">Workspace</p><h2 className="mt-1 text-2xl font-semibold">{tenant.name}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase">{tenant.plan}</span></div>
      <div className="mt-5 grid gap-3 md:grid-cols-3"><Field label="Nomi" value={tenant.name} onBlur={(v)=>void saveTenant({name:v})}/><Field label="Locale" value={tenant.locale} onBlur={(v)=>void saveTenant({locale:v})}/><Field label="Timezone" value={tenant.timezone} onBlur={(v)=>void saveTenant({timezone:v})}/></div>
    </section>

    {entitlements?<section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5"><h2 className="text-xl font-semibold">Plan va limitlar</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><Usage label="Saytlar" used={entitlements.usage.sites} limit={entitlements.limits.sites}/><Usage label="Team" used={entitlements.usage.members} limit={entitlements.limits.members}/><Usage label="Media" used={entitlements.usage.media_assets} limit={entitlements.limits.media_assets}/></div><div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold"><Badge on={entitlements.features.custom_domains}>Custom domains</Badge><Badge on={entitlements.features.advanced_analytics}>Advanced analytics</Badge><Badge on={entitlements.features.remove_branding}>Remove branding</Badge></div></section>:null}

    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Team</h2><span className="text-sm text-slate-500">{membership?.role??"member"}</span></div><div className="mt-4 divide-y divide-slate-100">{members.map((member)=><div className="flex items-center justify-between gap-3 py-3" key={member.id}><div><p className="text-sm font-semibold">{member.name||member.email}</p><p className="text-xs text-slate-500">{member.email}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{member.role}</span></div>)}</div>
      {canAdmin?<><div className="mt-5 grid gap-2 sm:grid-cols-[1fr_150px_auto]"><input className="min-h-10 rounded-md border border-slate-200 px-3 text-sm" onChange={(e)=>setEmail(e.target.value)} placeholder="member@example.com" type="email" value={email}/><select className="min-h-10 rounded-md border border-slate-200 px-3 text-sm" onChange={(e)=>setRole(e.target.value as typeof role)} value={role}><option value="admin">Admin</option><option value="editor">Editor</option><option value="analyst">Analyst</option></select><button className="rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" onClick={()=>void invite()} type="button">Invite</button></div>{inviteToken?<div className="mt-3 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900"><p className="font-semibold">Bir martalik invite link</p><code className="mt-1 block break-all">{`${window.location.origin}/guest/invite?token=${encodeURIComponent(inviteToken)}`}</code></div>:null}<div className="mt-4 space-y-2">{invitations.filter((x)=>x.status==="pending").map((inv)=><div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm" key={inv.id}><span>{inv.email} · {inv.role}</span><button className="text-xs font-semibold text-rose-600" onClick={()=>void revoke(inv.id)} type="button">Revoke</button></div>)}</div></>:null}
    </section>
  </div>;
}

function Panel({children}:{children:React.ReactNode}){return <section className="rounded-xl bg-white p-6 text-sm shadow-sm ring-1 ring-black/5">{children}</section>}
function Field({label,value,onBlur}:{label:string;value:string;onBlur:(v:string)=>void}){const [local,setLocal]=useState(value);useEffect(()=>setLocal(value),[value]);return <label className="grid gap-1"><span className="text-xs font-semibold text-slate-500">{label}</span><input className="min-h-10 rounded-md border border-slate-200 px-3 text-sm" onBlur={()=>local!==value&&onBlur(local)} onChange={(e)=>setLocal(e.target.value)} value={local}/></label>}
function Usage({label,used,limit}:{label:string;used:number;limit:number}){const pct=Math.min(100,Math.round(used/Math.max(1,limit)*100));return <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-black/5"><div className="flex justify-between text-sm"><span>{label}</span><strong>{used}/{limit}</strong></div><div className="mt-3 h-2 overflow-hidden rounded bg-slate-200"><div className="h-full bg-slate-900" style={{width:`${pct}%`}}/></div></div>}
function Badge({on,children}:{on:boolean;children:React.ReactNode}){return <span className={on?"rounded-full bg-teal-50 px-3 py-1 text-teal-700":"rounded-full bg-slate-100 px-3 py-1 text-slate-400"}>{on?"✓ ":"— "}{children}</span>}
