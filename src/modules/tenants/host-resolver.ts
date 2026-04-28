import { findTenantByHostname, findTenantBySlug } from "./tenant-repository";
import type { ResolvedHost } from "./types";

const LOCALHOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function normalizeHost(host: string) {
  return host.toLowerCase().replace(/^www\./, "").split(":")[0] ?? host;
}

export function resolveHost(hostHeader: string, rootDomain: string): ResolvedHost {
  const host = normalizeHost(hostHeader);
  const root = normalizeHost(rootDomain);

  if (LOCALHOSTS.has(host) || host === root) {
    return { kind: "platform", host };
  }

  const customDomainTenant = findTenantByHostname(host);

  if (customDomainTenant) {
    return {
      kind: "tenant",
      host,
      tenant: customDomainTenant,
      source: "custom-domain",
    };
  }

  if (host.endsWith(`.${root}`)) {
    const slug = host.slice(0, -(root.length + 1));
    const tenant = findTenantBySlug(slug);

    if (tenant) {
      return { kind: "tenant", host, tenant, source: "subdomain" };
    }
  }

  return {
    kind: "not-found",
    host,
    reason: `No tenant found for host ${host}`,
  };
}

