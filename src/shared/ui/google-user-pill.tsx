"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getCachedV2User,
  logoutV2Session,
  refreshV2Session,
  type V2User,
} from "@/modules/auth/v2-session";

export function GoogleUserPill() {
  const [user, setUser] = useState<V2User | null>(null);

  useEffect(() => {
    const cached = getCachedV2User();
    if (cached) {
      setUser(cached);
      return;
    }
    void refreshV2Session().then((session) => setUser(session?.user ?? null));
  }, []);

  if (!user) {
    return (
      <Link
        className="flex min-h-10 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
        href="/login"
      >
        Google bilan kirish
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-black/6">
      <span className="grid size-8 place-items-center rounded-full bg-teal-100 text-sm font-semibold text-teal-800">
        {(user.name || user.email).slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">{user.name || "Account"}</p>
        <p className="truncate text-xs text-slate-500">{user.email}</p>
      </div>
      <button
        className="min-h-8 rounded-md bg-slate-100 px-3 text-xs font-semibold text-slate-700"
        onClick={() => {
          void logoutV2Session().finally(() => setUser(null));
        }}
        type="button"
      >
        Chiqish
      </button>
    </div>
  );
}
