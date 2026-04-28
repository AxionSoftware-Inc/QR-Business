export type TenantStatus = "draft" | "active" | "blocked" | "archived";

export type TenantPlan = "oddiy" | "plus" | "pro";

export type Tenant = {
  id: string;
  ownerId: string | null;
  name: string;
  slug: string;
  status: TenantStatus;
  plan: TenantPlan;
  createdAt: string;
  updatedAt: string;
};

export type TenantDomain = {
  id: string;
  tenantId: string;
  hostname: string;
  type: "subdomain" | "custom";
  status: "pending" | "verified" | "blocked";
  verifiedAt: string | null;
};

export type ResolvedHost =
  | { kind: "platform"; host: string }
  | {
      kind: "tenant";
      host: string;
      tenant: Tenant;
      source: "subdomain" | "custom-domain" | "path-preview";
    }
  | { kind: "not-found"; host: string; reason: string };
