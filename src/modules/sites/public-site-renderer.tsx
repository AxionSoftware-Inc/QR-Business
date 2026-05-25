/* eslint-disable @next/next/no-img-element */
import type React from "react";
import { PrintButton } from "@/shared/ui/print-button";
import { SiteViewTracker, TrackedLink } from "@/shared/ui/site-analytics";
import type {
  ContactButtonsBlock,
  FaqBlock,
  GalleryBlock,
  HeroBlock,
  HighlightsBlock,
  LocationBlock,
  PublishedSite,
  PromoBlock,
  ProcessBlock,
  ServicesBlock,
  SiteBlock,
  TestimonialsBlock,
  WorkingHoursBlock,
} from "./types";

type PublicSiteRendererProps = {
  site: PublishedSite;
};

export function PublicSiteRenderer({ site }: PublicSiteRendererProps) {
  if (site.templateKey === "pro") {
    return <ProSiteRenderer site={site} />;
  }

  const enabledBlocks = site.blocks.filter((block) => block.enabled);
  const hero = enabledBlocks.find((block) => block.type === "hero") as
    | HeroBlock
    | undefined;
  const contacts = enabledBlocks.find(
    (block) => block.type === "contact_buttons",
  ) as ContactButtonsBlock | undefined;
  const contentBlocks = enabledBlocks.filter(
    (block) => block.type !== "hero" && block.type !== "contact_buttons",
  );

  return (
    <main
      className="min-h-screen overflow-x-hidden text-[var(--site-text)]"
      data-template={site.templateKey}
      style={
        {
          "--site-primary": site.theme.primaryColor,
          "--site-background": site.theme.backgroundColor,
          "--site-text": site.theme.textColor,
          "--site-surface": site.theme.surfaceColor,
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--site-primary) 9%, var(--site-background)), var(--site-background) 34%)",
        } as React.CSSProperties
      }
    >
      <div className="mx-auto grid min-h-screen w-full max-w-5xl gap-5 px-4 py-4 sm:px-6 sm:py-7 lg:grid-cols-[360px_1fr] lg:items-start lg:gap-6">
        <SiteViewTracker siteId={site.id} />
        <aside className="min-w-0 lg:sticky lg:top-7">
          {hero ? <Hero block={hero} packageName={site.templateKey} /> : null}
          {contacts ? <ContactButtons block={contacts} siteId={site.id} /> : null}
        </aside>

        <section className="flex min-w-0 flex-col gap-4">
          {contentBlocks.map((block) => (
            <BlockRenderer block={block} key={block.id} />
          ))}
          <PublicQrPanel site={site} />
          <footer className="pb-5 pt-2 text-center text-xs font-medium text-black/40 lg:text-left">
            qr.dirac.space orqali tayyorlandi
          </footer>
        </section>
      </div>
    </main>
  );
}

