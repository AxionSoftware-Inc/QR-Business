import { publishedSites, tenants } from "@/backend";
import type { PublishedSite } from "@/modules/sites/types";
import type { Tenant } from "@/modules/tenants/types";

function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  }

  return process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
}

const DEFAULT_THEME = {
  primaryColor: "#111827",
  backgroundColor: "#f8fafc",
  textColor: "#111827",
  surfaceColor: "#ffffff",
};

function withTenantSlugs(sites: PublishedSite[]) {
  return sites.map((site) => ({
    ...site,
    tenantSlug:
      site.tenantSlug ??
      tenants.find((tenant) => tenant.id === site.tenantId)?.slug,
  }));
}

type ApiTenant = {
  id: number;
  name: string;
  slug: string;
  status: Tenant["status"];
  plan: Tenant["plan"];
  created_at: string;
  updated_at: string;
};

type ApiSite = {
  id: number;
  tenant: number;
  tenant_slug: string;
  owner_token?: string;
  owner_contact?: string;
  owner_recovery_code?: string;
  title: string;
  description: string;
  templateKey?: PublishedSite["templateKey"];
  template_key?: PublishedSite["templateKey"];
  status: PublishedSite["status"];
  theme: PublishedSite["theme"];
  blocks: PublishedSite["blocks"];
  publishedAt?: string;
  published_at?: string;
  domains?: Array<{
    hostname: string;
    status: "pending" | "verified" | "blocked";
    type: "subdomain" | "custom";
  }>;
};

async function fetchJson<T>(path: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 1600);

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function sendJson<T>(
  path: string,
  method: "PATCH" | "POST" | "PUT",
  body: unknown,
): Promise<T | null> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function sendEmpty(path: string, method: "DELETE"): Promise<boolean> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

function normalizeTenant(tenant: ApiTenant): Tenant {
  return {
    id: String(tenant.id),
    ownerId: null,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    plan: tenant.plan,
    createdAt: tenant.created_at,
    updatedAt: tenant.updated_at,
  };
}

function normalizeSite(site: ApiSite): PublishedSite {
  const fallbackSite = publishedSites.find((entry) => {
    const tenant = tenants.find((item) => item.id === entry.tenantId);
    return tenant?.slug === site.tenant_slug;
  });

  return {
    id: String(site.id),
    tenantId: String(site.tenant),
    tenantSlug: site.tenant_slug,
    ownerToken: site.owner_token,
    ownerContact: site.owner_contact,
    ownerRecoveryCode: site.owner_recovery_code,
    domains: site.domains,
    title: site.title,
    description: site.description,
    templateKey: site.templateKey ?? site.template_key ?? "oddiy",
    status: site.status,
    theme:
      Object.keys(site.theme ?? {}).length > 0
        ? site.theme
        : fallbackSite?.theme ?? DEFAULT_THEME,
    blocks: site.blocks.length > 0 ? site.blocks : fallbackSite?.blocks ?? [],
    publishedAt: site.publishedAt ?? site.published_at ?? "",
  };
}

export async function listTenantsFromBackend() {
  const apiTenants = await fetchJson<ApiTenant[]>("/api/tenants/");
  return apiTenants?.map(normalizeTenant) ?? tenants;
}

export async function listSitesFromBackend() {
  const apiSites = await fetchJson<ApiSite[]>("/api/sites/");
  return apiSites?.map(normalizeSite) ?? withTenantSlugs(publishedSites);
}

export async function findTenantBySlugFromBackend(slug: string) {
  const apiTenant = await fetchJson<ApiTenant>(`/api/tenants/${slug}/`);

  if (apiTenant) {
    return normalizeTenant(apiTenant);
  }

  return tenants.find((tenant) => tenant.slug === slug) ?? null;
}

export async function findPublishedSiteBySlugFromBackend(slug: string) {
  const apiSite = await fetchJson<ApiSite>(`/api/sites/by-slug/${slug}/`);

  if (apiSite) {
    return normalizeSite(apiSite);
  }

  return (
    publishedSites.find((site) => {
      const tenant = tenants.find((entry) => entry.id === site.tenantId);
      return tenant?.slug === slug && site.status === "published";
    }) ?? null
  );
}

export async function findPublishedSiteByDomainFromBackend(hostname: string) {
  const apiSite = await fetchJson<ApiSite>(
    `/api/sites/by-domain/${encodeURIComponent(hostname)}/`,
  );

  return apiSite ? normalizeSite(apiSite) : null;
}

export async function addCustomDomainInBackend(input: {
  hostname: string;
  ownerContact?: string;
  ownerToken?: string;
  recoveryCode?: string;
  siteId: string;
}) {
  return sendJson<{
    dns_target: string;
    hostname: string;
    instructions: string;
    status: "pending" | "verified" | "blocked";
  }>(`/api/sites/${input.siteId}/add-domain/`, "POST", {
    hostname: input.hostname,
    ownerContact: input.ownerContact,
    ownerToken: input.ownerToken,
    recoveryCode: input.recoveryCode,
  });
}

export async function verifyCustomDomainInBackend(input: {
  hostname: string;
  ownerContact?: string;
  ownerToken?: string;
  recoveryCode?: string;
  siteId: string;
}) {
  return sendJson<{
    expected: string[];
    hostname: string;
    resolved: string[];
    status: "pending" | "verified" | "blocked";
  }>(`/api/sites/${input.siteId}/verify-domain/`, "POST", {
    hostname: input.hostname,
    ownerContact: input.ownerContact,
    ownerToken: input.ownerToken,
    recoveryCode: input.recoveryCode,
  });
}

