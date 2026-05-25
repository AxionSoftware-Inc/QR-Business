"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type SiteQrPanelProps = {
  title: string;
  variant?: "default" | "pro";
};

export function SiteQrPanel({ title, variant = "default" }: SiteQrPanelProps) {
  const [dataUrl, setDataUrl] = useState("");
  const [publicUrl, setPublicUrl] = useState("");

  useEffect(() => {
    const url = window.location.href.split("#")[0];
    let mounted = true;

    window.setTimeout(() => {
      if (mounted) {
        setPublicUrl(url);
      }

      QRCode.toDataURL(url, {
        errorCorrectionLevel: "M",
        margin: 1,
        scale: 9,
        color: {
          dark: "#020617",
          light: "#ffffff",
        },
      })
        .then((nextDataUrl) => {
          if (mounted) {
            setDataUrl(nextDataUrl);
          }
        })
        .catch(() => {
          if (mounted) {
            setDataUrl("");
          }
        });
    }, 0);

    return () => {
      mounted = false;
    };
  }, []);

  const fileName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "qr-site"}.png`;

  if (variant === "pro") {
    return (
      <section className="rounded-sm bg-[var(--site-primary)] p-5 text-white shadow-sm sm:p-7">
        <div className="grid gap-5 sm:grid-cols-[220px_1fr] sm:items-center">
          <QrImage dataUrl={dataUrl} title={title} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--site-accent)]">
              QR code
            </p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight">
              Sahifani QR orqali ulashing
            </h2>
            <p className="mt-3 break-all text-sm leading-6 text-white/64">
              {publicUrl || "QR tayyorlanmoqda..."}
            </p>
            {dataUrl ? (
              <a
                className="mt-5 flex min-h-11 w-full items-center justify-center rounded-sm bg-[var(--site-accent)] px-4 text-sm font-semibold text-[var(--site-primary)] sm:w-fit"
                download={fileName}
                href={dataUrl}
              >
                PNG yuklab olish
              </a>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-lg bg-[var(--site-surface)] p-4 shadow-sm ring-1 ring-black/6 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
        <QrImage dataUrl={dataUrl} title={title} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--site-primary)]">
            QR kod
          </p>
          <h2 className="mt-2 text-xl font-semibold leading-tight">
            Bu sahifani tez ulashish
          </h2>
          <p className="mt-2 break-all text-sm leading-6 text-black/55">
            {publicUrl || "QR tayyorlanmoqda..."}
          </p>
          {dataUrl ? (
            <a
              className="mt-4 flex min-h-11 w-full items-center justify-center rounded-md bg-[var(--site-primary)] px-4 text-sm font-semibold text-white sm:w-fit"
              download={fileName}
              href={dataUrl}
            >
              PNG yuklab olish
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function QrImage({ dataUrl, title }: { dataUrl: string; title: string }) {
  return (
    <div className="mx-auto w-full max-w-56 rounded-lg bg-white p-3 shadow-sm ring-1 ring-black/10">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={`${title} QR code`}
          className="aspect-square w-full rounded-md"
          src={dataUrl}
        />
      ) : (
        <div className="aspect-square w-full animate-pulse rounded-md bg-slate-100" />
      )}
    </div>
  );
}
