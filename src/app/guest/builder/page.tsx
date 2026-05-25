import { GuestBuilder } from "./guest-builder";
import { type GuestPlan } from "@/modules/guest/guest-site-factory";
import { findPublishedSiteBySlugAsync } from "@/modules/sites/site-repository";

type GuestBuilderPageProps = {
  searchParams: Promise<{
    edit?: string;
    plan?: string;
  }>;
};

function resolvePlan(plan?: string): GuestPlan {
  if (plan === "oddiy" || plan === "plus" || plan === "pro") {
    return plan;
  }

  return "plus";
}

export default async function GuestBuilderPage({
  searchParams,
}: GuestBuilderPageProps) {
  const { edit, plan } = await searchParams;
  const editingSite = edit ? await findPublishedSiteBySlugAsync(edit) : null;

  return (
    <GuestBuilder
      editingSite={editingSite}
      initialPlan={editingSite?.templateKey ?? resolvePlan(plan)}
    />
  );
}
