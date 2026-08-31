import type { PublishedSite, SiteBlock, SiteTheme } from "@/modules/sites/types";

function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  }

  return process.env.API_BASE_URL ?? "http://127.0.0.1:8000";
}

type V2PublicSite = {
  site_id: string;
  tenant_id: string;
  tenant_slug: string;
  slug: string;
  name: string;
  title: string;
  description: string;
  template_key: string;
  theme: SiteTheme;
  blocks: SiteBlock[];
  seo?: Record<string, unknown>;
  version: number;
  published_at: string | null;
};

function normalizeTemplateKey(value: string): PublishedSite["templateKey"] {
  if (value === "plus" || value === "pro") {
    return value;
  }
  return "oddiy";
}

function isTheme(value: unknown): value is SiteTheme {
  if (!value || typeof value !== "object") return false;
  const theme = value as Partial<SiteTheme>;
  return Boolean(
    theme.primaryColor &&
      theme.backgroundColor &&
      theme.textColor &&
      theme.surfaceColor,
  );
}

const FALLBACK_THEME: SiteTheme = {
  primaryColor: "#111827",
  backgroundColor: "#f8fafc",
  textColor: "#111827",
  surfaceColor: "#ffffff",
};

function normalizePublicSite(site: V2PublicSite): PublishedSite {
  return {
    id: site.site_id,
    tenantId: site.tenant_id,
    tenantSlug: site.tenant_slug,
    title: site.title || site.name,
    description: site.description ?? "",
    templateKey: normalizeTemplateKey(site.template_key),
    status: "published",
    theme: isTheme(site.theme) ? site.theme : FALLBACK_THEME,
    blocks: Array.isArray(site.blocks) ? site.blocks : [],
    publishedAt: site.published_at ?? "",
  };
}

async function fetchV2Json<T>(path: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
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

export async function findPublishedSiteBySlugFromV2(slug: string) {
  const site = await fetchV2Json<V2PublicSite>(
    `/api/v2/public/sites/${encodeURIComponent(slug)}/`,
  );
  return site ? normalizePublicSite(site) : null;
}

export async function trackPublicCtaInV2(input: {
  siteId: string;
  target: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(
      `${getApiBaseUrl()}/api/v2/public/sites/${input.siteId}/events/`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: "cta_click",
          target: input.target,
          metadata: input.metadata ?? {},
        }),
        keepalive: true,
        signal: controller.signal,
      },
    );

    return response.ok;
  } catch {
    return false;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
