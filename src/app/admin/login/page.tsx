import Link from "next/link";
import { loginAdmin } from "./actions";
import { isAdminPasswordConfigured } from "@/modules/admin/auth";

type AdminLoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const { error } = await searchParams;
  const configured = isAdminPasswordConfigured();

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-8 text-slate-950">
      <section className="w-full max-w-md rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5">
        <Link className="text-sm font-semibold text-slate-500" href="/">
          qr.dirac.space
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">Admin kirish</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Umumiy admin panel va boshqaruv API faqat parol bilan ochiladi.
        </p>

        {!configured ? (
          <div className="mt-5 rounded-md bg-rose-50 p-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            Serverda ADMIN_PASSWORD sozlanmagan.
          </div>
        ) : null}

        <form action={loginAdmin} className="mt-6 grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-600">Parol</span>
            <input
              className="min-h-12 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-500"
              name="password"
              required
              type="password"
            />
          </label>
          {error ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-100">
              Parol noto&apos;g&apos;ri.
            </p>
          ) : null}
          <button
            className="min-h-12 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:bg-slate-400"
            disabled={!configured}
            type="submit"
          >
            Kirish
          </button>
        </form>
      </section>
    </main>
  );
}
