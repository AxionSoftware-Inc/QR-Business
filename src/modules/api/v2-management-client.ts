"use client";

import { authorizedV2Fetch } from "@/modules/auth/v2-session";

export type V2Tenant = {
  id: string;
  name: string;
  slug: string;
  status: "trial" | "active" | "suspended" | "archived";
  plan: "free" | "starter" | "pro" | "business";
  locale: string;
  timezone: string;
};

export type V2SiteVersion = {
  id: string;
  version: number;
  title: string;
  description: string;
  template_key: string;
  theme: Record<string, unknown>;
  blocks: unknown[];
  seo: Record<string, unknown>;
  created_at: string;
};

export type V2Site = {
  id: string;
  tenant: string;
  slug: string;
  name: string;
  status: "draft" | "published" | "disabled";
  draft: V2SiteVersion | null;
  published: V2SiteVersion | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type V2Domain = {
  id: string;
  tenant: string;
  site: string | null;
  hostname: string;
  kind: "subdomain" | "custom";
  status: "pending" | "verified" | "failed" | "disabled";
  verified_at: string | null;
};

export type V2QRCode = {
  id: string;
  tenant: string;
  site: string;
  code: string;
  label: string;
  campaign: string;
  is_active: boolean;
};

export type V2Analytics = {
  totals: Array<{ event_type: "view" | "qr_scan" | "cta_click"; count: number }>;
  top_targets: Array<{ target: string; count: number }>;
};

export type V2DraftPayload = {
  title: string;
  description?: string;
  template_key?: string;
  theme?: Record<string, unknown>;
  blocks?: unknown[];
  seo?: Record<string, unknown>;
};

async function json<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authorizedV2Fetch(path, init);
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {}
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

export function listV2Tenants() {
  return json<V2Tenant[]>("/api/v2/tenants/");
}

export function createV2Tenant(input: { name: string; slug: string; locale?: string; timezone?: string }) {
  return json<V2Tenant>("/api/v2/tenants/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      slug: input.slug,
      locale: input.locale ?? "uz",
      timezone: input.timezone ?? "Asia/Tashkent",
    }),
  });
}

export function listV2Sites() {
  return json<V2Site[]>("/api/v2/sites/");
}

export function getV2Site(siteId: string) {
  return json<V2Site>(`/api/v2/sites/${siteId}/`);
}

export function createV2Site(input: { tenant: string; slug: string; name: string }) {
  return json<V2Site>("/api/v2/sites/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function saveV2Draft(siteId: string, payload: V2DraftPayload) {
  return json<V2SiteVersion>(`/api/v2/sites/${siteId}/draft/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function publishV2Site(siteId: string) {
  return json<V2SiteVersion>(`/api/v2/sites/${siteId}/publish/`, { method: "POST" });
}

export function listV2Domains() {
  return json<V2Domain[]>("/api/v2/domains/");
}

export function listV2QRCodes() {
  return json<V2QRCode[]>("/api/v2/qr-codes/");
}

export function getV2SiteAnalytics(siteId: string) {
  return json<V2Analytics>(`/api/v2/sites/${siteId}/analytics/`);
}

export function createV2Domain(input: { tenant: string; site?: string; hostname: string }) {
  return json<V2Domain>("/api/v2/domains/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenant: input.tenant, site: input.site || null, hostname: input.hostname }),
  });
}

export function getV2DomainVerification(domainId: string) {
  return json<{
    hostname: string;
    record_type: "TXT";
    record_name: string;
    record_value: string;
    status: V2Domain["status"];
  }>(`/api/v2/domains/${domainId}/verification/`);
}

export function verifyV2Domain(domainId: string) {
  return json<{ hostname: string; verified: boolean; status: V2Domain["status"]; observed: string[] }>(
    `/api/v2/domains/${domainId}/verification/`,
    { method: "POST" },
  );
}

export function createV2QRCode(input: { tenant: string; site: string; label?: string; campaign?: string }) {
  return json<V2QRCode>("/api/v2/qr-codes/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function fetchV2QRCodeBlob(qrId: string, format: "png" | "svg" = "png") {
  const response = await authorizedV2Fetch(`/api/v2/qr-codes/${qrId}/image/?format=${format}`);
  if (!response.ok) throw new Error(`QR download failed (${response.status})`);
  return response.blob();
}

export async function downloadV2QRCode(qr: V2QRCode, siteSlug: string, format: "png" | "svg") {
  const blob = await fetchV2QRCodeBlob(qr.id, format);
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${siteSlug}-qr.${format}`;
    anchor.click();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
