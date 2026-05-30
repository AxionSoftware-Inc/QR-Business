import Link from "next/link";
import { MarketingNavbar } from "@/shared/ui/marketing-navbar";

export const metadata = {
  title: "Pricing | BM QR",
  description: "BM QR paketlari va narxlari.",
};

export default function PricingPage() {
  return (
    <main className="premium-bg min-h-screen text-slate-900">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-[520px] w-[520px] rounded-full bg-cyan-200/24 blur-3xl" />
        <div className="absolute right-0 top-12 h-[520px] w-[520px] rounded-full bg-blue-200/18 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pb-14 pt-6 lg:px-10">
        <MarketingNavbar active="pricing" />

        <section className="pb-10 pt-14">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Pricing</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
            Oson startdan high ticket brand darajasigacha
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Har paketda QR optimized UX, premium ko rinish va mobil-first kompozitsiya mavjud.
            Farq asosan brend customization darajasi va xizmat chuqurligida.
          </p>
        </section>

        <section className="grid gap-4 pb-6 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold text-slate-700">Launch</p>
            <p className="mt-2 text-4xl font-semibold text-slate-900">$99</p>
            <p className="mt-1 text-xs text-slate-500">bir martalik setup</p>
            <ul className="mt-5 space-y-2 text-sm leading-7 text-slate-600">
              <li>Single-page premium landing</li>
              <li>3 ta asosiy CTA</li>
              <li>Subdomain publish</li>
              <li>Basic content update</li>
            </ul>
            <Link
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              href="/guest"
            >
              Launchni ko rish
            </Link>
          </article>

          <article className="rounded-2xl border border-slate-900 bg-slate-900 p-6 text-white shadow-[0_18px_44px_rgba(2,6,23,0.28)]">
            <p className="text-sm font-semibold text-white/80">Growth</p>
            <p className="mt-2 text-4xl font-semibold">$249</p>
            <p className="mt-1 text-xs text-white/60">eng mashhur paket</p>
            <ul className="mt-5 space-y-2 text-sm leading-7 text-white/85">
              <li>Multi-section conversion layout</li>
              <li>Brand color and content tuning</li>
              <li>Use case specific structure</li>
              <li>Priority update support</li>
            </ul>
            <Link
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              href="/login"
            >
              Growthni boshlash
            </Link>
          </article>

          <article className="rounded-2xl border border-amber-300/70 bg-gradient-to-b from-amber-50 to-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold text-slate-700">Signature</p>
            <p className="mt-2 text-4xl font-semibold text-slate-900">$499+</p>
            <p className="mt-1 text-xs text-slate-500">high ticket brendlar uchun</p>
            <ul className="mt-5 space-y-2 text-sm leading-7 text-slate-600">
              <li>Advanced brand composition</li>
              <li>Premium interaction detailing</li>
              <li>Custom conversion flow</li>
              <li>Dedicated revision cycle</li>
            </ul>
            <Link
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              href="/login"
            >
              Signature so rov
            </Link>
          </article>
        </section>

        <section className="grid gap-4 pb-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">What is included</p>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <li>Landing architecture, premium visual composition, and CTA strategy</li>
              <li>QR flow optimization for mobile first conversion</li>
              <li>Fast deployment and practical handoff process</li>
              <li>Optional update and expansion support</li>
            </ul>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Need custom scope</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Enterprise or multi branch setup?</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Katta jamoa yoki ko p filialli biznes uchun custom scope tayyorlaymiz.
              Arxitektura va rollout reja alohida kelishiladi.
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
              href="/login"
            >
              Custom quote olish
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}
