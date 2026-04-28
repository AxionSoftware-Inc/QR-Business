import Link from "next/link";
import { listTenantsAsync } from "@/modules/tenants/tenant-repository";

export default async function AdminPage() {
  const tenants = await listTenantsAsync();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-teal-700">Admin MVP</p>
            <h1 className="mt-2 text-3xl font-semibold">Bizneslar</h1>
          </div>
          <button className="min-h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">
            Yangi biznes
          </button>
        </div>

        <div className="mt-8 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full border-collapse text-left text-sm">
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
              {tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="px-4 py-4 font-medium">{tenant.name}</td>
                  <td className="px-4 py-4 text-slate-600">{tenant.slug}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{tenant.plan}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-3">
                      <Link
                        className="font-semibold text-slate-900"
                        href={`/admin/${tenant.slug}`}
                      >
                        Builder
                      </Link>
                      {tenant.status === "active" ? (
                      <Link
                        className="font-semibold text-teal-700"
                        href={`/site/${tenant.slug}`}
                      >
                        Ochish
                      </Link>
                      ) : (
                        <span className="text-slate-400">Keyin</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
