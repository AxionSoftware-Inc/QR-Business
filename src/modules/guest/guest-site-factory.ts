import type { PublishedSite } from "@/modules/sites/types";

export type GuestPlan = "oddiy" | "plus" | "pro";

export type GuestDraft = {
  plan: GuestPlan;
  businessName: string;
  slug: string;
  category: string;
  description: string;
  phone: string;
  telegram: string;
  instagram: string;
  whatsapp: string;
  website: string;
  address: string;
  mapUrl: string;
  coverUrl: string;
  primaryColor: string;
  accentColor: string;
  servicesTitle: string;
  services: Array<{ id: string; name: string; description: string; price: string }>;
  galleryTitle: string;
  galleryImages: Array<{ id: string; url: string; alt: string }>;
  testimonialsTitle: string;
  testimonials: Array<{ id: string; name: string; text: string }>;
  highlightsTitle: string;
  highlights: Array<{ id: string; label: string; value: string }>;
  processTitle: string;
  process: Array<{ id: string; step: string; title: string; description: string }>;
  promoTitle: string;
  promoDescription: string;
  promoActionLabel: string;
  promoActionUrl: string;
  faqTitle: string;
  faq: Array<{ id: string; question: string; answer: string }>;
  hoursTitle: string;
  hours: Array<{ day: string; value: string }>;
  locationTitle: string;
  enabled: {
    contacts: boolean;
    highlights: boolean;
    services: boolean;
    process: boolean;
    promo: boolean;
    gallery: boolean;
    testimonials: boolean;
    faq: boolean;
    hours: boolean;
    location: boolean;
  };
};

export const guestPlanDetails: Record<GuestPlan, { badge: string; description: string; priceHint: string }> = {
  oddiy: { badge: "Tez start", description: "Telefon, ijtimoiy tarmoqlar, xizmatlar va manzil.", priceHint: "Oddiy" },
  plus: { badge: "Ko'proq ishonch", description: "Cover rasm, highlights, portfolio, fikrlar va booking.", priceHint: "Plus" },
  pro: { badge: "Premium sotuv", description: "Katta hero, jarayon, premium bloklar, FAQ va kuchli CTA.", priceHint: "Pro" },
};

export const defaultGuestDraft: GuestDraft = {
  plan: "plus",
  businessName: "Yangi Biznes",
  slug: "yangi-biznes",
  category: "Xizmat ko'rsatish",
  description: "Mijozlar QR orqali telefon, Telegram, Instagram, xizmatlar va manzilni tez topishi uchun qisqa vizitka sahifa.",
  phone: "+998 90 123 45 67",
  telegram: "https://t.me/example",
  instagram: "https://instagram.com/example",
  whatsapp: "https://wa.me/998901234567",
  website: "",
  address: "Toshkent shahri",
  mapUrl: "https://maps.google.com",
  coverUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85",
  primaryColor: "#0f766e",
  accentColor: "#f59e0b",
  servicesTitle: "Xizmatlar",
  services: [
    { id: "service_1", name: "Asosiy xizmat", description: "Mijoz eng ko'p so'raydigan xizmatni shu yerda ko'rsating.", price: "Kelishiladi" },
    { id: "service_2", name: "Premium paket", description: "Qimmatroq taklifni alohida ajratib ko'rsatish.", price: "Paket narxi" },
  ],
  galleryTitle: "Ishlardan namunalar",
  galleryImages: [
    { id: "image_1", url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=85", alt: "Business preview" },
    { id: "image_2", url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85", alt: "Online card" },
  ],
  testimonialsTitle: "Mijozlar fikri",
  testimonials: [
    { id: "review_1", name: "Mijoz", text: "Kerakli ma'lumotni QR orqali darhol topdim." },
    { id: "review_2", name: "Doimiy mijoz", text: "Telefon va Instagram bir joyda bo'lgani qulay." },
  ],
  highlightsTitle: "Nima uchun tanlashadi",
  highlights: [
    { id: "fast", label: "Aloqa", value: "1 tap" },
    { id: "qr", label: "QR sahifa", value: "24/7" },
    { id: "booking", label: "Yozilish", value: "Online" },
  ],
  processTitle: "Ish jarayoni",
  process: [
    { id: "step_1", step: "01", title: "So'rov", description: "Mijoz QR sahifadan yoziladi yoki qo'ng'iroq qiladi." },
    { id: "step_2", step: "02", title: "Kelishuv", description: "Narx, muddat va xizmat tarkibi aniqlanadi." },
    { id: "step_3", step: "03", title: "Bajarish", description: "Buyurtma yoki xizmat belgilangan vaqtda bajariladi." },
  ],
  promoTitle: "Bugun yoziling",
  promoDescription: "QR sahifa mijozni ortiqcha qidiruvsiz telefon, Telegram yoki WhatsAppga olib boradi.",
  promoActionLabel: "Telegramda yozilish",
  promoActionUrl: "https://t.me/example",
  faqTitle: "Savollar",
  faq: [
    { id: "faq_1", question: "Qanday bog'lanaman?", answer: "Telefon, Telegram, Instagram yoki WhatsApp tugmalari orqali." },
    { id: "faq_2", question: "Narx qanday belgilanadi?", answer: "Xizmat turi, muddat va paketga qarab kelishiladi." },
  ],
  hoursTitle: "Ish vaqti",
  hours: [
    { day: "Dushanba - Shanba", value: "09:00 - 19:00" },
    { day: "Yakshanba", value: "Oldindan yozilish" },
  ],
  locationTitle: "Qayerdamiz",
  enabled: {
    contacts: true,
    highlights: true,
    services: true,
    process: false,
    promo: true,
    gallery: true,
    testimonials: true,
    faq: false,
    hours: true,
    location: true,
  },
};

export function normalizeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 42);
}

