import Link from "next/link";
import type React from "react";

type MarketingNavbarProps = {
  active?: "home" | "about" | "pricing" | "docs";
};

const navigation = [
  { href: "/", id: "home", label: "Bosh sahifa" },
  { href: "/about", id: "about", label: "Platforma" },
  { href: "/pricing", id: "pricing", label: "Paketlar" },
  { href: "/docs", id: "docs", label: "Qo'llanma" },
] as const;

export function MarketingNavbar({ active }: MarketingNavbarProps) {
  return (
    <header className="relative rounded-2xl border border-white/80 bg-white/82 px-3 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.09)] backdrop-blur-xl sm:px-4">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/80 to-transparent" />
      <div className="relative flex items-center justify-between gap-3">
        <Link className="flex min-w-0 items-center gap-3" href="/">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-slate-800 via-blue-800 to-cyan-700 shadow-[0_8px_22px_rgba(15,23,42,0.28)]">
            <div className="size-5 rounded-md bg-white/90" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-sm font-semibold tracking-[0.04em] text-slate-900">BM QR</div>
            <div className="truncate text-xs text-slate-500">Biznes uchun QR sahifalar</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-xl bg-slate-100/80 p-1 text-sm font-medium text-slate-600 lg:flex">
          {navigation.map((item) => (
            <NavLink active={active === item.id} href={item.href} key={item.id}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:inline-flex"
            href="/guest"
          >
            Builder
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.22)] transition-colors hover:bg-slate-800 sm:px-4"
            href="/login"
          >
            Kirish
          </Link>
        </div>
      </div>

      <nav className="relative mt-3 flex gap-1 overflow-x-auto border-t border-slate-200/70 pt-3 text-sm font-medium text-slate-600 lg:hidden">
        {navigation.map((item) => (
          <NavLink active={active === item.id} href={item.href} key={item.id}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

function NavLink({
  active,
  children,
  href,
}: {
  active: boolean;
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "whitespace-nowrap rounded-lg bg-white px-3 py-2 font-semibold text-slate-950 shadow-sm ring-1 ring-black/5"
          : "whitespace-nowrap rounded-lg px-3 py-2 transition-colors hover:bg-white/70 hover:text-slate-950"
      }
      href={href}
    >
      {children}
    </Link>
  );
}
