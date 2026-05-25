"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  decodeGoogleCredential,
  getGoogleUserSession,
  type GoogleUserSession,
  saveGoogleUserSession,
} from "@/modules/auth/google-session";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            callback: (response: { credential?: string }) => void;
            client_id: string;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              shape?: string;
              size?: string;
              text?: string;
              theme?: string;
              type?: string;
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

const googleClientId =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ??
  "597660282677-v5085ek6no8ee4uqklp9skp07o2mbc3j.apps.googleusercontent.com";

export function GoogleLoginClient() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  const [session, setSession] = useState<GoogleUserSession | null>(null);
  const next = searchParams.get("next") || "/guest/dashboard";

  useEffect(() => {
    const existingSession = getGoogleUserSession();
    if (existingSession?.email) {
      window.setTimeout(() => {
        setSession(existingSession);
        setStatus("ready");
      }, 0);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) {
        setStatus("error");
        setError("Google login yuklanmadi.");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response.credential) {
            setStatus("error");
            setError("Google credential kelmadi.");
            return;
          }

          const session = decodeGoogleCredential(response.credential);
          await fetch("/api/auth/google-admin", {
            body: JSON.stringify({ credential: response.credential }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          });
          saveGoogleUserSession(session);
          setSession(session);
          router.replace(next);
        },
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        shape: "rectangular",
        size: "large",
        text: "continue_with",
        theme: "outline",
        type: "standard",
        width: 320,
      });
      setStatus("ready");
    };
    script.onerror = () => {
      setStatus("error");
      setError("Google script yuklanmadi.");
    };
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [next, router]);

  if (session) {
    return (
      <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,#dffaf2_0%,transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-10 text-slate-950">
        <section className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-black/6">
          <Link className="text-sm font-semibold text-teal-700" href="/">
            BM QR
          </Link>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {session.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={session.name}
                className="size-14 rounded-full"
                src={session.picture}
              />
            ) : null}
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Xush kelibsiz, {session.name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{session.email}</p>
            </div>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Link
              className="flex min-h-12 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
              href="/guest/dashboard"
            >
              Dashboard
            </Link>
            <Link
              className="flex min-h-12 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white"
              href="/guest/builder?plan=plus"
            >
              Sayt yaratish
            </Link>
            <Link
              className="flex min-h-12 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-black/10"
              href="/admin/analytics"
            >
              Admin analytics
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,#dffaf2_0%,transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-10 text-slate-950">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-black/6">
        <Link className="text-sm font-semibold text-teal-700" href="/">
          BM QR
        </Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">
          Google bilan kirish
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Dashboardga kirib saytlaringiz, QR kodlar va template builderni bir
          joydan boshqaring.
        </p>

        <div className="mt-6 flex min-h-12 items-center justify-center rounded-lg bg-slate-50 p-2 ring-1 ring-black/5">
          <div ref={buttonRef} />
          {status === "loading" ? (
            <span className="text-sm font-semibold text-slate-500">
              Google login yuklanmoqda...
            </span>
          ) : null}
        </div>

        {status === "error" ? (
          <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
            {error || "Google login ishlamadi."}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            className="flex min-h-11 flex-1 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
            href="/guest/dashboard"
          >
            Guestsiz davom etish
          </Link>
          <Link
            className="flex min-h-11 flex-1 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-black/10"
            href="/guest/builder?plan=plus"
          >
            Builder
          </Link>
        </div>
      </section>
    </div>
  );
}
