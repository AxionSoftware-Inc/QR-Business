import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { findPublishedSiteBySlugFromV2 } from "@/modules/api/v2-client";
import type { GalleryBlock, HeroBlock, PublishedSite } from "@/modules/sites/types";

type SitePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: SitePageProps): Promise<Metadata> {
  const { slug } = await params;
  const site = await findPublishedSiteBySlugFromV2(slug);
  if (!site || site.status !== "published") return { title: "QR site topilmadi" };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_BASE_URL ?? "http://127.0.0.1:3000";
  const canonical = `${baseUrl}/${site.tenantSlug}/${site.siteSlug}`;
  const title = `${site.title} | QR Business`;
  const description = buildSiteDescription(site);
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
    robots: { index: false, follow: true },
  };
}

export default async function SitePage({ params }: SitePageProps) {
  const { slug } = await params;
  const site = await findPublishedSiteBySlugFromV2(slug);
  if (!site || site.status !== "published") notFound();
  permanentRedirect(`/${encodeURIComponent(site.tenantSlug)}/${encodeURIComponent(site.siteSlug)}`);
}

function buildSiteDescription(site: PublishedSite) {
  const hero = site.blocks.find((block) => block.type === "hero") as HeroBlock | undefined;
  const description = hero?.data.description || site.description;
  return (description || `${site.title} uchun business profile va QR sahifa.`).slice(0, 160);
}

function buildOgImage(site: PublishedSite, baseUrl: string) {
  const hero = site.blocks.find((block) => block.type === "hero") as HeroBlock | undefined;
  const gallery = site.blocks.find((block) => block.type === "gallery") as GalleryBlock | undefined;
  const image = hero?.data.coverUrl || gallery?.data.images[0]?.url;
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${baseUrl}${image.startsWith("/") ? image : `/${image}`}`;
}
