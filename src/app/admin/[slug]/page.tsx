import Link from "next/link";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { AdminSiteEditor } from "@/app/admin/[slug]/site-editor";
import { isAdminAuthenticated } from "@/modules/admin/auth";
import { findPublishedSiteBySlugAsync } from "@/modules/sites/site-repository";
import { findTenantBySlugAsync } from "@/modules/tenants/tenant-repository";

type AdminSitePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminSitePage({ params }: AdminSitePageProps) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const { slug } = await params;
  const tenant = await findTenantBySlugAsync(slug);

  if (!tenant) {
    notFound();
  }

  const site = await findPublishedSiteBySlugAsync(tenant.slug);

  if (!site) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link className="text-sm font-semibold text-slate-500" href="/admin">
              Admin
            </Link>
            <h1 className="mt-1 text-3xl font-semibold">{tenant.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {tenant.plan.toUpperCase()} paket uchun fake builder
            </p>
          </div>
          <Link
            className="flex min-h-11 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
            href={`/${tenant.slug}`}
            target="_blank"
          >
            Public sahifa
          </Link>
        </header>

        <AdminSiteEditor initialSite={site} slug={tenant.slug} />
      </div>
    </main>
  );
}
