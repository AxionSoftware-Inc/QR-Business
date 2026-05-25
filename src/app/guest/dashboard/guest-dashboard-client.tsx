"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  addCustomDomainInBackend,
  buildBackendQrSvgUrl,
  buildBackendQrUrl,
  getSiteAnalyticsFromBackend,
  listMySitesFromBackend,
  verifyCustomDomainInBackend,
} from "@/modules/api/backend-client";
import {
  getGuestOwnerContact,
  getGuestOwnerRecoveryCode,
  getGuestOwnerToken,
  saveGuestOwnerContact,
  saveGuestOwnerRecoveryCode,
  saveGuestOwnerToken,
} from "@/modules/guest/guest-session";
import type { PublishedSite } from "@/modules/sites/types";

const createdSitesStorageKey = "bm-guest-created-sites";

export function GuestDashboardClient() {
  const [sites, setSites] = useState<PublishedSite[]>([]);
  const [origin, setOrigin] = useState("http://127.0.0.1:3000");
  const [ownerContact, setOwnerContact] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [restoreStatus, setRestoreStatus] = useState<
    "idle" | "loading" | "found" | "empty"
  >("idle");

  useEffect(() => {
    window.setTimeout(() => {
      setOrigin(window.location.origin);
      const ownerToken = getGuestOwnerToken();
      const savedOwnerContact = getGuestOwnerContact();
      const savedRecoveryCode = getGuestOwnerRecoveryCode();
      setOwnerContact(savedOwnerContact);
      setRecoveryCode(savedRecoveryCode);

      try {
        const raw = window.localStorage.getItem(createdSitesStorageKey);
        setSites(raw ? (JSON.parse(raw) as PublishedSite[]) : []);
      } catch {
        window.localStorage.removeItem(createdSitesStorageKey);
      }

      listMySitesFromBackend(ownerToken, savedOwnerContact, savedRecoveryCode).then((backendSites) => {
        if (backendSites.length > 0) {
          setSites(backendSites);
          setRestoreStatus("found");
        }
      });
    }, 0);
  }, []);

  async function restoreByContact() {
    const normalizedContact = ownerContact.trim().toLowerCase();
    const normalizedCode = recoveryCode.trim().toUpperCase();

    if (!normalizedContact || !normalizedCode) {
      setRestoreStatus("empty");
      return;
    }

    setRestoreStatus("loading");
    saveGuestOwnerContact(normalizedContact);
    saveGuestOwnerRecoveryCode(normalizedCode);
    const backendSites = await listMySitesFromBackend(
      "",
      normalizedContact,
      normalizedCode,
    );

    if (backendSites.length === 0) {
      setRestoreStatus("empty");
      return;
    }

    const ownerToken = backendSites.find((site) => site.ownerToken)?.ownerToken;
    const nextRecoveryCode = backendSites.find((site) => site.ownerRecoveryCode)
      ?.ownerRecoveryCode;
    if (ownerToken) {
      saveGuestOwnerToken(ownerToken);
    }
    if (nextRecoveryCode) {
      saveGuestOwnerRecoveryCode(nextRecoveryCode);
      setRecoveryCode(nextRecoveryCode);
    }

    setSites(backendSites);
    setRestoreStatus("found");
  }

  const publishedCount = sites.filter((site) => site.status === "published").length;
  const proCount = sites.filter((site) => site.templateKey === "pro").length;

  return (
    <section className="mt-6 rounded-lg bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Yaratilgan guest saytlar</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Backenddagi guest token bo&apos;yicha yaratilgan saytlar va QR kodlar.
          </p>
        </div>
        <Link
          className="flex min-h-11 items-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white"
          href="/guest/builder?plan=plus"
        >
          Yangi sayt
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <DashboardStat label="Jami" value={String(sites.length)} />
        <DashboardStat label="Online" value={String(publishedCount)} />
        <DashboardStat label="Pro" value={String(proCount)} />
      </div>

      <div className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 ring-1 ring-black/5 lg:grid-cols-[1fr_220px_auto] lg:items-end">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">
            Telefon/email
          </span>
          <input
            className="min-h-11 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-500"
            onChange={(event) => setOwnerContact(event.target.value)}
            placeholder="+998901234567 yoki name@example.com"
            value={ownerContact}
          />
          <span className="text-xs text-slate-500">
            Builderda kiritilgan egasi telefoni yoki emaili.
          </span>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-600">
            Recovery code
          </span>
          <input
            className="min-h-11 rounded-md border border-slate-200 bg-white px-3 text-sm uppercase outline-none focus:border-slate-500"
            onChange={(event) => setRecoveryCode(event.target.value.toUpperCase())}
            placeholder="A1B2C3"
            value={recoveryCode}
          />
          <span className="text-xs text-slate-500">
            Publishdan keyin berilgan kod.
          </span>
        </label>
        <button
          className="min-h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:bg-slate-400"
          disabled={restoreStatus === "loading"}
          onClick={restoreByContact}
          type="button"
        >
          {restoreStatus === "loading" ? "Qidirilyapti..." : "Tiklash"}
        </button>
      </div>
      {restoreStatus === "empty" ? (
        <p className="mt-3 rounded-md bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 ring-1 ring-amber-100">
          Kontakt yoki recovery code noto&apos;g&apos;ri.
        </p>
      ) : restoreStatus === "found" ? (
        <p className="mt-3 rounded-md bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-700 ring-1 ring-teal-100">
          Saytlar dashboardga tiklandi.
        </p>
      ) : null}

      {sites.length === 0 ? (
        <div className="mt-5 rounded-lg bg-slate-50 p-5 ring-1 ring-black/5">
          <p className="text-base font-semibold">Hali sayt yo&apos;q</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Plus yoki Pro paketni tanlab birinchi QR vizitkani yarating.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              className="flex min-h-11 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
              href="/guest/builder?plan=plus"
            >
              Plus bilan boshlash
            </Link>
            <Link
              className="flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-black/10"
              href="/guest/builder?plan=pro"
            >
              Pro ko&apos;rish
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {sites.map((site) => (
            <CreatedSiteCard
              key={site.id}
              origin={origin}
              ownerContact={ownerContact}
              ownerToken={getGuestOwnerToken()}
              recoveryCode={recoveryCode}
              site={site}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CreatedSiteCard({
  origin,
  ownerContact,
  ownerToken,
  recoveryCode,
  site,
}: {
  origin: string;
  ownerContact: string;
  ownerToken: string;
  recoveryCode: string;
  site: PublishedSite;
}) {
  const publicPath = `/${site.tenantSlug ?? ""}`;
  const publicUrl = `${origin}${publicPath}`;
  const stickerPdfUrl = `/api/qr-sheet?url=${encodeURIComponent(publicUrl)}&title=${encodeURIComponent(site.title)}`;
  const [analytics, setAnalytics] = useState<{
    clicks: number;
    clickTargets: Array<{ count: number; target: string }>;
    views: number;
  } | null>(null);
  const [hostname, setHostname] = useState("");
  const [domainStatus, setDomainStatus] = useState("");

  useEffect(() => {
    getSiteAnalyticsFromBackend({
      ownerContact,
      ownerToken,
      recoveryCode,
      siteId: site.id,
    }).then((result) => {
      if (result) {
        setAnalytics(result);
      }
    });
  }, [ownerContact, ownerToken, recoveryCode, site.id]);

  async function addDomain() {
    const result = await addCustomDomainInBackend({
      hostname,
      ownerContact,
      ownerToken,
      recoveryCode,
      siteId: site.id,
    });
    setDomainStatus(
      result
        ? `${result.hostname}: ${result.instructions}`
        : "Domain qo'shilmadi",
    );
  }

  async function verifyDomain() {
    const result = await verifyCustomDomainInBackend({
      hostname,
      ownerContact,
      ownerToken,
      recoveryCode,
      siteId: site.id,
    });
    setDomainStatus(
      result
        ? `${result.hostname}: ${result.status}`
        : "Domain tekshirilmadi",
    );
  }

  return (
    <article className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[150px_1fr]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={`${site.title} QR`}
        className="aspect-square rounded-lg bg-white p-3 shadow-sm ring-1 ring-black/10"
        src={buildBackendQrUrl(site.id, origin)}
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-600">
            {site.templateKey}
          </span>
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
            {site.status}
          </span>
          {site.ownerRecoveryCode ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Recovery: {site.ownerRecoveryCode}
            </span>
          ) : null}
        </div>
        <h3 className="mt-3 text-xl font-semibold">{site.title}</h3>
        <p className="mt-2 break-all text-sm text-slate-500">{publicUrl}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <MiniStat label="Views" value={String(analytics?.views ?? 0)} />
          <MiniStat label="Clicks" value={String(analytics?.clicks ?? 0)} />
          <MiniStat
            label="Top"
            value={analytics?.clickTargets[0]?.target || "-"}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {site.tenantSlug ? (
            <Link
              className="flex min-h-10 items-center rounded-md bg-teal-700 px-3 text-sm font-semibold text-white"
              href={`/guest/builder?edit=${site.tenantSlug}`}
            >
              Tahrirlash
            </Link>
          ) : null}
          <Link
            className="flex min-h-10 items-center rounded-md bg-slate-950 px-3 text-sm font-semibold text-white"
            href={publicPath}
            target="_blank"
          >
            Sahifani ochish
          </Link>
          <a
            className="flex min-h-10 items-center rounded-md bg-white px-3 text-sm font-semibold text-slate-800 ring-1 ring-black/10"
            download={`${site.tenantSlug ?? site.id}.png`}
            href={buildBackendQrUrl(site.id, origin)}
          >
            QR PNG
          </a>
          <a
            className="flex min-h-10 items-center rounded-md bg-white px-3 text-sm font-semibold text-slate-800 ring-1 ring-black/10"
            download={`${site.tenantSlug ?? site.id}.svg`}
            href={buildBackendQrSvgUrl(site.id, origin)}
          >
            QR SVG
          </a>
          <a
            className="flex min-h-10 items-center rounded-md bg-white px-3 text-sm font-semibold text-slate-800 ring-1 ring-black/10"
            download={`${site.tenantSlug ?? site.id}-stickers.pdf`}
            href={stickerPdfUrl}
          >
            Sticker PDF
          </a>
        </div>
        <div className="mt-4 rounded-md bg-slate-50 p-3 ring-1 ring-black/5">
          <p className="text-sm font-semibold">Custom domain</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input
              className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-500"
              onChange={(event) => setHostname(event.target.value)}
              placeholder="example.uz"
              value={hostname}
            />
            <button
              className="min-h-10 rounded-md bg-white px-3 text-sm font-semibold text-slate-800 ring-1 ring-black/10"
              onClick={addDomain}
              type="button"
            >
              Qo&apos;shish
            </button>
            <button
              className="min-h-10 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white"
              onClick={verifyDomain}
              type="button"
            >
              Verify
            </button>
          </div>
          {domainStatus ? (
            <p className="mt-2 break-all text-xs leading-5 text-slate-500">
              {domainStatus}
            </p>
          ) : null}
          {site.domains?.filter((domain) => domain.type === "custom").map((domain) => (
            <p className="mt-2 text-xs text-slate-500" key={domain.hostname}>
              {domain.hostname} - {domain.status}
            </p>
          ))}
        </div>
      </div>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-black/5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function DashboardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-black/5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
