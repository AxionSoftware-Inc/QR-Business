import Link from "next/link";
import {
  guestPlanDetails,
  type GuestPlan,
} from "@/modules/guest/guest-site-factory";
import { GoogleUserPill } from "@/shared/ui/google-user-pill";
import { GuestDashboardClient } from "./guest-dashboard-client";

const plans: GuestPlan[] = ["oddiy", "plus", "pro"];

const planStyles: Record<GuestPlan, string> = {
  oddiy: "border-teal-200 bg-teal-50 text-teal-900",
  plus: "border-violet-200 bg-violet-50 text-violet-950",
  pro: "border-slate-800 bg-slate-950 text-white",
};

export default function GuestDashboardPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbf8_0%,#f6f7fb_42%,#eef1f7_100%)] px-4 py-5 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-xl bg-white/82 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link className="text-sm font-semibold text-slate-500" href="/guest">
              Guest
            </Link>
            <h1 className="mt-1 text-3xl font-semibold">Dashboard</h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Auth yo&apos;q. Tanlov va draft brauzerda saqlanadi.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <GoogleUserPill />
            <Link
              className="flex min-h-11 items-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white"
              href="/guest/builder?plan=plus"
            >
              Builderga o&apos;tish
            </Link>
          </div>
          </div>
        </header>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const details = guestPlanDetails[plan];

            return (
              <Link
                className={`flex min-h-[260px] flex-col rounded-lg border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${planStyles[plan]}`}
                href={`/guest/builder?plan=${plan}`}
                key={plan}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold uppercase tracking-[0.14em] opacity-70">
                    {details.badge}
                  </span>
                  <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-slate-900">
                    {details.priceHint}
                  </span>
                </div>
                <h2 className="mt-10 text-4xl font-semibold capitalize">
                  {plan}
                </h2>
                <p className="mt-4 max-w-sm text-sm leading-6 opacity-70">
                  {details.description}
                </p>
                <span className="mt-auto pt-8 text-sm font-semibold">
                  Shu paketda boshlash
                </span>
              </Link>
            );
          })}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="text-xl font-semibold">Guest oqimi</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {["Plan tanlash", "Ma'lumot kiritish", "QR preview olish"].map(
                (item, index) => (
                  <div
                    className="rounded-md bg-slate-50 p-4 ring-1 ring-black/5"
                    key={item}
                  >
                    <p className="text-sm font-semibold text-teal-700">
                      0{index + 1}
                    </p>
                    <p className="mt-3 font-semibold">{item}</p>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="text-xl font-semibold">Keyingi backend</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Front tugagandan keyin guest draftdan tenant, site, QR va order
              yaratamiz. Hozir UI to&apos;liq frontend-only.
            </p>
          </div>
        </section>

        <GuestDashboardClient />
      </div>
    </main>
  );
}
