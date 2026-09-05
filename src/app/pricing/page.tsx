import Link from "next/link";
import { MarketingNavbar } from "@/shared/ui/marketing-navbar";

export const metadata = {
  title: "Pricing | QR Business",
  description: "QR Business Free, Starter, Pro va Business paketlari.",
};

type PublicPlan = {
  key: "free" | "starter" | "pro" | "business";
  name: string;
  description: string;
  limits: { sites: number; members: number; media_assets: number; qr_codes: number; custom_domains: number };
  features: { custom_domains: boolean; advanced_analytics: boolean; remove_branding: boolean };
};

const FALLBACK_PLANS: PublicPlan[] = [
  { key: "free", name: "Free", description: "Bitta biznes sahifani ishga tushirish va QR oqimini sinash uchun.", limits: { sites: 1, members: 1, media_assets: 25, qr_codes: 5, custom_domains: 0 }, features: { custom_domains: false, advanced_analytics: false, remove_branding: false } },
  { key: "starter", name: "Starter", description: "Kichik biznes uchun bir nechta sahifa, ko‘proq media va analytics.", limits: { sites: 3, members: 1, media_assets: 250, qr_codes: 25, custom_domains: 0 }, features: { custom_domains: false, advanced_analytics: true, remove_branding: true } },
  { key: "pro", name: "Pro", description: "Custom domain, team hamkorligi va professional public presence uchun.", limits: { sites: 10, members: 3, media_assets: 2000, qr_codes: 250, custom_domains: 10 }, features: { custom_domains: true, advanced_analytics: true, remove_branding: true } },
  { key: "business", name: "Business", description: "Ko‘p sayt, katta team va yuqori media limiti kerak bo‘lgan tashkilotlar uchun.", limits: { sites: 100, members: 25, media_assets: 20000, qr_codes: 2500, custom_domains: 100 }, features: { custom_domains: true, advanced_analytics: true, remove_branding: true } },
];

async function loadPlans(): Promise<PublicPlan[]> {
  const base = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
  try {
    const response = await fetch(`${base}/api/v2/plans/`, { next: { revalidate: 300 } });
    if (!response.ok) return FALLBACK_PLANS;
    const payload = (await response.json()) as { plans?: PublicPlan[] };
    return Array.isArray(payload.plans) && payload.plans.length ? payload.plans : FALLBACK_PLANS;
  } catch {
    return FALLBACK_PLANS;
  }
}

export default async function PricingPage() {
  const plans = await loadPlans();
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
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">Biznes o‘sishi bilan birga kengayadigan paketlar</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">Barcha paketlar bir xil V2 platformada ishlaydi: immutable publish, dynamic QR va workspace isolation. Farq faqat limit va premium imkoniyatlarda.</p>
        </section>

        <section className="grid gap-4 pb-8 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const featured = plan.key === "pro";
            return (
              <article className={featured ? "rounded-2xl border border-slate-900 bg-slate-900 p-6 text-white shadow-[0_18px_44px_rgba(2,6,23,0.24)]" : "rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]"} key={plan.key}>
                <div className="flex items-center justify-between gap-3">
                  <p className={featured ? "text-sm font-semibold text-white/80" : "text-sm font-semibold text-slate-700"}>{plan.name}</p>
                  {featured ? <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">Recommended</span> : null}
                </div>
                <p className={featured ? "mt-4 min-h-20 text-sm leading-6 text-white/72" : "mt-4 min-h-20 text-sm leading-6 text-slate-600"}>{plan.description}</p>
                <div className={featured ? "mt-5 space-y-2 border-t border-white/12 pt-5 text-sm text-white/85" : "mt-5 space-y-2 border-t border-slate-100 pt-5 text-sm text-slate-600"}>
                  <PlanRow label="Sayt" value={String(plan.limits.sites)} />
                  <PlanRow label="Dynamic QR" value={plan.limits.qr_codes.toLocaleString("en-US")} />
                  <PlanRow label="Team a’zosi" value={String(plan.limits.members)} />
                  <PlanRow label="Media" value={plan.limits.media_assets.toLocaleString("en-US")} />
                  <PlanRow label="Custom domain" value={plan.limits.custom_domains ? String(plan.limits.custom_domains) : "—"} />
                  <PlanFeature label="Advanced analytics" on={plan.features.advanced_analytics} />
                  <PlanFeature label="Brandingni olib tashlash" on={plan.features.remove_branding} />
                </div>
                <Link className={featured ? "mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-slate-900 hover:bg-slate-100" : "mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50"} href={plan.key === "free" ? "/guest/builder?plan=oddiy" : "/login?next=/guest/settings"}>
                  {plan.key === "free" ? "Bepul boshlash" : `${plan.name} uchun account`}
                </Link>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.05)] sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Billing status</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Entitlement modeli tayyor, checkout provider esa alohida adapter.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Plan limitlari server tomonidan majburan enforce qilinadi. To‘lov provayderi ulanganda checkout narxlari va price ID’lar shu modelga biriktiriladi; hozir marketing sahifasi tasdiqlanmagan narxni uydirmaydi.</p>
            </div>
            <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800" href="/guest/dashboard">Workspace ochish</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><span>{label}</span><strong>{value}</strong></div>;
}

function PlanFeature({ label, on }: { label: string; on: boolean }) {
  return <div className="flex items-center justify-between gap-3"><span>{label}</span><strong>{on ? "✓" : "—"}</strong></div>;
}
