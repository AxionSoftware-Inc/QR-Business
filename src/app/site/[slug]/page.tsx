import { notFound } from "next/navigation";
import { PublicSiteRenderer } from "@/modules/sites/public-site-renderer";
import { findPublishedSiteBySlugAsync } from "@/modules/sites/site-repository";

type SitePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function SitePage({ params }: SitePageProps) {
  const { slug } = await params;
  const site = await findPublishedSiteBySlugAsync(slug);

  if (!site || site.status !== "published") {
    notFound();
  }

  return <PublicSiteRenderer site={site} />;
}
