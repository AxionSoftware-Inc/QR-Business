import Link from "next/link";
import { GoogleUserPill } from "@/shared/ui/google-user-pill";
import { GuestDashboardClient } from "./guest-dashboard-client";

export default function GuestDashboardPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbf8_0%,#f6f7fb_42%,#eef1f7_100%)] px-4 py-5 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-xl bg-white/82 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><Link className="text-sm font-semibold text-slate-500" href="/">QR Business</Link><h1 className="mt-1 text-3xl font-semibold">Workspace</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Tenant-scoped dashboard: sites, immutable publish, dynamic QR, analytics, domains va team.</p></div>
            <div className="flex flex-wrap items-center gap-3"><GoogleUserPill/><Link className="flex min-h-11 items-center rounded-md bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-black/10" href="/guest/settings">Settings</Link><Link className="flex min-h-11 items-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white" href="/guest/builder?plan=plus">Yangi sayt</Link></div>
          </div>
        </header>
        <GuestDashboardClient />
      </div>
    </main>
  );
}
