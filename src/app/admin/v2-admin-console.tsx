"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useState } from "react";
import { listV2Domains, listV2QRCodes, listV2Sites, type V2Domain, type V2QRCode, type V2Site } from "@/modules/api/v2-management-client";
import { getCachedV2User, refreshV2Session } from "@/modules/auth/v2-session";

export function V2AdminConsole() {
  const [sites, setSites] = useState<V2Site[]>([]);
  const [domains, setDomains] = useState<V2Domain[]>([]);
  const [qrs, setQrs] = useState<V2QRCode[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "signed-out" | "forbidden" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      const session = getCachedV2User() ? { user: getCachedV2User() } : await refreshV2Session();
      if (!session?.user) {
        setState("signed-out");
        return;
      }
      if (!session.user.is_staff) {
        setState("forbidden");
        return;
      }
      try {
        const [nextSites, nextDomains, nextQrs] = await Promise.all([listV2Sites(), listV2Domains(), listV2QRCodes()]);
        setSites(nextSites);
        setDomains(nextDomains);
        setQrs(nextQrs);
        setState("ready");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Admin ma'lumotlari yuklanmadi.");
        setState("error");
      }
    })();
  }, []);

  if (state === "loading") return <Notice>Admin console yuklanmoqda...</Notice>;
  if (state === "signed-out") return <Notice><Link className="font-semibold text-teal-700" href="/login?next=/admin">Platform admin sifatida kiring</Link></Notice>;
  if (state === "forbidden") return <Notice>Bu account platform staff emas.</Notice>;
  if (state === "error") return <Notice>{message || "Admin console yuklanmadi."}</Notice>;

  const published = sites.filter((site) => site.status === "published").length;
  const verifiedDomains = domains.filter((domain) => domain.status === "verified").length;

  return (
    <>
      <section className="mt-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Saytlar" value={String(sites.length)} />
        <Stat label="Published" value={String(published)} />
        <Stat label="QR kodlar" value={String(qrs.length)} />
        <Stat label="Verified domains" value={String(verifiedDomains)} />
      </section>

      <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold">Barcha V2 saytlar</h2>
          <p className="mt-1 text-sm text-slate-500">Staff API queryset barcha tenantlarni ko‘radi; oddiy accountlar faqat membership tenantlarini.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-3">Site</th><th className="px-5 py-3">Tenant</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Version</th><th className="px-5 py-3">Actions</th></tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr className="border-t border-slate-100" key={site.id}>
                  <td className="px-5 py-4"><p className="font-semibold">{site.name}</p><p className="text-xs text-slate-500">{site.slug}</p></td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">{site.tenant}</td>
                  <td className="px-5 py-4">{site.status}</td>
                  <td className="px-5 py-4">{site.published?.version ?? "-"}</td>
                  <td className="px-5 py-4"><Link className="font-semibold text-teal-700" href={`/guest/builder?site=${site.id}`}>Studio</Link></td>
                </tr>
              ))}
              {sites.length === 0 ? <tr><td className="px-5 py-8 text-slate-500" colSpan={5}>V2 saytlar yo‘q.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>;
}

function Notice({ children }: { children: React.ReactNode }) {
  return <section className="mt-6 rounded-xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-black/5">{children}</section>;
}
