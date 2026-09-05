"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createV2TeamInvitation,
  getV2Entitlements,
  listV2Members,
  listV2TeamInvitations,
  listV2Tenants,
  removeV2Member,
  revokeV2TeamInvitation,
  transferV2Ownership,
  updateV2MemberRole,
  updateV2Tenant,
  type V2Entitlements,
  type V2MembershipRow,
  type V2TeamInvitation,
  type V2Tenant,
} from "@/modules/api/v2-management-client";
import { getCachedV2User, refreshV2Session } from "@/modules/auth/v2-session";
import { t } from "@/modules/i18n/catalog";

const activeTenantKey = "qr-business-v2-active-tenant";

export function SettingsClient() {
  const [tenant, setTenant] = useState<V2Tenant | null>(null);
  const [entitlements, setEntitlements] = useState<V2Entitlements | null>(null);
  const [members, setMembers] = useState<V2MembershipRow[]>([]);
  const [invitations, setInvitations] = useState<V2TeamInvitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "analyst">("editor");
  const [inviteToken, setInviteToken] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyMember, setBusyMember] = useState("");
  const locale = tenant?.locale ?? "en";

  async function reload() {
    setLoading(true);
    try {
      const cached = getCachedV2User();
      const session = cached ? { user: cached } : await refreshV2Session();
      if (!session?.user) {
        setMessage("Account bilan kirish kerak.");
        return;
      }

      const tenants = await listV2Tenants();
      const saved = window.localStorage.getItem(activeTenantKey) ?? "";
      const active = tenants.find((item) => item.id === saved) ?? tenants[0] ?? null;
      setTenant(active);
      if (!active) return;

      window.localStorage.setItem(activeTenantKey, active.id);
      const [e, m, i] = await Promise.all([
        getV2Entitlements(active.id),
        listV2Members(active.id).catch(() => []),
        listV2TeamInvitations(active.id).catch(() => []),
      ]);
      setEntitlements(e);
      setMembers(m);
      setInvitations(i);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Settings load failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  async function saveTenant(patch: Partial<Pick<V2Tenant, "name" | "locale" | "timezone">>) {
    if (!tenant) return;
    try {
      const updated = await updateV2Tenant(tenant.id, patch);
      setTenant(updated);
      setMessage(t(updated.locale, "workspaceSettingsSaved"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    }
  }

  async function invite() {
    if (!tenant || !email.trim()) return;
    try {
      const created = await createV2TeamInvitation(tenant.id, { email: email.trim().toLowerCase(), role });
      setInviteToken(created.token ?? ""); setEmail(""); setMessage("Invite yaratildi. Token faqat shu javobda ko‘rsatiladi."); await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Invite yaratilmadi."); }
  }

  async function revoke(id: string) { try { await revokeV2TeamInvitation(id); await reload(); } catch (error) { setMessage(error instanceof Error ? error.message : "Revoke bajarilmadi."); } }
  async function changeRole(member: V2MembershipRow, next: "admin" | "editor" | "analyst") { setBusyMember(member.id); try { await updateV2MemberRole(member.id, next); setMessage(`${member.email} roli ${next} ga o‘zgardi.`); await reload(); } catch (error) { setMessage(error instanceof Error ? error.message : "Role o‘zgarmadi."); } finally { setBusyMember(""); } }
  async function removeMember(member: V2MembershipRow) { if (!window.confirm(`${member.email} ni workspace’dan olib tashlaysizmi?`)) return; setBusyMember(member.id); try { await removeV2Member(member.id); setMessage("Member olib tashlandi."); await reload(); } catch (error) { setMessage(error instanceof Error ? error.message : "Member olib tashlanmadi."); } finally { setBusyMember(""); } }
  async function transferOwner(member: V2MembershipRow) { if (!tenant || !window.confirm(`Ownership ${member.email} ga o‘tkazilsinmi? Siz admin bo‘lib qolasiz.`)) return; setBusyMember(member.id); try { await transferV2Ownership(tenant.id, member.id); await refreshV2Session(); setMessage("Ownership muvaffaqiyatli o‘tkazildi."); await reload(); } catch (error) { setMessage(error instanceof Error ? error.message : "Ownership o‘tkazilmadi."); } finally { setBusyMember(""); } }

  if (loading) return <Panel>{t(locale,"settingsLoading")}</Panel>;
  if (!tenant) return <Panel><p>{t(locale,"workspaceNotFound")}</p><Link className="mt-4 inline-flex text-sm font-semibold text-teal-700" href="/guest/builder?plan=plus">{t(locale,"newSite")}</Link></Panel>;

  const user = getCachedV2User();
  const membership = user?.memberships.find((item) => item.tenant_id === tenant.id);
  const canAdmin = Boolean(user?.is_staff || membership?.role === "owner" || membership?.role === "admin");
  const isOwner = Boolean(user?.is_staff || membership?.role === "owner");

  return <div className="space-y-5">
    {message ? <p className="rounded-md bg-white px-4 py-3 text-sm ring-1 ring-black/5">{message}</p> : null}

    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-teal-700">{t(locale,"workspace")}</p><h2 className="mt-1 text-2xl font-semibold">{tenant.name}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase">{tenant.plan}</span></div>
      <div className="mt-5 grid gap-3 md:grid-cols-3"><Field label={t(locale,"name")} value={tenant.name} onBlur={(value)=>void saveTenant({name:value})}/><Field label={t(locale,"locale")} value={tenant.locale} onBlur={(value)=>void saveTenant({locale:value})}/><Field label={t(locale,"timezone")} value={tenant.timezone} onBlur={(value)=>void saveTenant({timezone:value})}/></div>
    </section>

    {entitlements ? <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">{t(locale,"planLimits")}</h2><p className="mt-1 text-xs text-slate-500">{t(locale,"realUsage")}</p></div><Link className="text-sm font-semibold text-teal-700" href="/pricing">{t(locale,"viewPlans")}</Link></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Usage label={t(locale,"sites")} used={entitlements.usage.sites} limit={entitlements.limits.sites}/><Usage label={t(locale,"teamSeat")} used={entitlements.usage.reserved_member_seats} limit={entitlements.limits.members} detail={`${entitlements.usage.members} ${t(locale,"active")} · ${entitlements.usage.pending_invitations} ${t(locale,"pending")}`}/><Usage label={t(locale,"media")} used={entitlements.usage.media_assets} limit={entitlements.limits.media_assets}/><Usage label={t(locale,"dynamicQr")} used={entitlements.usage.qr_codes} limit={entitlements.limits.qr_codes}/><Usage label={t(locale,"customDomain")} used={entitlements.usage.custom_domains} limit={entitlements.limits.custom_domains}/></div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold"><Badge on={entitlements.features.custom_domains}>{t(locale,"customDomains")}</Badge><Badge on={entitlements.features.advanced_analytics}>{t(locale,"advancedAnalytics")}</Badge><Badge on={entitlements.features.remove_branding}>{t(locale,"removeBranding")}</Badge></div>
    </section> : null}

    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Team</h2><span className="text-sm text-slate-500">Siz: {membership?.role ?? "member"}</span></div>
      <div className="mt-4 divide-y divide-slate-100">{members.map((member)=><div className="flex flex-wrap items-center justify-between gap-3 py-3" key={member.id}><div><p className="text-sm font-semibold">{member.name || member.email}</p><p className="text-xs text-slate-500">{member.email}</p></div><div className="flex items-center gap-2">{canAdmin&&member.role!=="owner"?<select className="min-h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold" disabled={busyMember===member.id} onChange={(event)=>void changeRole(member,event.target.value as "admin"|"editor"|"analyst")} value={member.role}><option value="admin">admin</option><option value="editor">editor</option><option value="analyst">analyst</option></select>:<span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{member.role}</span>}{isOwner&&member.role!=="owner"?<button className="text-xs font-semibold text-teal-700 disabled:opacity-40" disabled={busyMember===member.id} onClick={()=>void transferOwner(member)} type="button">Owner qilish</button>:null}{canAdmin&&member.role!=="owner"?<button className="text-xs font-semibold text-rose-600 disabled:opacity-40" disabled={busyMember===member.id} onClick={()=>void removeMember(member)} type="button">Remove</button>:null}</div></div>)}</div>
      {canAdmin?<><div className="mt-5 grid gap-2 sm:grid-cols-[1fr_150px_auto]"><input className="min-h-10 rounded-md border border-slate-200 px-3 text-sm" onChange={(event)=>setEmail(event.target.value)} placeholder="member@example.com" type="email" value={email}/><select className="min-h-10 rounded-md border border-slate-200 px-3 text-sm" onChange={(event)=>setRole(event.target.value as typeof role)} value={role}><option value="admin">Admin</option><option value="editor">Editor</option><option value="analyst">Analyst</option></select><button className="rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" onClick={()=>void invite()} type="button">Invite</button></div>{inviteToken?<div className="mt-3 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900"><p className="font-semibold">Bir martalik invite link</p><code className="mt-1 block break-all">{`${window.location.origin}/guest/invite?token=${encodeURIComponent(inviteToken)}`}</code></div>:null}<div className="mt-4 space-y-2">{invitations.filter((item)=>item.status==="pending").map((invitation)=><div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm" key={invitation.id}><span>{invitation.email} · {invitation.role}</span><button className="text-xs font-semibold text-rose-600" onClick={()=>void revoke(invitation.id)} type="button">Revoke</button></div>)}</div></>:null}
    </section>
  </div>;
}

function Panel({children}:{children:React.ReactNode}){return <section className="rounded-xl bg-white p-6 text-sm shadow-sm ring-1 ring-black/5">{children}</section>}
function Field({label,value,onBlur}:{label:string;value:string;onBlur:(value:string)=>void}){const[local,setLocal]=useState(value);useEffect(()=>setLocal(value),[value]);return <label className="grid gap-1"><span className="text-xs font-semibold text-slate-500">{label}</span><input className="min-h-10 rounded-md border border-slate-200 px-3 text-sm" onBlur={()=>local!==value&&onBlur(local)} onChange={(event)=>setLocal(event.target.value)} value={local}/></label>}
function Usage({label,used,limit,detail}:{label:string;used:number;limit:number;detail?:string}){const pct=limit<=0?(used>0?100:0):Math.min(100,Math.round((used/limit)*100));return <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-black/5"><div className="flex justify-between gap-3 text-sm"><span>{label}</span><strong>{used}/{limit}</strong></div><div className="mt-3 h-2 overflow-hidden rounded bg-slate-200"><div className="h-full bg-slate-900" style={{width:`${pct}%`}}/></div>{detail?<p className="mt-2 text-[11px] text-slate-500">{detail}</p>:null}</div>}
function Badge({on,children}:{on:boolean;children:React.ReactNode}){return <span className={on?"rounded-full bg-teal-50 px-3 py-1 text-teal-700":"rounded-full bg-slate-100 px-3 py-1 text-slate-400"}>{on?"✓ ":"— "}{children}</span>}
