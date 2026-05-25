import Link from "next/link";
import { redirect } from "next/navigation";
import type React from "react";
import { getAdminAnalyticsFromBackend } from "@/modules/api/backend-client";
import { isAdminAuthenticated } from "@/modules/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/login?next=/admin/analytics");
  }

  const analytics = await getAdminAnalyticsFromBackend();

  if (!analytics) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] px-4 py-6 text-slate-950 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <Link className="text-sm font-semibold text-teal-700" href="/admin">
            Admin
          </Link>
          <h1 className="mt-4 text-3xl font-semibold">Analitika yuklanmadi</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-6 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link className="text-sm font-semibold text-teal-700" href="/admin">
              Admin
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">To&apos;liq analitika</h1>
            <p className="mt-1 text-sm text-slate-500">
              Saytlar, ko&apos;rishlar, bosishlar, paketlar va top sahifalar.
            </p>
          </div>
          <Link
            className="flex min-h-11 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
            href="/guest/builder?plan=pro"
          >
            Pro yaratish
          </Link>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard label="Jami sayt" value={analytics.totals.sites} />
          <StatCard label="Published" value={analytics.totals.published} />
          <StatCard label="Views" value={analytics.totals.views} />
          <StatCard label="Clicks" value={analytics.totals.clicks} />
          <StatCard label="Custom domain" value={analytics.totals.customDomains} />
          <StatCard label="Verified" value={analytics.totals.verifiedCustomDomains} />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <Panel title="Paketlar">
            {analytics.plans.map((item) => (
              <BarRow key={item.plan} label={item.plan} value={item.count} />
            ))}
          </Panel>
          <Panel title="Statuslar">
            {analytics.statuses.map((item) => (
              <BarRow key={item.status} label={item.status} value={item.count} />
            ))}
          </Panel>
          <Panel title="Top click target">
            {analytics.topClickTargets.length === 0 ? (
              <p className="text-sm text-slate-500">Hali click yo&apos;q.</p>
            ) : (
              analytics.topClickTargets.map((item) => (
                <BarRow key={item.target || "unknown"} label={item.target || "unknown"} value={item.count} />
              ))
            )}
          </Panel>
        </section>

        <section className="mt-6 rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5">
          <h2 className="text-xl font-semibold">Top saytlar</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Sayt</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Views</th>
                  <th className="px-4 py-3 font-medium">Clicks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.topSites.map((site) => (
                  <tr key={site.id}>
                    <td className="px-4 py-4 font-semibold">{site.title}</td>
                    <td className="px-4 py-4">
                      <Link className="font-semibold text-teal-700" href={`/${site.slug}`} target="_blank">
                        {site.slug}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{site.plan}</td>
                    <td className="px-4 py-4 text-slate-600">{site.status}</td>
                    <td className="px-4 py-4 font-semibold">{site.views}</td>
                    <td className="px-4 py-4 font-semibold">{site.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3">{children}</div>
    </div>
  );
}

function BarRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium capitalize text-slate-700">{label}</span>
        <span className="font-semibold text-slate-950">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-teal-600"
          style={{ width: `${Math.min(100, Math.max(8, value * 12))}%` }}
        />
      </div>
    </div>
  );
}
