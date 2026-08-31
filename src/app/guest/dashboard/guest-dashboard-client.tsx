"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  createV2Domain,
  createV2QRCode,
  downloadV2QRCode,
  getV2DomainVerification,
  getV2SiteAnalytics,
  listV2Domains,
  listV2QRCodes,
  listV2Sites,
  verifyV2Domain,
  type V2Analytics,
  type V2Domain,
  type V2QRCode,
  type V2Site,
} from "@/modules/api/v2-management-client";
import { getCachedV2User, refreshV2Session, type V2Membership } from "@/modules/auth/v2-session";

const activeTenantKey = "qr-business-v2-active-tenant";

export function GuestDashboardClient() {
  const [sites, setSites] = useState<V2Site[]>([]);
  const [domains, setDomains] = useState<V2Domain[]>([]);
  const [qrCodes, setQrCodes] = useState<V2QRCode[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, V2Analytics>>({});
  const [memberships, setMemberships] = useState<V2Membership[]>([]);
  const [activeTenantId, setActiveTenantIdState] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "signed-out" | "error">("loading");
  const [message, setMessage] = useState("");

  function chooseTenant(tenantId: string) {
    setActiveTenantIdState(tenantId);
    window.localStorage.setItem(activeTenantKey, tenantId);
  }

  async function reload() {
    const session = getCachedV2User() ? { user: getCachedV2User() } : await refreshV2Session();
    if (!session?.user) {
      setStatus("signed-out");
      return;
    }
    const nextMemberships = session.user.memberships;
    setMemberships(nextMemberships);
    const saved = window.localStorage.getItem(activeTenantKey) ?? "";
    const selected = nextMemberships.some((m) => m.tenant_id === saved) ? saved : (nextMemberships[0]?.tenant_id ?? "");
    if (selected) chooseTenant(selected);

    try {
      const [nextSites, nextDomains, nextQrCodes] = await Promise.all([listV2Sites(), listV2Domains(), listV2QRCodes()]);
      setSites(nextSites);
      setDomains(nextDomains);
      setQrCodes(nextQrCodes);
      const rows = await Promise.all(nextSites.map(async (site) => [site.id, await getV2SiteAnalytics(site.id)] as const));
      setAnalytics(Object.fromEntries(rows));
      setStatus("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Dashboard yuklanmadi.");
      setStatus("error");
    }
  }

  useEffect(() => { void reload(); }, []);

  const activeMembership = memberships.find((m) => m.tenant_id === activeTenantId);
  const visibleSites = sites.filter((site) => !activeTenantId || site.tenant === activeTenantId);
  const publishedCount = visibleSites.filter((site) => site.status === "published").length;
  const totalViews = useMemo(() => visibleSites.reduce((sum, site) => sum + metric(analytics[site.id], "view"), 0), [analytics, visibleSites]);
  const totalScans = useMemo(() => visibleSites.reduce((sum, site) => sum + metric(analytics[site.id], "qr_scan"), 0), [analytics, visibleSites]);

  if (status === "loading") return <PanelText>Dashboard yuklanmoqda...</PanelText>;
  if (status === "signed-out") {
    return <section className="mt-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5"><h2 className="text-2xl font-semibold">Account bilan kiring</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">V2 workspace verified account membership orqali boshqariladi.</p><Link className="mt-5 inline-flex min-h-11 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" href="/login?next=/guest/dashboard">Google bilan kirish</Link></section>;
  }

  return (
    <section className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">V2 workspace</p><h2 className="mt-1 text-2xl font-semibold">{activeMembership?.tenant_name ?? "Business workspace"}</h2><p className="mt-1 text-sm leading-6 text-slate-500">Har bir biznes alohida tenant boundary ichida boshqariladi.</p></div>
        <div className="flex flex-wrap gap-2">
          {memberships.length > 1 ? <select className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold" onChange={(e) => chooseTenant(e.target.value)} value={activeTenantId}>{memberships.map((m) => <option key={m.tenant_id} value={m.tenant_id}>{m.tenant_name} · {m.role}</option>)}</select> : null}
          <Link className="flex min-h-10 items-center rounded-md bg-teal-700 px-3 text-sm font-semibold text-white" href={`/guest/builder?plan=plus${activeTenantId ? `&tenant=${activeTenantId}` : ""}`}>Yangi sayt</Link>
          <button className="min-h-10 rounded-md bg-white px-3 text-sm font-semibold ring-1 ring-black/10" onClick={() => void reload()} type="button">Yangilash</button>
        </div>
      </div>

      {message ? <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p> : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-4"><DashboardStat label="Saytlar" value={String(visibleSites.length)} /><DashboardStat label="Published" value={String(publishedCount)} /><DashboardStat label="Views" value={String(totalViews)} /><DashboardStat label="QR scans" value={String(totalScans)} /></div>

      {visibleSites.length === 0 ? <div className="mt-5 rounded-lg bg-slate-50 p-5 ring-1 ring-black/5"><p className="font-semibold">Bu workspace’da hali sayt yo‘q</p><p className="mt-2 text-sm leading-6 text-slate-600">Yangi V2 Site Studio orqali birinchi saytni yarating.</p><Link className="mt-4 inline-flex min-h-11 items-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white" href={`/guest/builder?plan=plus${activeTenantId ? `&tenant=${activeTenantId}` : ""}`}>Yangi sayt yaratish</Link></div> : <div className="mt-5 grid gap-4 lg:grid-cols-2">{visibleSites.map((site) => <SiteCard analytics={analytics[site.id]} domains={domains.filter((domain) => domain.site === site.id)} key={site.id} qrCodes={qrCodes.filter((qr) => qr.site === site.id)} onChanged={reload} site={site} />)}</div>}
    </section>
  );
}

function SiteCard({ site, domains, qrCodes, analytics, onChanged }: { site: V2Site; domains: V2Domain[]; qrCodes: V2QRCode[]; analytics?: V2Analytics; onChanged: () => Promise<void> }) {
  const [hostname, setHostname] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const user = getCachedV2User();
  const tenant = user?.memberships.find((membership) => membership.tenant_id === site.tenant);
  const publicPath = tenant ? `/${tenant.tenant_slug}/${site.slug}` : `/${site.slug}`;
  const primaryQr = qrCodes[0];

  async function ensureQr() { return primaryQr ?? createV2QRCode({ tenant: site.tenant, site: site.id, label: site.name, campaign: "default" }); }
  async function download(format: "png" | "svg") { setBusy(true); setNote(""); try { const qr = await ensureQr(); await downloadV2QRCode(qr, site.slug, format); if (!primaryQr) await onChanged(); } catch (error) { setNote(error instanceof Error ? error.message : "QR yuklab bo‘lmadi."); } finally { setBusy(false); } }
  async function addDomain() { const clean = hostname.trim().toLowerCase(); if (!clean) return; setBusy(true); try { const domain = await createV2Domain({ tenant: site.tenant, site: site.id, hostname: clean }); const proof = await getV2DomainVerification(domain.id); setNote(`DNS TXT: ${proof.record_name} = ${proof.record_value}`); setHostname(""); await onChanged(); } catch (error) { setNote(error instanceof Error ? error.message : "Domain qo‘shilmadi."); } finally { setBusy(false); } }
  async function verify(domain: V2Domain) { setBusy(true); try { const result = await verifyV2Domain(domain.id); setNote(result.verified ? `${domain.hostname} verified.` : `${domain.hostname}: TXT proof hali topilmadi.`); await onChanged(); } catch (error) { setNote(error instanceof Error ? error.message : "Domain tekshirilmadi."); } finally { setBusy(false); } }

  return <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{site.status}</span><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">{tenant?.role ?? "member"}</span>{site.published ? <span className="text-xs text-slate-400">v{site.published.version}</span> : null}</div><h3 className="mt-3 text-xl font-semibold">{site.name}</h3><p className="mt-1 text-sm text-slate-500">{publicPath}</p><div className="mt-4 grid grid-cols-3 gap-2"><MiniStat label="Views" value={String(metric(analytics, "view"))} /><MiniStat label="Scans" value={String(metric(analytics, "qr_scan"))} /><MiniStat label="Clicks" value={String(metric(analytics, "cta_click"))} /></div><div className="mt-4 flex flex-wrap gap-2"><Link className="flex min-h-10 items-center rounded-md bg-teal-700 px-3 text-sm font-semibold text-white" href={`/guest/builder?site=${site.id}&tenant=${site.tenant}`}>Tahrirlash</Link>{site.status === "published" ? <Link className="flex min-h-10 items-center rounded-md bg-slate-950 px-3 text-sm font-semibold text-white" href={publicPath} target="_blank">Public sayt</Link> : null}<button className="min-h-10 rounded-md bg-white px-3 text-sm font-semibold ring-1 ring-black/10 disabled:opacity-50" disabled={busy} onClick={() => void download("png")} type="button">QR PNG</button><button className="min-h-10 rounded-md bg-white px-3 text-sm font-semibold ring-1 ring-black/10 disabled:opacity-50" disabled={busy} onClick={() => void download("svg")} type="button">QR SVG</button></div><div className="mt-4 rounded-md bg-slate-50 p-3 ring-1 ring-black/5"><p className="text-sm font-semibold">Custom domain</p><div className="mt-2 flex gap-2"><input className="min-h-10 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm" onChange={(event) => setHostname(event.target.value)} placeholder="example.com" value={hostname} /><button className="min-h-10 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => void addDomain()} type="button">Qo‘shish</button></div>{domains.map((domain) => <div className="mt-3 flex items-center justify-between gap-3 text-sm" key={domain.id}><span className="min-w-0 truncate">{domain.hostname} · {domain.status}</span>{domain.status !== "verified" ? <button className="shrink-0 font-semibold text-teal-700 disabled:opacity-50" disabled={busy} onClick={() => void verify(domain)} type="button">Verify</button> : null}</div>)}{note ? <p className="mt-3 break-all text-xs leading-5 text-slate-600">{note}</p> : null}</div></article>;
}

function metric(analytics: V2Analytics | undefined, type: "view" | "qr_scan" | "cta_click") { return analytics?.totals.find((row) => row.event_type === type)?.count ?? 0; }
function MiniStat({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-black/5"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-semibold">{value}</p></div>; }
function DashboardStat({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-black/5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>; }
function PanelText({ children }: { children: React.ReactNode }) { return <section className="mt-6 rounded-xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-black/5">{children}</section>; }
