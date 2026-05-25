import { publishedSites } from "@/backend";
import {
  findPublishedSiteBySlugFromBackend,
  listSitesFromBackend,
} from "@/modules/api/backend-client";

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
  return listSitesFromBackend();
}

export async function findPublishedSiteBySlugAsync(slug: string) {
  return findPublishedSiteBySlugFromBackend(slug);
}
