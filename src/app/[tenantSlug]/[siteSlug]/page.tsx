import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findPublishedSiteByTenantAndSiteFromV2 } from "@/modules/api/v2-client";
import { PublicSiteRenderer } from "@/modules/sites/public-site-renderer";
import type { GalleryBlock, HeroBlock, PublishedSite } from "@/modules/sites/types";

type PublicSitePageProps = {
  params: Promise<{ tenantSlug: string; siteSlug: string }>;
};

export async function generateMetadata({ params }: PublicSitePageProps): Promise<Metadata> {
  const { tenantSlug, siteSlug } = await params;
  const site = await findPublishedSiteByTenantAndSiteFromV2(tenantSlug, siteSlug);
  if (!site) return { title: "QR site topilmadi" };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_BASE_URL ?? "http://127.0.0.1:3000";
  const canonical = `${baseUrl}/${tenantSlug}/${siteSlug}`;
  const title = `${site.title} | QR Business`;
  const description = buildDescription(site);
  const image = buildOgImage(site, baseUrl);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "QR Business",
      type: "website",
      images: image ? [{ url: image, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function PublicSitePage({ params }: PublicSitePageProps) {
  const { tenantSlug, siteSlug } = await params;
  const site = await findPublishedSiteByTenantAndSiteFromV2(tenantSlug, siteSlug);
  if (!site) notFound();
  return <PublicSiteRenderer site={site} />;
}

function buildDescription(site: PublishedSite) {
  const hero = site.blocks.find((block) => block.type === "hero") as HeroBlock | undefined;
  return (hero?.data.description || site.description || site.title).slice(0, 160);
}

function buildOgImage(site: PublishedSite, baseUrl: string) {
  const hero = site.blocks.find((block) => block.type === "hero") as HeroBlock | undefined;
  const gallery = site.blocks.find((block) => block.type === "gallery") as GalleryBlock | undefined;
  const image = hero?.data.coverUrl || gallery?.data.images[0]?.url;
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${baseUrl}${image.startsWith("/") ? image : `/${image}`}`;
}
