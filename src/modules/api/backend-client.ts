import { publishedSites, tenants } from "@/backend";
import type { PublishedSite } from "@/modules/sites/types";
import type { Tenant } from "@/modules/tenants/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.API_BASE_URL ??
  "http://127.0.0.1:8000";

const DEFAULT_THEME = {
  primaryColor: "#111827",
  backgroundColor: "#f8fafc",
  textColor: "#111827",
  surfaceColor: "#ffffff",
};

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
  title: string;
  description: string;
  templateKey?: PublishedSite["templateKey"];
  template_key?: PublishedSite["templateKey"];
  status: PublishedSite["status"];
  theme: PublishedSite["theme"];
  blocks: PublishedSite["blocks"];
  publishedAt?: string;
  published_at?: string;
};

async function fetchJson<T>(path: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 1600);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
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
    const response = await fetch(`${API_BASE_URL}${path}`, {
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
