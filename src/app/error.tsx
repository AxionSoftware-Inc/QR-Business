"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("QR Business route error", { name: error.name, message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-6 py-16">
      <section className="w-full rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">Something went wrong</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Sahifani yuklashda xato yuz berdi</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Ma’lumotlaringiz o‘zgartirilgani yoki o‘chirilgani degani emas. Requestni qayta urinib ko‘rishingiz yoki dashboardga qaytishingiz mumkin.</p>
        {error.digest ? <p className="mt-3 font-mono text-xs text-slate-400">Error reference: {error.digest}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="min-h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" onClick={reset} type="button">Qayta urinish</button>
          <Link className="flex min-h-11 items-center rounded-md bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-black/10" href="/guest/dashboard">Dashboard</Link>
          <Link className="flex min-h-11 items-center rounded-md bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-black/10" href="/">Bosh sahifa</Link>
        </div>
      </section>
    </main>
  );
}
