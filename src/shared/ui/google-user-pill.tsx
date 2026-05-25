"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  clearGoogleUserSession,
  getGoogleUserSession,
  type GoogleUserSession,
} from "@/modules/auth/google-session";

export function GoogleUserPill() {
  const [session, setSession] = useState<GoogleUserSession | null>(null);

  useEffect(() => {
    window.setTimeout(() => {
      setSession(getGoogleUserSession());
    }, 0);
  }, []);

  if (!session) {
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
      {session.picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={session.name}
          className="size-8 rounded-full"
          height={32}
          src={session.picture}
          width={32}
        />
      ) : (
        <span className="grid size-8 place-items-center rounded-full bg-teal-100 text-sm font-semibold text-teal-800">
          {session.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">
          {session.name}
        </p>
        <p className="truncate text-xs text-slate-500">{session.email}</p>
      </div>
      <button
        className="min-h-8 rounded-md bg-slate-100 px-3 text-xs font-semibold text-slate-700"
        onClick={() => {
          clearGoogleUserSession();
          setSession(null);
        }}
        type="button"
      >
        Chiqish
      </button>
    </div>
  );
}