function clean(value: string) { return value.trim(); }
function optional(value: string) { const v = clean(value); return v || undefined; }

export function getDraftForPlan(plan: GuestPlan, current?: GuestDraft): GuestDraft {
  const base: GuestDraft = {
    ...defaultGuestDraft,
    ...(current ?? {}),
    services: current?.services ?? defaultGuestDraft.services,
    galleryImages: current?.galleryImages ?? defaultGuestDraft.galleryImages,
    testimonials: current?.testimonials ?? defaultGuestDraft.testimonials,
    highlights: current?.highlights ?? defaultGuestDraft.highlights,
    process: current?.process ?? defaultGuestDraft.process,
    faq: current?.faq ?? defaultGuestDraft.faq,
    hours: current?.hours ?? defaultGuestDraft.hours,
    enabled: { ...defaultGuestDraft.enabled, ...(current?.enabled ?? {}) },
  };
  if (plan === "oddiy") return { ...base, plan, primaryColor: base.primaryColor || "#0f766e", accentColor: base.accentColor || "#0f766e", coverUrl: "", enabled: { ...base.enabled, highlights: false, process: false, promo: false, gallery: false, testimonials: false, faq: false, hours: true } };
  if (plan === "plus") return { ...base, plan, primaryColor: base.primaryColor || "#7c3aed", accentColor: base.accentColor || "#db2777", enabled: { ...base.enabled, highlights: true, process: false, promo: true, gallery: true, testimonials: true, faq: false } };
  return { ...base, plan, primaryColor: base.primaryColor || "#111827", accentColor: base.accentColor || "#b08d57", enabled: { ...base.enabled, highlights: true, process: true, promo: true, gallery: true, testimonials: true, faq: true, hours: false } };
}

