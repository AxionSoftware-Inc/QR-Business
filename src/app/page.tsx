import Link from "next/link";
import { headers } from "next/headers";
import { findPublishedSiteByDomainFromBackend } from "@/modules/api/backend-client";
import { PublicSiteRenderer } from "@/modules/sites/public-site-renderer";
import { MarketingNavbar } from "@/shared/ui/marketing-navbar";
import AiVantaNet from "./ai-vanta-net";

const platformHosts = new Set(["localhost", "127.0.0.1", "qr.dirac.space"]);

export const dynamic = "force-dynamic";

export default async function Home() {
  const headerStore = await headers();
  const host = (headerStore.get("host") ?? "").split(":")[0].toLowerCase();

  if (host && !platformHosts.has(host)) {
    const site = await findPublishedSiteByDomainFromBackend(host);

    if (site?.status === "published") {
      return <PublicSiteRenderer site={site} />;
    }
  }

  return (
    <main className="premium-bg min-h-screen text-slate-900">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-[560px] w-[560px] rounded-full bg-cyan-200/28 blur-3xl" />
        <div className="absolute right-0 top-24 h-[540px] w-[540px] rounded-full bg-blue-200/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-amber-100/35 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pb-14 pt-6 lg:px-10">
        <MarketingNavbar active="home" />

        <section className="grid items-center gap-10 pb-12 pt-14 lg:grid-cols-[1.03fr_.97fr] lg:pt-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Private-label QR platform
            </div>

            <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              High-ticket brendlar uchun
              <span className="block bg-gradient-to-r from-slate-900 via-blue-800 to-cyan-700 bg-clip-text text-transparent">
                executive darajadagi landinglar
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Premium segmentga mos kompozitsiya, ishonchli brending va konversiyaga yonaltirilgan
              axborot arxitekturasi. Har bir sahifa korporativ darajadagi taassurot beradi.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800" href="/lola">
                Executive demo
              </Link>
              <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50" href="/guest">
                Builder
              </Link>
              <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-transparent px-2 text-sm font-semibold text-slate-600 hover:text-slate-900" href="/pricing">
                Pricing
              </Link>
            </div>

            <p className="mt-8 text-sm font-medium tracking-wide text-slate-500">
              Trusted by premium service brands, studios, and private clinics.
            </p>
          </div>

          <div className="relative flex min-h-[420px] items-center justify-center overflow-visible lg:min-h-[520px]">
            <div className="absolute inset-0 bg-[radial-gradient(340px_250px_at_50%_48%,rgba(201,168,94,0.18),transparent_74%)]" />
            <AiVantaNet />
          </div>
        </section>

        <section className="grid gap-4 pb-6 md:grid-cols-3" id="about">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <h3 className="text-base font-semibold text-slate-900">Brand Authority</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Har bir landing vizual va matn darajasida premium positioningni ushlaydi.</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <h3 className="text-base font-semibold text-slate-900">Sales Efficiency</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">QR touchpointdan togri foydalanuvchini kerakli CTA ga olib kiradi.</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <h3 className="text-base font-semibold text-slate-900">Executive Trust</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Toza tipografiya va qatiy struktura yuqori narxdagi xizmatni korsatadi.</p>
          </article>
        </section>

        <section className="grid gap-4 pb-6 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Use case</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Private clinics</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Doctors, services, location va booking CTA bir joyda.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Use case</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Beauty studios</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Portfolio, narxlar va tez aloqa tugmalari bilan premium sahifa.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Use case</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Consulting brands</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ishonchni oshiradigan executive landing va leadga yonaltirilgan flow.
            </p>
          </article>
        </section>

        <section className="pb-6" id="pricing">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.06)] sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pricing</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Brendingiz uchun mos paketni tanlang
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  Har bir paketda premium UX, QR integration va mobil-first optimizatsiya mavjud.
                </p>
              </div>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
                href="/login"
              >
                Konsultatsiya olish
              </Link>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-700">Launch</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">$99</p>
                <p className="mt-1 text-xs text-slate-500">bir martalik setup</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  <li>Single-page premium landing</li>
                  <li>3 ta asosiy CTA tugma</li>
                  <li>QR publish + basic support</li>
                </ul>
                <Link className="mt-5 inline-flex text-sm font-semibold text-slate-900 hover:text-slate-700" href="/guest">
                  Launch demo →
                </Link>
              </article>

              <article className="rounded-2xl border border-slate-900 bg-slate-900 p-5 text-white shadow-[0_16px_38px_rgba(2,6,23,0.28)]">
                <p className="text-sm font-semibold text-white/80">Growth</p>
                <p className="mt-2 text-3xl font-semibold">$249</p>
                <p className="mt-1 text-xs text-white/60">eng mashhur paket</p>
                <ul className="mt-4 space-y-2 text-sm text-white/85">
                  <li>Multi-section conversion layout</li>
                  <li>Custom copy + visual tuning</li>
                  <li>Analytics-ready structure</li>
                </ul>
                <Link className="mt-5 inline-flex text-sm font-semibold text-amber-200 hover:text-amber-100" href="/login">
                  Growthni tanlash →
                </Link>
              </article>

              <article className="rounded-2xl border border-amber-300/70 bg-gradient-to-b from-amber-50 to-white p-5">
                <p className="text-sm font-semibold text-slate-700">Signature</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">$499+</p>
                <p className="mt-1 text-xs text-slate-500">high-ticket brandlar uchun</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  <li>Advanced brand composition</li>
                  <li>Premium interaction system</li>
                  <li>Priority support + revisions</li>
                </ul>
                <Link className="mt-5 inline-flex text-sm font-semibold text-slate-900 hover:text-slate-700" href="/login">
                  Signature so&apos;rash →
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-6 lg:grid-cols-2" id="docs">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Case snapshot</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Premium Beauty Studio</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Yangi landing + QR kampaniyadan keyin mobil lead sifati va konversiya ko&apos;rsatkichlari barqaror oshdi.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">CTR</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">+34%</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Lead rate</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">+27%</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Bounce</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">-18%</div>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Docs</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Quick docs & FAQ</h3>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
              <div>
                <p className="font-semibold text-slate-900">Ishga tushirish qancha vaqt oladi?</p>
                <p>Odatda 24-72 soat ichida birinchi versiya tayyor bo&apos;ladi.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Domen bilan ishlaydimi?</p>
                <p>Ha, subdomain yoki custom domain ulab publish qilish mumkin.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Keyin o&apos;zgartirish kiritsa bo&apos;ladimi?</p>
                <p>Ha, paketga qarab revision va support intervali beriladi.</p>
              </div>
            </div>
          </article>
        </section>

        <footer className="py-10">
          <div className="flex items-center justify-between border-t border-slate-200 pt-7 text-sm text-slate-500">
            <div>© {new Date().getFullYear()} BM QR</div>
            <div className="flex items-center gap-4">
              <Link className="hover:text-slate-900" href="/guest">Builder</Link>
              <Link className="hover:text-slate-900" href="/login">Login</Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

