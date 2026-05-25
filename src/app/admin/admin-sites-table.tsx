"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  deleteSiteInBackend,
  duplicateSiteInBackend,
  setSiteStatusInBackend,
} from "@/modules/api/backend-client";
import type { PublishedSite, SiteStatus } from "@/modules/sites/types";

type AdminSitesTableProps = {
  initialSites: PublishedSite[];
};

const plans = ["all", "oddiy", "plus", "pro"] as const;
const statuses = ["all", "draft", "published", "disabled"] as const;

export function AdminSitesTable({ initialSites }: AdminSitesTableProps) {
  const [sites, setSites] = useState(initialSites);
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState<(typeof plans)[number]>("all");
  const [status, setStatus] = useState<(typeof statuses)[number]>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredSites = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sites.filter((site) => {
      const matchesQuery =
        !normalizedQuery ||
        site.title.toLowerCase().includes(normalizedQuery) ||
        site.tenantSlug?.toLowerCase().includes(normalizedQuery);
      const matchesPlan = plan === "all" || site.templateKey === plan;
      const matchesStatus = status === "all" || site.status === status;

      return matchesQuery && matchesPlan && matchesStatus;
    });
  }, [plan, query, sites, status]);

  async function setStatusForSite(site: PublishedSite, nextStatus: SiteStatus) {
    setBusyId(site.id);
    const updated = await setSiteStatusInBackend(site.id, nextStatus);
    setBusyId(null);

    if (!updated) {
      return;
    }

    setSites((current) =>
      current.map((entry) => (entry.id === updated.id ? updated : entry)),
    );
  }

  async function duplicateSite(site: PublishedSite) {
    setBusyId(site.id);
    const duplicated = await duplicateSiteInBackend(site.id);
    setBusyId(null);

    if (duplicated) {
      setSites((current) => [duplicated, ...current]);
    }
  }

  async function deleteSite(site: PublishedSite) {
    setBusyId(site.id);
    const deleted = await deleteSiteInBackend(site.id);
    setBusyId(null);

    if (deleted) {
      setSites((current) => current.filter((entry) => entry.id !== site.id));
    }
  }

  return (
    <section className="mt-8 rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <input
          className="min-h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-500"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nomi yoki subdomain bo'yicha qidirish"
          value={query}
        />
        <select
          className="min-h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-500"
          onChange={(event) => setPlan(event.target.value as typeof plan)}
          value={plan}
        >
          {plans.map((item) => (
            <option key={item} value={item}>
              {item === "all" ? "Barcha planlar" : item}
            </option>
          ))}
        </select>
        <select
          className="min-h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-500"
          onChange={(event) => setStatus(event.target.value as typeof status)}
          value={status}
        >
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item === "all" ? "Barcha statuslar" : item}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Nomi</th>
              <th className="px-4 py-3 font-medium">Subdomain</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Ishlash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSites.map((site) => (
              <tr key={site.id}>
                <td className="px-4 py-4 font-medium">{site.title}</td>
                <td className="px-4 py-4 text-slate-600">
                  {site.tenantSlug ?? "unknown"}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={
                      site.status === "published"
                        ? "rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700"
                        : site.status === "disabled"
                          ? "rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"
                          : "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                    }
                  >
                    {site.status}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-600">{site.templateKey}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-3">
                    {site.tenantSlug ? (
                      <>
                        <Link
                          className="font-semibold text-slate-900"
                          href={`/admin/${site.tenantSlug}`}
                        >
                          Builder
                        </Link>
                        <Link
                          className="font-semibold text-teal-700"
                          href={`/${site.tenantSlug}`}
                          target="_blank"
                        >
                          Ochish
                        </Link>
                      </>
                    ) : null}
                    <button
                      className="font-semibold text-violet-700 disabled:text-slate-300"
                      disabled={busyId === site.id}
                      onClick={() => duplicateSite(site)}
                      type="button"
                    >
                      Copy
                    </button>
                    <button
                      className="font-semibold text-amber-700 disabled:text-slate-300"
                      disabled={busyId === site.id}
                      onClick={() =>
                        setStatusForSite(
                          site,
                          site.status === "published" ? "disabled" : "published",
                        )
                      }
                      type="button"
                    >
                      {site.status === "published" ? "Disable" : "Publish"}
                    </button>
                    <button
                      className="font-semibold text-rose-700 disabled:text-slate-300"
                      disabled={busyId === site.id}
                      onClick={() => deleteSite(site)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredSites.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Bu filter bo&apos;yicha sayt topilmadi.
        </p>
      ) : null}
    </section>
  );
}