export function buildGuestSite(draft: GuestDraft): PublishedSite {
  const isPlus = draft.plan === "plus";
  const isPro = draft.plan === "pro";
  const services = draft.services.map((x) => ({ ...x, name: clean(x.name), description: clean(x.description), price: clean(x.price) })).filter((x) => x.name);
  const gallery = draft.galleryImages.map((x) => ({ ...x, url: clean(x.url), alt: clean(x.alt) || clean(draft.businessName) || "Portfolio image" })).filter((x) => x.url);
  const testimonials = draft.testimonials.map((x) => ({ ...x, name: clean(x.name), text: clean(x.text) })).filter((x) => x.name && x.text);
  const highlights = draft.highlights.map((x) => ({ ...x, label: clean(x.label), value: clean(x.value) })).filter((x) => x.label || x.value);
  const process = draft.process.map((x) => ({ ...x, step: clean(x.step), title: clean(x.title), description: clean(x.description) })).filter((x) => x.title);
  const faq = draft.faq.map((x) => ({ ...x, question: clean(x.question), answer: clean(x.answer) })).filter((x) => x.question && x.answer);
  const hours = draft.hours.map((x) => ({ day: clean(x.day), value: clean(x.value) })).filter((x) => x.day || x.value);
  const hasContact = Boolean(clean(draft.phone) || clean(draft.telegram) || clean(draft.instagram) || clean(draft.whatsapp) || clean(draft.website));
  const hasAddress = Boolean(clean(draft.address));
  const tenantSlug = normalizeSlug(draft.slug) || "guest-preview";

  return {
    id: "guest-preview-site",
    tenantId: "guest-preview-tenant",
    tenantSlug,
    title: draft.businessName,
    description: draft.description,
    templateKey: draft.plan,
    status: "published",
    theme: {
      primaryColor: draft.primaryColor,
      accentColor: draft.accentColor,
      backgroundColor: isPro ? "#f7f2ea" : isPlus ? "#faf7ff" : "#f8fafc",
      textColor: isPro ? "#17120f" : "#172033",
      surfaceColor: isPro ? "#fffaf2" : "#ffffff",
    },
    publishedAt: new Date().toISOString(),
    showPlatformBranding: true,
    blocks: [
      { id: "guest_hero", type: "hero", enabled: true, data: { businessName: clean(draft.businessName) || "Yangi Biznes", category: clean(draft.category), description: clean(draft.description), coverUrl: optional(draft.coverUrl) } },
      { id: "guest_contacts", type: "contact_buttons", enabled: draft.enabled.contacts && hasContact, data: { phone: optional(draft.phone), telegram: optional(draft.telegram), instagram: optional(draft.instagram), whatsapp: optional(draft.whatsapp), website: optional(draft.website) } },
      { id: "guest_highlights", type: "highlights", enabled: draft.enabled.highlights && highlights.length > 0, data: { title: clean(draft.highlightsTitle), items: highlights } },
      { id: "guest_services", type: "services", enabled: draft.enabled.services && services.length > 0, data: { title: clean(draft.servicesTitle), items: services } },
      { id: "guest_process", type: "process", enabled: draft.enabled.process && process.length > 0, data: { title: clean(draft.processTitle), items: process } },
      { id: "guest_promo", type: "promo", enabled: draft.enabled.promo, data: { title: clean(draft.promoTitle), description: clean(draft.promoDescription), actionLabel: optional(draft.promoActionLabel), actionUrl: optional(draft.promoActionUrl) } },
      { id: "guest_gallery", type: "gallery", enabled: draft.enabled.gallery && gallery.length > 0, data: { title: clean(draft.galleryTitle), images: gallery } },
      { id: "guest_testimonials", type: "testimonials", enabled: draft.enabled.testimonials && testimonials.length > 0, data: { title: clean(draft.testimonialsTitle), items: testimonials } },
      { id: "guest_faq", type: "faq", enabled: draft.enabled.faq && faq.length > 0, data: { title: clean(draft.faqTitle), items: faq } },
      { id: "guest_hours", type: "working_hours", enabled: draft.enabled.hours && hours.length > 0, data: { title: clean(draft.hoursTitle), rows: hours } },
      { id: "guest_location", type: "location", enabled: draft.enabled.location && hasAddress, data: { title: clean(draft.locationTitle), address: clean(draft.address), mapUrl: optional(draft.mapUrl) } },
    ],
  };
}

