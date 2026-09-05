import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-6 py-16">
      <section className="w-full rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Sahifa topilmadi</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">URL noto‘g‘ri, site hali publish qilinmagan yoki resource mavjud emas.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="flex min-h-11 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" href="/">Bosh sahifa</Link>
          <Link className="flex min-h-11 items-center rounded-md bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-black/10" href="/guest/dashboard">Dashboard</Link>
        </div>
      </section>
    </main>
  );
}