function ProSiteRenderer({ site }: PublicSiteRendererProps) {
  const enabledBlocks = site.blocks.filter((block) => block.enabled);
  const hero = enabledBlocks.find((block) => block.type === "hero") as
    | HeroBlock
    | undefined;
  const contacts = enabledBlocks.find(
    (block) => block.type === "contact_buttons",
  ) as ContactButtonsBlock | undefined;
  const highlights = enabledBlocks.find((block) => block.type === "highlights") as
    | HighlightsBlock
    | undefined;
  const services = enabledBlocks.find((block) => block.type === "services") as
    | ServicesBlock
    | undefined;
  const process = enabledBlocks.find((block) => block.type === "process") as
    | ProcessBlock
    | undefined;
  const promo = enabledBlocks.find((block) => block.type === "promo") as
    | PromoBlock
    | undefined;
  const gallery = enabledBlocks.find((block) => block.type === "gallery") as
    | GalleryBlock
    | undefined;
  const testimonials = enabledBlocks.find(
    (block) => block.type === "testimonials",
  ) as TestimonialsBlock | undefined;
  const faq = enabledBlocks.find((block) => block.type === "faq") as
    | FaqBlock
    | undefined;
  const location = enabledBlocks.find((block) => block.type === "location") as
    | LocationBlock
    | undefined;

  return (
    <main
      className="min-h-screen overflow-x-hidden bg-[var(--site-background)] text-[var(--site-text)]"
      data-template="pro"
      style={
        {
          "--site-primary": site.theme.primaryColor,
          "--site-accent": site.theme.accentColor ?? site.theme.primaryColor,
          "--site-background": site.theme.backgroundColor,
          "--site-text": site.theme.textColor,
          "--site-surface": site.theme.surfaceColor,
        } as React.CSSProperties
      }
    >
      <SiteViewTracker siteId={site.id} />
      {hero ? <ProHero block={hero} contacts={contacts} /> : null}

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-7 lg:gap-7">
        {highlights ? <ProHighlights block={highlights} /> : null}

        <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
          <div className="flex min-w-0 flex-col gap-5">
            {services ? <ProServices block={services} /> : null}
            {process ? <ProProcess block={process} /> : null}
          </div>
          <div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-7">
            {promo ? <ProBooking block={promo} contacts={contacts} siteId={site.id} /> : null}
            {location ? <ProLocation block={location} /> : null}
          </div>
        </div>

        {gallery ? <ProGallery block={gallery} /> : null}

        <div className="grid gap-5 lg:grid-cols-2">
          {testimonials ? <ProTestimonials block={testimonials} /> : null}
          {faq ? <ProFaq block={faq} /> : null}
        </div>

        <PublicQrPanel site={site} variant="pro" />

        <footer className="pb-5 pt-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-black/35">
          Pro QR site by qr.dirac.space
        </footer>
      </div>
    </main>
  );
}

function PublicQrPanel({
  site,
  variant = "default",
}: {
  site: PublishedSite;
  variant?: "default" | "pro";
}) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_BASE_URL ?? "http://127.0.0.1:3000";
  const publicUrl = `${baseUrl}/${site.tenantSlug ?? ""}`;
  const qrUrl = `/api/qr?url=${encodeURIComponent(publicUrl)}`;
  const qrSvgUrl = `${qrUrl}&format=svg`;
  const qrPdfUrl = `/api/qr-sheet?url=${encodeURIComponent(publicUrl)}&title=${encodeURIComponent(site.title)}`;
  const fileName = `${(site.tenantSlug ?? site.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "qr-site"}.png`;
  const svgFileName = fileName.replace(/\.png$/, ".svg");

  if (variant === "pro") {
    return (
      <section className="rounded-sm bg-[var(--site-primary)] p-5 text-white shadow-sm sm:p-7">
        <div className="grid gap-5 sm:grid-cols-[220px_1fr] sm:items-center">
          <div className="mx-auto w-full max-w-56 rounded-sm bg-white p-3 shadow-sm">
            <img
              alt={`${site.title} QR code`}
              className="aspect-square w-full rounded-sm"
              src={qrUrl}
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--site-accent)]">
              QR code
            </p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight">
              Sahifani QR orqali ulashing
            </h2>
            <p className="mt-3 break-all text-sm leading-6 text-white/64">
              {publicUrl}
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <a
                className="flex min-h-11 w-full items-center justify-center rounded-sm bg-[var(--site-accent)] px-4 text-sm font-semibold text-[var(--site-primary)] sm:w-fit"
                download={fileName}
                href={qrUrl}
              >
                PNG
              </a>
              <a
                className="flex min-h-11 w-full items-center justify-center rounded-sm border border-white/25 px-4 text-sm font-semibold text-white sm:w-fit"
                download={svgFileName}
                href={qrSvgUrl}
              >
                SVG
              </a>
              <PrintButton
                className="min-h-11 rounded-sm border border-white/25 px-4 text-sm font-semibold text-white"
              />
              <a
                className="flex min-h-11 w-full items-center justify-center rounded-sm border border-white/25 px-4 text-sm font-semibold text-white sm:w-fit"
                download={fileName.replace(/\.png$/, "-stickers.pdf")}
                href={qrPdfUrl}
              >
                PDF
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-lg bg-[var(--site-surface)] p-4 shadow-sm ring-1 ring-black/6 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
        <div className="mx-auto w-full max-w-48 rounded-lg bg-white p-3 shadow-sm ring-1 ring-black/10">
          <img
            alt={`${site.title} QR code`}
            className="aspect-square w-full rounded-md"
            src={qrUrl}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--site-primary)]">
            QR kod
          </p>
          <h2 className="mt-2 text-xl font-semibold leading-tight">
            Bu sahifani tez ulashish
          </h2>
          <p className="mt-2 break-all text-sm leading-6 text-black/55">
            {publicUrl}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <a
              className="flex min-h-11 w-full items-center justify-center rounded-md bg-[var(--site-primary)] px-4 text-sm font-semibold text-white sm:w-fit"
              download={fileName}
              href={qrUrl}
            >
              PNG
            </a>
            <a
              className="flex min-h-11 w-full items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-[var(--site-primary)] ring-1 ring-black/10 sm:w-fit"
              download={svgFileName}
              href={qrSvgUrl}
            >
              SVG
            </a>
            <PrintButton
              className="min-h-11 rounded-md bg-black/[.04] px-4 text-sm font-semibold text-[var(--site-text)] ring-1 ring-black/8"
            />
            <a
              className="flex min-h-11 w-full items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-[var(--site-primary)] ring-1 ring-black/10 sm:w-fit"
              download={fileName.replace(/\.png$/, "-stickers.pdf")}
              href={qrPdfUrl}
            >
              PDF
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function BlockRenderer({ block }: { block: SiteBlock }) {
  switch (block.type) {
    case "faq":
      return <ProFaq block={block} />;
    case "gallery":
      return <Gallery block={block} />;
    case "location":
      return <Location block={block} />;
    case "highlights":
      return <Highlights block={block} />;
    case "promo":
      return <Promo block={block} />;
    case "process":
      return <ProProcess block={block} />;
    case "services":
      return <Services block={block} />;
    case "testimonials":
      return <Testimonials block={block} />;
    case "working_hours":
      return <WorkingHours block={block} />;
    default:
      return null;
  }
}

