import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <div className="text-lg font-semibold">BM QR</div>
          <Link className="text-sm font-semibold text-teal-700" href="/admin">
            Admin
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              QR business cards
            </p>
            <h1 className="mt-4 max-w-2xl text-5xl font-semibold leading-[1.05] text-slate-950">
              Har bir kichik biznes uchun tez ochiladigan online vizitka.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              Bitta platforma, ko&apos;p subdomain, QR orqali ochiladigan tayyor
              sahifalar. Avval admin-managed MVP, keyin self-service builder.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="flex min-h-11 items-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white"
                href="/site/lola"
              >
                Oddiy demo
              </Link>
              <Link
                className="flex min-h-11 items-center rounded-md bg-violet-700 px-5 text-sm font-semibold text-white"
                href="/site/sabina"
              >
                Plus demo
              </Link>
              <Link
                className="flex min-h-11 items-center rounded-md bg-amber-600 px-5 text-sm font-semibold text-white"
                href="/site/gulasal"
              >
                Pro demo
              </Link>
              <Link
                className="flex min-h-11 items-center rounded-md bg-white px-5 text-sm font-semibold text-slate-800 ring-1 ring-black/10"
                href="/admin"
              >
                Admin MVP
              </Link>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5">
            <div className="rounded-lg bg-teal-700 p-6 text-white">
              <p className="text-sm text-white/75">lola.bm.com</p>
              <h2 className="mt-10 text-3xl font-semibold">Lola Flowers</h2>
              <p className="mt-3 leading-7 text-white/80">
                Telefon, Telegram, xizmatlar, ish vaqti va manzil bitta QR
                sahifada.
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md bg-slate-100 p-4 text-sm font-medium">
                Telefon
              </div>
              <div className="rounded-md bg-slate-100 p-4 text-sm font-medium">
                Telegram
              </div>
              <div className="col-span-2 rounded-md bg-slate-100 p-4 text-sm font-medium">
                Xizmatlar va narxlar
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
