import Link from "next/link";
import { MarketingNavbar } from "@/shared/ui/marketing-navbar";

export const metadata = {
  title: "About | BM QR",
  description: "BM QR platformasi va ishlash modeli haqida.",
};

export default function AboutPage() {
  return (
    <main className="premium-bg min-h-screen text-slate-900">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-[520px] w-[520px] rounded-full bg-cyan-200/25 blur-3xl" />
        <div className="absolute right-0 top-16 h-[500px] w-[500px] rounded-full bg-blue-200/18 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pb-14 pt-6 lg:px-10">
        <MarketingNavbar active="about" />

        <section className="pb-10 pt-14">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">About BM QR</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
            QR touchpointdan premium lead flow yaratadigan platforma
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            BM QR kichik va o rta premium bizneslar uchun tayyorlangan marketing landing platforma.
            Bizning fokus: brendga mos dizayn, aniq call-to-action, tez ishga tushish va konversiya.
          </p>
        </section>

        <section className="grid gap-4 pb-6 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <h3 className="text-base font-semibold text-slate-900">Mission</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Har bir QR scan biznesga foyda keltiradigan professional tajribaga aylanishi.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <h3 className="text-base font-semibold text-slate-900">Positioning</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Oddiy vizitka emas, premium xizmat qiymatini ko rsatadigan digital front door.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <h3 className="text-base font-semibold text-slate-900">Execution</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Tez rollout, ishlaydigan copy, mobil-first UX va doimiy yaxshilash jarayoni.
            </p>
          </article>
        </section>

        <section className="grid gap-4 pb-6 lg:grid-cols-[1.1fr_.9fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">What we build</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Landing stack that converts</h2>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
              <li>Premium hero, trust blocks, service cards, and strong CTA hierarchy</li>
              <li>QR optimized page structure with fast load and clear action paths</li>
              <li>Brand level typography, colors, and high ticket presentation logic</li>
              <li>Simple management flow via admin and controlled content updates</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Core metrics</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Avg. launch</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">24-72h</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Mobile focus</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">High</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Visual quality</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">Premium</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">CTA clarity</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">Strong</div>
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.06)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Next step</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
            Brand brief yuboring, birinchi variantni tayyorlaymiz
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Siz xizmat modelini yuborasiz, biz esa unga mos premium landing architecture tayyorlab beramiz.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
              href="/login"
            >
              Start onboarding
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              href="/pricing"
            >
              View pricing
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
