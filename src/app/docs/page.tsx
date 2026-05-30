import Link from "next/link";
import { MarketingNavbar } from "@/shared/ui/marketing-navbar";

export const metadata = {
  title: "Docs | BM QR",
  description: "BM QR platformasi uchun tezkor qo llanma va FAQ.",
};

export default function DocsPage() {
  return (
    <main className="premium-bg min-h-screen text-slate-900">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-[520px] w-[520px] rounded-full bg-cyan-200/24 blur-3xl" />
        <div className="absolute right-0 top-8 h-[500px] w-[500px] rounded-full bg-blue-200/18 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pb-14 pt-6 lg:px-10">
        <MarketingNavbar active="docs" />

        <section className="pb-10 pt-14">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Docs</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
            BM QR Quick docs va ish jarayoni
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Quyidagi qo llanma buyer, marketing manager va operatorlar uchun.
            Bu yerda launch jarayoni, kontent strukturasi va publishing bo yicha asosiy qoidalar jamlangan.
          </p>
        </section>

        <section className="grid gap-4 pb-6 lg:grid-cols-[.95fr_1.05fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Quick start</p>
            <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <li>1. Brand brief va asosiy CTA ro yxatini tayyorlang.</li>
              <li>2. Xizmatlar, aloqa kanallari va ishonch kontentini yuboring.</li>
              <li>3. Birinchi draftni ko rib, revision feedback bering.</li>
              <li>4. Final tasdiqdan keyin publish va QR rollout qilinadi.</li>
            </ol>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Content blueprint</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Hero</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Offer + trust + main CTA</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Services</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Clear structure and pricing cues</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Proof</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Case metrics and social trust</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Footer CTA</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Single clear next action</p>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-4 pb-6 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <h3 className="text-base font-semibold text-slate-900">Publishing</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Subdomain yoki custom domainga publish, keyin QR print assets tayyorlanadi.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <h3 className="text-base font-semibold text-slate-900">Edits</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Kontent update paketingizga qarab batch formatda kiritiladi.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <h3 className="text-base font-semibold text-slate-900">Performance</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Mobil-first yuklanish va CTA visibility asosiy prioritet sifatida saqlanadi.
            </p>
          </article>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.06)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">FAQ</p>
          <div className="mt-3 space-y-4 text-sm leading-7 text-slate-600">
            <div>
              <p className="font-semibold text-slate-900">Qancha vaqtda ishga tushadi?</p>
              <p>Odatda 24-72 soat oralig ida birinchi versiya tayyor bo ladi.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Kimlar uchun mos?</p>
              <p>Premium xizmat sotadigan klinika, studio, consulting va shunga o xshash bizneslar uchun.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Keyin kengaytirish mumkinmi?</p>
              <p>Ha, landingga qo shimcha bloklar va alohida page lar qo shib borish mumkin.</p>
            </div>
          </div>
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
              Pricing ko rish
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