function ProHero({
  block,
  contacts,
}: {
  block: HeroBlock;
  contacts?: ContactButtonsBlock;
}) {
  const initials = block.data.businessName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  const phone = contacts?.data.phone;
  const telegram = contacts?.data.telegram;

  return (
    <section className="relative overflow-hidden bg-[var(--site-primary)] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(176,141,87,.34),transparent_24%),radial-gradient(circle_at_82%_72%,rgba(255,255,255,.12),transparent_26%),linear-gradient(135deg,#111827,#2b2118_58%,#111827)]" />
      {block.data.coverUrl ? (
        <img
          alt={block.data.businessName}
          className="absolute inset-0 size-full object-cover opacity-58"
          src={block.data.coverUrl}
        />
      ) : null}
      <div className="absolute right-[-12rem] top-20 h-[34rem] w-[34rem] rotate-12 border border-[var(--site-accent)]/28" />
      <div className="absolute bottom-24 right-12 hidden h-80 w-56 border border-white/12 bg-white/6 backdrop-blur-sm lg:block" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,24,39,.94),rgba(17,24,39,.72),rgba(17,24,39,.32))]" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[var(--site-background)] to-transparent" />

      <div className="relative mx-auto flex min-h-[680px] w-full max-w-6xl flex-col gap-10 px-4 py-5 sm:px-6 sm:py-7 lg:min-h-[760px] lg:justify-between">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-sm border border-white/25 bg-white/10 text-sm font-semibold text-[var(--site-accent)] backdrop-blur">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold">{block.data.businessName}</p>
              <p className="text-xs text-white/55">{block.data.category}</p>
            </div>
          </div>
          <span className="rounded-full border border-[var(--site-accent)]/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--site-accent)]">
            Pro
          </span>
        </header>

        <div className="grid min-w-0 gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div className="min-w-0 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--site-accent)]">
              {block.data.category}
            </p>
            <h1 className="mt-4 max-w-full [overflow-wrap:anywhere] text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              {block.data.businessName}
            </h1>
            <p className="mt-6 max-w-2xl [overflow-wrap:anywhere] text-base leading-8 text-white/76 sm:text-lg">
              {block.data.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {telegram ? (
                <a
                  className="flex min-h-12 items-center justify-center rounded-sm bg-[var(--site-accent)] px-5 text-sm font-semibold text-[var(--site-primary)]"
                  href={telegram}
                  rel="noreferrer"
                  target="_blank"
                >
                  Private fitting band qilish
                </a>
              ) : null}
              {phone ? (
                <a
                  className="flex min-h-12 items-center justify-center rounded-sm border border-white/25 px-5 text-sm font-semibold text-white"
                  href={`tel:${phone.replace(/\s/g, "")}`}
                >
                  {phone}
                </a>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 rounded-sm border border-white/12 bg-white/10 p-5 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
              Premium experience
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-semibold text-[var(--site-accent)]">
                  1:1
                </p>
                <p className="mt-1 text-xs text-white/58">Fitting</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-[var(--site-accent)]">
                  21
                </p>
                <p className="mt-1 text-xs text-white/58">Kungacha</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-[var(--site-accent)]">
                  QR
                </p>
                <p className="mt-1 text-xs text-white/58">Booking</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProPanel({
  children,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className="min-w-0 rounded-sm bg-[var(--site-surface)] p-5 shadow-sm ring-1 ring-black/7 sm:p-7">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--site-accent)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 [overflow-wrap:anywhere] text-2xl font-semibold leading-tight sm:text-3xl">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ProHighlights({ block }: { block: HighlightsBlock }) {
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {block.data.items.map((item) => (
        <div
          className="rounded-sm bg-[var(--site-primary)] p-5 text-white shadow-sm"
          key={item.id}
        >
          <p className="text-4xl font-semibold text-[var(--site-accent)]">
            {item.value}
          </p>
          <p className="mt-2 text-sm text-white/62">{item.label}</p>
        </div>
      ))}
    </section>
  );
}

function ProServices({ block }: { block: ServicesBlock }) {
  return (
    <ProPanel eyebrow="Signature services" title={block.data.title}>
      <div className="divide-y divide-black/8">
        {block.data.items.map((item) => (
          <article className="grid min-w-0 gap-3 py-5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto]" key={item.id}>
            <div className="min-w-0">
              <h3 className="[overflow-wrap:anywhere] text-xl font-semibold">{item.name}</h3>
              {item.description ? (
                <p className="mt-2 max-w-xl [overflow-wrap:anywhere] text-sm leading-6 text-black/58">
                  {item.description}
                </p>
              ) : null}
            </div>
            {item.price ? (
              <p className="h-fit max-w-full break-words rounded-full bg-[var(--site-accent)]/18 px-3 py-1 text-sm font-semibold text-[var(--site-primary)] sm:max-w-44 sm:text-right">
                {item.price}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </ProPanel>
  );
}

function ProProcess({ block }: { block: ProcessBlock }) {
  return (
    <ProPanel eyebrow="How it works" title={block.data.title}>
      <div className="grid gap-3 sm:grid-cols-2">
        {block.data.items.map((item) => (
          <article
            className="rounded-sm border border-black/8 bg-white/55 p-4"
            key={item.id}
          >
            <p className="text-sm font-semibold text-[var(--site-accent)]">
              {item.step}
            </p>
            <h3 className="mt-3 [overflow-wrap:anywhere] text-lg font-semibold">{item.title}</h3>
            <p className="mt-2 [overflow-wrap:anywhere] text-sm leading-6 text-black/58">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </ProPanel>
  );
}

function ProBooking({
  block,
  contacts,
  siteId,
}: {
  block: PromoBlock;
  contacts?: ContactButtonsBlock;
  siteId: string;
}) {
  const links = [
    contacts?.data.telegram
      ? { label: "Telegram", href: contacts.data.telegram }
      : null,
    contacts?.data.whatsapp
      ? { label: "WhatsApp", href: contacts.data.whatsapp }
      : null,
    contacts?.data.instagram
      ? { label: "Instagram", href: contacts.data.instagram }
      : null,
  ].filter((item): item is { label: string; href: string } => Boolean(item));

  return (
    <section className="rounded-sm bg-[var(--site-primary)] p-5 text-white shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--site-accent)]">
        Booking
      </p>
      <h2 className="mt-3 [overflow-wrap:anywhere] text-2xl font-semibold leading-tight sm:text-3xl">
        {block.data.title}
      </h2>
      <p className="mt-3 [overflow-wrap:anywhere] text-sm leading-6 text-white/66">
        {block.data.description}
      </p>
      <div className="mt-5 grid gap-2">
        {links.map((link) => (
          <TrackedLink
            className="flex min-h-12 min-w-0 flex-wrap items-center justify-between gap-2 rounded-sm bg-white px-4 text-sm font-semibold text-[var(--site-primary)]"
            href={link.href}
            key={link.label}
            rel="noreferrer"
            siteId={siteId}
            target="_blank"
            targetName={link.label.toLowerCase()}
          >
            {link.label}
            <span className="shrink-0 text-[var(--site-accent)]">Yozilish</span>
          </TrackedLink>
        ))}
      </div>
    </section>
  );
}

function ProGallery({ block }: { block: GalleryBlock }) {
  return (
    <ProPanel eyebrow="Portfolio" title={block.data.title}>
      <div className="grid gap-3 sm:grid-cols-3">
        {block.data.images.map((image, index) => (
          <img
            alt={image.alt}
            className={
              index === 0
                ? "h-72 w-full rounded-sm object-cover sm:col-span-2"
                : "h-72 w-full rounded-sm object-cover"
            }
            key={image.id}
            src={image.url}
          />
        ))}
      </div>
    </ProPanel>
  );
}

function ProTestimonials({ block }: { block: TestimonialsBlock }) {
  return (
    <ProPanel eyebrow="Trust" title={block.data.title}>
      <div className="space-y-3">
        {block.data.items.map((item) => (
          <article className="rounded-sm bg-white/55 p-4 ring-1 ring-black/7" key={item.id}>
            <p className="[overflow-wrap:anywhere] text-sm leading-6 text-black/62">&quot;{item.text}&quot;</p>
            <p className="mt-3 [overflow-wrap:anywhere] text-sm font-semibold text-[var(--site-primary)]">
              {item.name}
            </p>
          </article>
        ))}
      </div>
    </ProPanel>
  );
}

function ProFaq({ block }: { block: FaqBlock }) {
  return (
    <ProPanel eyebrow="Details" title={block.data.title}>
      <div className="divide-y divide-black/8">
        {block.data.items.map((item) => (
          <article className="py-4 first:pt-0 last:pb-0" key={item.id}>
            <h3 className="[overflow-wrap:anywhere] font-semibold">{item.question}</h3>
            <p className="mt-2 [overflow-wrap:anywhere] text-sm leading-6 text-black/58">{item.answer}</p>
          </article>
        ))}
      </div>
    </ProPanel>
  );
}

function ProLocation({ block }: { block: LocationBlock }) {
  return (
    <section className="rounded-sm bg-[var(--site-surface)] p-5 shadow-sm ring-1 ring-black/7 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--site-accent)]">
        Location
      </p>
      <h2 className="mt-2 [overflow-wrap:anywhere] text-2xl font-semibold">{block.data.title}</h2>
      <p className="mt-3 [overflow-wrap:anywhere] text-sm leading-6 text-black/58">{block.data.address}</p>
      {block.data.mapUrl ? (
        <a
          className="mt-5 flex min-h-11 items-center justify-center rounded-sm bg-[var(--site-accent)] px-4 text-sm font-semibold text-[var(--site-primary)]"
          href={block.data.mapUrl}
          rel="noreferrer"
          target="_blank"
        >
          Xaritada ochish
        </a>
      ) : null}
    </section>
  );
}

function Panel({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <section className="min-w-0 rounded-lg bg-[var(--site-surface)] p-4 shadow-sm ring-1 ring-black/6 sm:p-5">
      {title ? (
        <h2 className="mb-4 text-base font-semibold tracking-normal sm:text-lg">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

function Hero({
  block,
  packageName,
}: {
  block: HeroBlock;
  packageName: "oddiy" | "plus" | "pro";
}) {
  const initials = block.data.businessName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <section className="min-w-0 overflow-hidden rounded-lg bg-[var(--site-surface)] shadow-sm ring-1 ring-black/6">
      {block.data.coverUrl ? (
        <div className="relative h-44 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.32),transparent_28%),linear-gradient(135deg,var(--site-primary),color-mix(in_srgb,var(--site-primary)_72%,#111827))] sm:h-52">
          <img
            alt={block.data.businessName}
            className="size-full object-cover opacity-70 mix-blend-luminosity"
            src={block.data.coverUrl}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/8 to-transparent" />
        </div>
      ) : null}
      <div className="bg-[var(--site-primary)] p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-white text-xl font-semibold text-[var(--site-primary)] shadow-sm">
            {initials}
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/85">
            {packageName === "oddiy"
              ? "Oddiy"
              : packageName === "plus"
                ? "Plus"
                : "Pro"}
          </span>
        </div>

        <p className="mt-7 text-sm font-medium text-white/78">
          {block.data.category}
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
          {block.data.businessName}
        </h1>
        <p className="mt-4 text-base leading-7 text-white/84">
          {block.data.description}
        </p>
      </div>

      <div className="grid grid-cols-3 divide-x divide-black/6 text-center">
        <div className="px-2 py-3">
          <p className="text-xs text-black/45">Format</p>
          <p className="mt-1 text-sm font-semibold">QR karta</p>
        </div>
        <div className="px-2 py-3">
          <p className="text-xs text-black/45">Sahifa</p>
          <p className="mt-1 text-sm font-semibold">1 bet</p>
        </div>
        <div className="px-2 py-3">
          <p className="text-xs text-black/45">Aloqa</p>
          <p className="mt-1 text-sm font-semibold">Tezkor</p>
        </div>
      </div>
    </section>
  );
}

function ContactButtons({
  block,
  siteId,
}: {
  block: ContactButtonsBlock;
  siteId: string;
}) {
  const actions = [
    block.data.phone
      ? {
          icon: "P",
          label: "Qo'ng'iroq",
          value: block.data.phone,
          href: `tel:${block.data.phone.replace(/\s/g, "")}`,
          primary: true,
        }
      : null,
    block.data.telegram
      ? {
          icon: "T",
          label: "Telegram",
          value: "Xabar yozish",
          href: block.data.telegram,
          primary: false,
        }
      : null,
    block.data.instagram
      ? {
          icon: "I",
          label: "Instagram",
          value: "Sahifani ko'rish",
          href: block.data.instagram,
          primary: false,
        }
      : null,
    block.data.whatsapp
      ? {
          icon: "W",
          label: "WhatsApp",
          value: "Xabar yozish",
          href: block.data.whatsapp,
          primary: false,
        }
      : null,
    block.data.website
      ? {
          icon: "S",
          label: "Website",
          value: "Ochish",
          href: block.data.website,
          primary: false,
        }
      : null,
  ].filter(
    (
      item,
    ): item is {
      label: string;
      icon: string;
      value: string;
      href: string;
      primary: boolean;
    } => Boolean(item),
  );

  return (
    <section className="mt-4 rounded-lg bg-[var(--site-surface)] p-3 shadow-sm ring-1 ring-black/6">
      <div className="grid gap-2">
        {actions.map((action) => (
          <TrackedLink
            className={
              action.primary
                ? "flex min-h-14 min-w-0 flex-col justify-center gap-1 rounded-md bg-[var(--site-primary)] px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                : "flex min-h-14 min-w-0 flex-col justify-center gap-1 rounded-md bg-black/[.035] px-4 py-3 text-[var(--site-text)] sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            }
            href={action.href}
            key={action.label}
            rel="noreferrer"
            siteId={siteId}
            targetName={action.label.toLowerCase()}
            target={action.href.startsWith("http") ? "_blank" : undefined}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                className={
                  action.primary
                    ? "flex size-8 shrink-0 items-center justify-center rounded-md bg-white/16 text-xs font-semibold text-white"
                    : "flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-[var(--site-primary)] shadow-sm"
                }
              >
                {action.icon}
              </span>
              <span className="shrink-0 text-sm font-semibold">
                {action.label}
              </span>
            </span>
            <span
              className={
                action.primary
                  ? "min-w-0 break-words text-sm text-white/78 sm:text-right"
                  : "min-w-0 break-words text-sm text-black/50 sm:text-right"
              }
            >
              {action.value}
            </span>
          </TrackedLink>
        ))}
      </div>
    </section>
  );
}

function Services({ block }: { block: ServicesBlock }) {
  return (
    <Panel title={block.data.title}>
      <div className="grid gap-3 sm:grid-cols-2">
        {block.data.items.map((item) => (
          <article
            className="rounded-md bg-black/[.025] p-4 ring-1 ring-black/5"
            key={item.id}
          >
            <div className="flex min-h-12 items-start justify-between gap-3">
              <h3 className="min-w-0 font-semibold leading-6">{item.name}</h3>
              {item.price ? (
                <p className="max-w-[46%] shrink-0 truncate rounded-full bg-[var(--site-primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--site-primary)]">
                  {item.price}
                </p>
              ) : null}
            </div>
            {item.description ? (
              <p className="mt-3 text-sm leading-6 text-black/58">
                {item.description}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </Panel>
  );
}

function Highlights({ block }: { block: HighlightsBlock }) {
  return (
    <Panel title={block.data.title}>
      <div className="grid gap-3 sm:grid-cols-3">
        {block.data.items.map((item) => (
          <div
            className="rounded-md bg-[var(--site-primary)] px-4 py-4 text-white"
            key={item.id}
          >
            <p className="text-2xl font-semibold leading-none">{item.value}</p>
            <p className="mt-2 text-sm text-white/78">{item.label}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Promo({ block }: { block: PromoBlock }) {
  return (
    <section className="overflow-hidden rounded-lg bg-[var(--site-primary)] p-5 text-white shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
        Maxsus taklif
      </p>
      <h2 className="mt-3 text-2xl font-semibold leading-tight">
        {block.data.title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-white/78">
        {block.data.description}
      </p>
      {block.data.actionLabel && block.data.actionUrl ? (
        <a
          className="mt-5 flex min-h-11 w-full items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-[var(--site-primary)] sm:w-fit"
          href={block.data.actionUrl}
          rel="noreferrer"
          target="_blank"
        >
          {block.data.actionLabel}
        </a>
      ) : null}
    </section>
  );
}

function Gallery({ block }: { block: GalleryBlock }) {
  return (
    <Panel title={block.data.title}>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {block.data.images.map((image) => (
          <img
            alt={image.alt}
            className="aspect-square rounded-md object-cover"
            key={image.id}
            src={image.url}
          />
        ))}
      </div>
    </Panel>
  );
}

function Testimonials({ block }: { block: TestimonialsBlock }) {
  return (
    <Panel title={block.data.title}>
      <div className="grid gap-3 sm:grid-cols-2">
        {block.data.items.map((item) => (
          <article
            className="rounded-md bg-black/[.025] p-4 ring-1 ring-black/5"
            key={item.id}
          >
            <p className="text-sm leading-6 text-black/62">&quot;{item.text}&quot;</p>
            <p className="mt-3 text-sm font-semibold text-[var(--site-primary)]">
              {item.name}
            </p>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function Location({ block }: { block: LocationBlock }) {
  return (
    <Panel title={block.data.title}>
      <div className="rounded-md bg-black/[.025] p-4 ring-1 ring-black/5">
        <p className="text-sm leading-6 text-black/62">{block.data.address}</p>
        {block.data.mapUrl ? (
          <a
            className="mt-4 flex min-h-11 items-center justify-center rounded-md bg-[var(--site-primary)] px-3 text-sm font-semibold text-white"
            href={block.data.mapUrl}
            rel="noreferrer"
            target="_blank"
          >
            Xaritada ochish
          </a>
        ) : null}
      </div>
    </Panel>
  );
}

function WorkingHours({ block }: { block: WorkingHoursBlock }) {
  return (
    <Panel title={block.data.title}>
      <div className="divide-y divide-black/7 rounded-md bg-black/[.025] ring-1 ring-black/5">
        {block.data.rows.map((row) => (
          <div
            className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            key={row.day}
          >
            <span className="text-black/55">{row.day}</span>
            <span className="text-right font-semibold">{row.value}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
