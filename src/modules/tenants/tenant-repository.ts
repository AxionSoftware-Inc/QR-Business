import { domains, tenants } from "@/backend";
import {
  findTenantBySlugFromBackend,
  listTenantsFromBackend,
} from "@/modules/api/backend-client";

export function findTenantBySlug(slug: string) {
  return tenants.find((tenant) => tenant.slug === slug) ?? null;
}

export function findTenantByHostname(hostname: string) {
  const domain = domains.find(
    (item) => item.hostname === hostname && item.status === "verified",
  );

  if (!domain) {
    return null;
  }

  return tenants.find((tenant) => tenant.id === domain.tenantId) ?? null;
}

export function listTenants() {
  return tenants;
}

export async function listTenantsAsync() {
  return listTenantsFromBackend();
}

export async function findTenantBySlugAsync(slug: string) {
  return findTenantBySlugFromBackend(slug);
}
