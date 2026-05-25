"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type QrCodeProps = {
  value: string;
  label?: string;
  className?: string;
};

export function QrCode({ className, label, value }: QrCodeProps) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let mounted = true;

    QRCode.toDataURL(value, {
      errorCorrectionLevel: "M",
      margin: 1,
      scale: 8,
      color: {
        dark: "#020617",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (mounted) {
          setDataUrl(url);
        }
      })
      .catch(() => {
        if (mounted) {
          setDataUrl("");
        }
      });

    return () => {
      mounted = false;
    };
  }, [value]);

  return (
    <div className={className}>
      <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-black/10">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={label ?? "QR code"}
            className="aspect-square w-full rounded-md"
            src={dataUrl}
          />
        ) : (
          <div className="aspect-square w-full animate-pulse rounded-md bg-slate-100" />
        )}
      </div>
      {label ? (
        <p className="mt-2 break-all text-center text-xs leading-5 text-slate-500">
          {label}
        </p>
      ) : null}
    </div>
  );
}
