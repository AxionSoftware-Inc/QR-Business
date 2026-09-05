import Link from "next/link";
import { V2AdminConsole } from "./v2-admin-console";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-6 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div>
            <p className="text-sm font-semibold text-teal-700">Platform administration</p>
            <h1 className="mt-1 text-3xl font-semibold">QR Business V2</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Admin access yagona V2 account session va Django staff flag orqali boshqariladi.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="flex min-h-11 items-center rounded-md bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-black/10" href="/guest/dashboard">Workspace</Link>
            <Link className="flex min-h-11 items-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white" href="/guest/builder?plan=plus">Yangi sayt</Link>
          </div>
        </header>
        <V2AdminConsole />
      </div>
    </main>
  );
}