export async function getSiteAnalyticsFromBackend(input: {
  ownerContact?: string;
  ownerToken?: string;
  recoveryCode?: string;
  siteId: string;
}) {
  const params = new URLSearchParams();
  if (input.ownerToken) params.set("ownerToken", input.ownerToken);
  if (input.ownerContact) params.set("ownerContact", input.ownerContact);
  if (input.recoveryCode) params.set("recoveryCode", input.recoveryCode);

  return fetchJson<{
    clicks: number;
    clickTargets: Array<{ count: number; target: string }>;
    views: number;
  }>(`/api/sites/${input.siteId}/analytics/?${params.toString()}`);
}

export async function getAdminAnalyticsFromBackend() {
  return fetchJson<{
    plans: Array<{ count: number; plan: string }>;
    statuses: Array<{ count: number; status: string }>;
    topClickTargets: Array<{ count: number; target: string }>;
    topSites: Array<{
      clicks: number;
      id: number;
      plan: string;
      slug: string;
      status: string;
      title: string;
      views: number;
    }>;
    totals: {
      clicks: number;
      customDomains: number;
      published: number;
      sites: number;
      verifiedCustomDomains: number;
      views: number;
    };
  }>("/api/sites/admin-analytics/");
}

export async function trackSiteEventInBackend(input: {
  eventType: "view" | "click";
  siteId: string;
  target?: string;
}) {
  return sendJson<{ ok: boolean }>(`/api/sites/${input.siteId}/track/`, "POST", {
    eventType: input.eventType,
    target: input.target,
  });
}

export async function updateSiteInBackend(site: PublishedSite) {
  const apiSite = await sendJson<ApiSite>(`/api/sites/${site.id}/`, "PATCH", {
    title: site.title,
    description: site.description,
    template_key: site.templateKey,
    status: site.status,
    theme: site.theme,
    blocks: site.blocks,
  });

  return apiSite ? normalizeSite(apiSite) : null;
}

export async function updateGuestSiteInBackend(input: {
  site: PublishedSite;
  ownerToken?: string;
  ownerContact?: string;
  recoveryCode?: string;
}) {
  const apiSite = await sendJson<ApiSite>(
    `/api/sites/${input.site.id}/guest-update/`,
    "POST",
    {
      ownerToken: input.ownerToken,
      ownerContact: input.ownerContact,
      recoveryCode: input.recoveryCode,
      site: {
        title: input.site.title,
        description: input.site.description,
        templateKey: input.site.templateKey,
        status: input.site.status,
        theme: input.site.theme,
        blocks: input.site.blocks,
      },
    },
  );

  return apiSite ? normalizeSite(apiSite) : null;
}

export async function createGuestSiteInBackend(input: {
  businessName: string;
  slug: string;
  ownerToken?: string;
  ownerContact?: string;
  plan: PublishedSite["templateKey"];
  site: PublishedSite;
}) {
  const apiSite = await sendJson<ApiSite>("/api/sites/guest-create/", "POST", {
    businessName: input.businessName,
    slug: input.slug,
    ownerToken: input.ownerToken,
    ownerContact: input.ownerContact,
    plan: input.plan,
    site: {
      title: input.site.title,
      description: input.site.description,
      templateKey: input.site.templateKey,
      status: input.site.status,
      theme: input.site.theme,
      blocks: input.site.blocks,
    },
  });

  return apiSite ? normalizeSite(apiSite) : null;
}

export async function listMySitesFromBackend(
  ownerToken: string,
  ownerContact = "",
  recoveryCode = "",
) {
  const params = new URLSearchParams();
  if (ownerToken) {
    params.set("ownerToken", ownerToken);
  }
  if (ownerContact) {
    params.set("ownerContact", ownerContact);
  }
  if (recoveryCode) {
    params.set("recoveryCode", recoveryCode);
  }
  const apiSites = await fetchJson<ApiSite[]>(`/api/sites/my-sites/?${params.toString()}`);

  return apiSites?.map(normalizeSite) ?? [];
}

export function buildBackendQrUrl(siteId: string, baseUrl: string) {
  return `/api/sites/${siteId}/qr/?baseUrl=${encodeURIComponent(baseUrl)}`;
}

export function buildBackendQrSvgUrl(siteId: string, baseUrl: string) {
  return `/api/sites/${siteId}/qr/?baseUrl=${encodeURIComponent(baseUrl)}&format=svg`;
}

export async function setSiteStatusInBackend(
  siteId: string,
  status: PublishedSite["status"],
) {
  const apiSite = await sendJson<ApiSite>(`/api/sites/${siteId}/`, "PATCH", {
    status,
  });

  return apiSite ? normalizeSite(apiSite) : null;
}

export async function duplicateSiteInBackend(siteId: string) {
  const apiSite = await sendJson<ApiSite>(
    `/api/sites/${siteId}/duplicate/`,
    "POST",
    {},
  );

  return apiSite ? normalizeSite(apiSite) : null;
}

export async function deleteSiteInBackend(siteId: string) {
  return sendEmpty(`/api/sites/${siteId}/`, "DELETE");
}

export async function checkSlugAvailableInBackend(slug: string) {
  const result = await fetchJson<{ slug: string; available: boolean }>(
    `/api/sites/slug-available/${slug}/`,
  );

  return result?.available ?? null;
}

export async function uploadMediaToBackend(file: File) {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 12000);
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/sites/upload-media/`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as { url: string };
    return result.url.startsWith("http") ? result.url : result.url;
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
