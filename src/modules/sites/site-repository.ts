import { publishedSites } from "@/backend";
import {
  findPublishedSiteBySlugFromBackend,
  listSitesFromBackend,
} from "@/modules/api/backend-client";
import { findPublishedSiteBySlugFromV2 } from "@/modules/api/v2-client";

export function findPublishedSiteByTenantId(tenantId: string) {
  return (
    publishedSites.find(
      (site) => site.tenantId === tenantId && site.status === "published",
    ) ?? null
  );
}

export function listPublishedSites() {
  return publishedSites;
}

export async function listPublishedSitesAsync() {
  // Admin/list cutover stays on legacy until the authenticated V2 dashboard
  // client lands. Public page reads are already V2-first below.
  return listSitesFromBackend();
}

export async function findPublishedSiteBySlugAsync(slug: string) {
  const v2Site = await findPublishedSiteBySlugFromV2(slug);
  if (v2Site) {
    return v2Site;
  }

  // Controlled migration fallback: remove this after legacy data has been
  // migrated and public URL parity has been verified.
  return findPublishedSiteBySlugFromBackend(slug);
}