export function buildDraftFromSite(site: PublishedSite): GuestDraft {
  const hero = site.blocks.find((b) => b.type === "hero");
  const contacts = site.blocks.find((b) => b.type === "contact_buttons");
  const services = site.blocks.find((b) => b.type === "services");
  const gallery = site.blocks.find((b) => b.type === "gallery");
  const testimonials = site.blocks.find((b) => b.type === "testimonials");
  const location = site.blocks.find((b) => b.type === "location");
  const highlights = site.blocks.find((b) => b.type === "highlights");
  const process = site.blocks.find((b) => b.type === "process");
  const promo = site.blocks.find((b) => b.type === "promo");
  const faq = site.blocks.find((b) => b.type === "faq");
  const hours = site.blocks.find((b) => b.type === "working_hours");

  return getDraftForPlan(site.templateKey, {
    ...defaultGuestDraft,
    plan: site.templateKey,
    businessName: hero?.type === "hero" ? hero.data.businessName : site.title,
    slug: site.tenantSlug,
    category: hero?.type === "hero" ? hero.data.category : "",
    description: hero?.type === "hero" ? hero.data.description : site.description,
    phone: contacts?.type === "contact_buttons" ? contacts.data.phone ?? "" : "",
    telegram: contacts?.type === "contact_buttons" ? contacts.data.telegram ?? "" : "",
    instagram: contacts?.type === "contact_buttons" ? contacts.data.instagram ?? "" : "",
    whatsapp: contacts?.type === "contact_buttons" ? contacts.data.whatsapp ?? "" : "",
    website: contacts?.type === "contact_buttons" ? contacts.data.website ?? "" : "",
    address: location?.type === "location" ? location.data.address : "",
    mapUrl: location?.type === "location" ? location.data.mapUrl ?? "" : "",
    locationTitle: location?.type === "location" ? location.data.title : defaultGuestDraft.locationTitle,
    coverUrl: hero?.type === "hero" ? hero.data.coverUrl ?? "" : "",
    primaryColor: site.theme.primaryColor,
    accentColor: site.theme.accentColor ?? site.theme.primaryColor,
    servicesTitle: services?.type === "services" ? services.data.title : defaultGuestDraft.servicesTitle,
    services: services?.type === "services" ? services.data.items.map((x) => ({ id: x.id, name: x.name, description: x.description ?? "", price: x.price ?? "" })) : [],
    galleryTitle: gallery?.type === "gallery" ? gallery.data.title : defaultGuestDraft.galleryTitle,
    galleryImages: gallery?.type === "gallery" ? gallery.data.images.map((x) => ({ ...x })) : [],
    testimonialsTitle: testimonials?.type === "testimonials" ? testimonials.data.title : defaultGuestDraft.testimonialsTitle,
    testimonials: testimonials?.type === "testimonials" ? testimonials.data.items.map((x) => ({ ...x })) : [],
    highlightsTitle: highlights?.type === "highlights" ? highlights.data.title : defaultGuestDraft.highlightsTitle,
    highlights: highlights?.type === "highlights" ? highlights.data.items.map((x) => ({ ...x })) : [],
    processTitle: process?.type === "process" ? process.data.title : defaultGuestDraft.processTitle,
    process: process?.type === "process" ? process.data.items.map((x) => ({ ...x })) : [],
    promoTitle: promo?.type === "promo" ? promo.data.title : defaultGuestDraft.promoTitle,
    promoDescription: promo?.type === "promo" ? promo.data.description : defaultGuestDraft.promoDescription,
    promoActionLabel: promo?.type === "promo" ? promo.data.actionLabel ?? "" : "",
    promoActionUrl: promo?.type === "promo" ? promo.data.actionUrl ?? "" : "",
    faqTitle: faq?.type === "faq" ? faq.data.title : defaultGuestDraft.faqTitle,
    faq: faq?.type === "faq" ? faq.data.items.map((x) => ({ ...x })) : [],
    hoursTitle: hours?.type === "working_hours" ? hours.data.title : defaultGuestDraft.hoursTitle,
    hours: hours?.type === "working_hours" ? hours.data.rows.map((x) => ({ ...x })) : [],
    enabled: {
      contacts: Boolean(contacts?.enabled), highlights: Boolean(highlights?.enabled), services: Boolean(services?.enabled), process: Boolean(process?.enabled), promo: Boolean(promo?.enabled), gallery: Boolean(gallery?.enabled), testimonials: Boolean(testimonials?.enabled), faq: Boolean(faq?.enabled), hours: Boolean(hours?.enabled), location: Boolean(location?.enabled),
    },
  });
}

export function buildGuestPublicUrl(slug: string) {
  const normalized = normalizeSlug(slug) || "guest";
  return `${process.env.NEXT_PUBLIC_SITE_BASE_URL ?? "http://127.0.0.1:3000"}/${normalized}`;
}