import Link from "next/link";
import { MarketingNavbar } from "@/shared/ui/marketing-navbar";

export default function GuestEntryPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] px-4 py-5 text-slate-950 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl flex-col">
        <MarketingNavbar />

        <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              Guest builder
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.04] sm:text-6xl">
              Authsiz kirib, QR vizitka sahifani darhol yig&apos;ish.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Mijoz plan tanlaydi, biznes nomi va ijtimoiy tarmoqlarini kiritadi,
              o&apos;ng tomonda live preview va QR maketni ko&apos;radi.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="flex min-h-12 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white"
                href="/login?next=/guest/dashboard"
              >
                Google bilan kirish
              </Link>
              <Link
                className="flex min-h-12 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-slate-800 ring-1 ring-black/10"
                href="/guest/dashboard"
              >
                Guestsiz davom etish
              </Link>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/6">
            <div className="rounded-md bg-slate-950 p-5 text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/62">qr.dirac.space/guest</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                  Plus
                </span>
              </div>
              <h2 className="mt-16 text-3xl font-semibold">Yangi Biznes</h2>
              <p className="mt-3 text-sm leading-6 text-white/68">
                Telefon, Instagram, Telegram, xizmatlar, manzil va QR bir
                joyda.
              </p>
            </div>
            <div className="mt-4 grid grid-cols-[120px_1fr] gap-4">
              <div className="grid aspect-square grid-cols-7 gap-1 rounded-md bg-white p-3 ring-1 ring-black/10">
                {Array.from({ length: 49 }, (_, index) => (
                  <span
                    className={
                      index % 2 === 0 || index % 5 === 0
                        ? "rounded-sm bg-slate-950"
                        : "rounded-sm bg-slate-100"
                    }
                    key={index}
                  />
                ))}
              </div>
              <div className="grid gap-2">
                <div className="rounded-md bg-slate-100 p-3 text-sm font-semibold">
                  Telefon
                </div>
                <div className="rounded-md bg-slate-100 p-3 text-sm font-semibold">
                  Instagram
                </div>
                <div className="rounded-md bg-slate-100 p-3 text-sm font-semibold">
                  Preview
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
