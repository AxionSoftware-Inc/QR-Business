import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/modules/admin/auth";
import { listPublishedSitesAsync } from "@/modules/sites/site-repository";
import { AdminSitesTable } from "./admin-sites-table";
import { logoutAdmin } from "./login/actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const sites = await listPublishedSitesAsync();
  const publishedCount = sites.filter((site) => site.status === "published").length;
  const proCount = sites.filter((site) => site.templateKey === "pro").length;

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-6 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-teal-700">Admin MVP</p>
            <h1 className="mt-2 text-3xl font-semibold">Barcha saytlar</h1>
            <p className="mt-1 text-sm text-slate-500">
              Guest, admin-created va demo saytlar bitta joyda.
            </p>
          </div>
          <Link
            className="flex min-h-11 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
            href="/admin/analytics"
          >
            Analitika
          </Link>
          <Link
            className="flex min-h-11 items-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white"
            href="/guest/builder?plan=plus"
          >
            Guest yaratish
          </Link>
          <form action={logoutAdmin}>
            <button
              className="min-h-11 rounded-md bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-black/10"
              type="submit"
            >
              Chiqish
            </button>
          </form>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatCard label="Jami saytlar" value={String(sites.length)} />
          <StatCard label="Published" value={String(publishedCount)} />
          <StatCard label="Pro paketlar" value={String(proCount)} />
        </section>

        <AdminSitesTable initialSites={sites} />
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-black/5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}
