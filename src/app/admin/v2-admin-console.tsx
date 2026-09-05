"use client";

import Link from "next/link";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  getV2AdminAudit,
  getV2AdminOverview,
  getV2AdminSites,
  type V2AdminOverview,
  type V2AuditLog,
  type V2Page,
  type V2Site,
} from "@/modules/api/v2-management-client";
import { getCachedV2User, refreshV2Session } from "@/modules/auth/v2-session";

const emptyPage = <T,>(): V2Page<T> => ({ count: 0, next: null, previous: null, results: [] });

export function V2AdminConsole() {
  const [sitesPage, setSitesPage] = useState<V2Page<V2Site>>(emptyPage());
  const [auditPage, setAuditPage] = useState<V2Page<V2AuditLog>>(emptyPage());
  const [overview, setOverview] = useState<V2AdminOverview | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "signed-out" | "forbidden" | "error">("loading");
  const [message, setMessage] = useState("");
  const [siteQuery, setSiteQuery] = useState("");
  const [siteStatus, setSiteStatus] = useState("");
  const [sitePage, setSitePage] = useState(1);
  const [auditQuery, setAuditQuery] = useState("");
  const [auditPageNumber, setAuditPageNumber] = useState(1);

  const loadAdminData = useCallback(async () => {
    const [nextSites, nextOverview, nextAudit] = await Promise.all([
      getV2AdminSites({ page: sitePage, q: siteQuery.trim(), status: siteStatus }),
      getV2AdminOverview(),
      getV2AdminAudit({ page: auditPageNumber, q: auditQuery.trim() }),
    ]);
    setSitesPage(nextSites);
    setOverview(nextOverview);
    setAuditPage(nextAudit);
  }, [sitePage, siteQuery, siteStatus, auditPageNumber, auditQuery]);

  useEffect(() => {
    void (async () => {
      const session = getCachedV2User() ? { user: getCachedV2User() } : await refreshV2Session();
      if (!session?.user) { setState("signed-out"); return; }
      if (!session.user.is_staff) { setState("forbidden"); return; }
      try {
        await loadAdminData();
        setState("ready");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Admin ma'lumotlari yuklanmadi.");
        setState("error");
      }
    })();
  }, [loadAdminData]);

  if (state === "loading") return <Notice>Admin console yuklanmoqda...</Notice>;
  if (state === "signed-out") return <Notice><Link className="font-semibold text-teal-700" href="/login?next=/admin">Platform admin sifatida kiring</Link></Notice>;
  if (state === "forbidden") return <Notice>Bu account platform staff emas.</Notice>;
  if (state === "error") return <Notice>{message || "Admin console yuklanmadi."}</Notice>;

  return <>
    <section className="mt-6 grid gap-3 sm:grid-cols-4">
      <Stat label="Saytlar" value={String(overview?.sites.total ?? 0)} />
      <Stat label="Published" value={String(overview?.sites.published ?? 0)} />
      <Stat label="QR kodlar" value={String(overview?.qr_codes ?? 0)} />
      <Stat label="Verified domains" value={String(overview?.verified_domains ?? 0)} />
    </section>
    <section className="mt-6 grid gap-3 sm:grid-cols-3">
      <Stat label="Tenantlar" value={String(overview?.tenants ?? 0)} />
      <Stat label="Active QR" value={String(overview?.active_qr_codes ?? 0)} />
      <Stat label="Custom domains" value={String(overview?.custom_domains ?? 0)} />
    </section>

    <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">V2 saytlar</h2>
            <p className="mt-1 text-sm text-slate-500">{sitesPage.count} ta site · server-side search va bounded pagination.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input className="min-h-10 rounded-md border border-slate-200 px-3 text-sm" onChange={(event) => { setSiteQuery(event.target.value); setSitePage(1); }} placeholder="Site yoki tenant qidirish" value={siteQuery} />
            <select className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" onChange={(event) => { setSiteStatus(event.target.value); setSitePage(1); }} value={siteStatus}>
              <option value="">Barcha statuslar</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Site</th><th className="px-5 py-3">Tenant</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Version</th><th className="px-5 py-3">Actions</th></tr></thead><tbody>{sitesPage.results.map((site)=><tr className="border-t border-slate-100" key={site.id}><td className="px-5 py-4"><p className="font-semibold">{site.name}</p><p className="text-xs text-slate-500">{site.slug}</p></td><td className="px-5 py-4 font-mono text-xs text-slate-500">{site.tenant}</td><td className="px-5 py-4">{site.status}</td><td className="px-5 py-4">{site.published?.version ?? "-"}</td><td className="px-5 py-4"><Link className="font-semibold text-teal-700" href={`/guest/builder?site=${site.id}`}>Studio</Link></td></tr>)}{sitesPage.results.length===0?<tr><td className="px-5 py-8 text-slate-500" colSpan={5}>Mos site topilmadi.</td></tr>:null}</tbody></table></div>
      <Pager page={sitePage} next={sitesPage.next} previous={sitesPage.previous} onPage={setSitePage} />
    </section>

    <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Audit trail</h2>
            <p className="mt-1 text-sm text-slate-500">{auditPage.count} ta forensic event. Secret/token metadata bu endpointga chiqarilmaydi.</p>
          </div>
          <input className="min-h-10 rounded-md border border-slate-200 px-3 text-sm" onChange={(event) => { setAuditQuery(event.target.value); setAuditPageNumber(1); }} placeholder="Action, tenant, actor..." value={auditQuery} />
        </div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Time</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Tenant</th><th className="px-5 py-3">Actor</th><th className="px-5 py-3">Object</th><th className="px-5 py-3">Metadata</th></tr></thead><tbody>{auditPage.results.map((row)=><tr className="border-t border-slate-100 align-top" key={row.id}><td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{new Date(row.created_at).toLocaleString()}</td><td className="px-5 py-4 font-semibold">{row.action}</td><td className="px-5 py-4">{row.tenant_name ?? "-"}</td><td className="px-5 py-4 text-xs">{row.actor_email ?? "system"}</td><td className="px-5 py-4 text-xs">{row.object_type || "-"} {row.object_id ? `· ${row.object_id}` : ""}</td><td className="max-w-[340px] px-5 py-4"><pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs text-slate-500">{JSON.stringify(row.metadata)}</pre></td></tr>)}{auditPage.results.length===0?<tr><td className="px-5 py-8 text-slate-500" colSpan={6}>Audit event topilmadi.</td></tr>:null}</tbody></table></div>
      <Pager page={auditPageNumber} next={auditPage.next} previous={auditPage.previous} onPage={setAuditPageNumber} />
    </section>
  </>;
}

function Pager({page,next,previous,onPage}:{page:number;next:string|null;previous:string|null;onPage:(value:number)=>void}){return <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm"><button className="rounded-md px-3 py-2 font-semibold ring-1 ring-black/10 disabled:opacity-40" disabled={!previous} onClick={()=>onPage(Math.max(1,page-1))} type="button">Oldingi</button><span className="text-slate-500">Sahifa {page}</span><button className="rounded-md px-3 py-2 font-semibold ring-1 ring-black/10 disabled:opacity-40" disabled={!next} onClick={()=>onPage(page+1)} type="button">Keyingi</button></div>}
function Stat({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>}
function Notice({children}:{children:React.ReactNode}){return <section className="mt-6 rounded-xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-black/5">{children}</section>}
