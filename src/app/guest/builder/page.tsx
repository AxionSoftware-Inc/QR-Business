import { type GuestPlan } from "@/modules/guest/guest-site-factory";
import { V2Builder } from "./v2-builder";

type GuestBuilderPageProps = {
  searchParams: Promise<{
    plan?: string;
    site?: string;
    tenant?: string;
  }>;
};

function resolvePlan(plan?: string): GuestPlan {
  if (plan === "oddiy" || plan === "plus" || plan === "pro") return plan;
  return "plus";
}

export default async function GuestBuilderPage({ searchParams }: GuestBuilderPageProps) {
  const { plan, site, tenant } = await searchParams;
  return <V2Builder initialPlan={resolvePlan(plan)} siteId={site} tenantId={tenant} />;
}
