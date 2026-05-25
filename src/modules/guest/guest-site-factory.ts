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
  coverUrl: string;
  primaryColor: string;
  accentColor: string;
  services: Array<{
    id: string;
    name: string;
    description: string;
    price: string;
  }>;
  galleryImages: Array<{
    id: string;
    url: string;
    alt: string;
  }>;
  testimonials: Array<{
    id: string;
    name: string;
    text: string;
  }>;
};

export const guestPlanDetails: Record<
  GuestPlan,
  {
    badge: string;
    description: string;
    priceHint: string;
  }
> = {
  oddiy: {
    badge: "Tez start",
    description: "Telefon, ijtimoiy tarmoqlar, xizmatlar va manzil.",
    priceHint: "Oddiy",
  },
  plus: {
    badge: "Ko'proq ishonch",
    description: "Cover rasm, highlights, portfolio, fikrlar va booking.",
    priceHint: "Plus",
  },
  pro: {
    badge: "Premium sotuv",
    description: "Katta hero, jarayon, premium bloklar, FAQ va kuchli CTA.",
    priceHint: "Pro",
  },
};

export const defaultGuestDraft: GuestDraft = {
  plan: "plus",
  businessName: "Yangi Biznes",
  slug: "yangi-biznes",
  category: "Xizmat ko'rsatish",
  description:
    "Mijozlar QR orqali telefon, Telegram, Instagram, xizmatlar va manzilni tez topishi uchun qisqa vizitka sahifa.",
  phone: "+998 90 123 45 67",
  telegram: "https://t.me/example",
  instagram: "https://instagram.com/example",
  whatsapp: "https://wa.me/998901234567",
  website: "",
  address: "Toshkent shahri",
  coverUrl:
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85",
  primaryColor: "#0f766e",
  accentColor: "#f59e0b",
  services: [
    {
      id: "service_1",
      name: "Asosiy xizmat",
      description: "Mijoz eng ko'p so'raydigan xizmatni shu yerda ko'rsating.",
      price: "Kelishiladi",
    },
    {
      id: "service_2",
      name: "Premium paket",
      description: "Qimmatroq taklifni alohida ajratib ko'rsatish.",
      price: "Paket narxi",
    },
  ],
  galleryImages: [
    {
      id: "image_1",
      url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=85",
      alt: "Business preview",
    },
    {
      id: "image_2",
      url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85",
      alt: "Online card",
    },
    {
      id: "image_3",
      url: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=85",
      alt: "Client service",
    },
  ],
  testimonials: [
    {
      id: "review_1",
      name: "Mijoz",
      text: "Kerakli ma'lumotni QR orqali darhol topdim.",
    },
    {
      id: "review_2",
      name: "Doimiy mijoz",
      text: "Telefon va Instagram bir joyda bo'lgani qulay.",
    },
  ],
};

export function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
}

function cleanText(value: string) {
  return value.trim();
}

function optionalUrl(value: string) {
  const trimmed = cleanText(value);
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getDraftForPlan(plan: GuestPlan, current?: GuestDraft): GuestDraft {
  const base = {
    ...defaultGuestDraft,
    ...(current ?? {}),
    services: current?.services ?? defaultGuestDraft.services,
    galleryImages: current?.galleryImages ?? defaultGuestDraft.galleryImages,
    testimonials: current?.testimonials ?? defaultGuestDraft.testimonials,
  };

  if (plan === "oddiy") {
    return {
      ...base,
      plan,
      primaryColor: base.primaryColor || "#0f766e",
      accentColor: base.accentColor || "#0f766e",
      coverUrl: "",
    };
  }

  if (plan === "plus") {
    return {
      ...base,
      plan,
      primaryColor: "#7c3aed",
      accentColor: "#db2777",
      coverUrl:
        base.coverUrl ||
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85",
    };
  }

  return {
    ...base,
    plan,
    primaryColor: "#111827",
    accentColor: "#b08d57",
    coverUrl:
      base.coverUrl ||
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1600&q=90",
  };
}

export function buildGuestSite(draft: GuestDraft): PublishedSite {
  const isPlus = draft.plan === "plus";
  const isPro = draft.plan === "pro";
  const services = draft.services
    .map((item) => ({
      ...item,
      name: cleanText(item.name),
      description: cleanText(item.description),
      price: cleanText(item.price),
    }))
    .filter((item) => item.name.length > 0);
  const galleryImages = draft.galleryImages
    .map((item) => ({
      ...item,
      url: cleanText(item.url),
      alt: cleanText(item.alt) || cleanText(draft.businessName) || "Portfolio image",
    }))
    .filter((item) => item.url.length > 0);
  const testimonials = draft.testimonials
    .map((item) => ({
      ...item,
      name: cleanText(item.name),
      text: cleanText(item.text),
    }))
    .filter((item) => item.name.length > 0 && item.text.length > 0);
  const hasContact =
    cleanText(draft.phone).length > 0 ||
    cleanText(draft.telegram).length > 0 ||
    cleanText(draft.instagram).length > 0 ||
    cleanText(draft.whatsapp).length > 0 ||
    cleanText(draft.website).length > 0;
  const hasAddress = cleanText(draft.address).length > 0;
  const hasCover = cleanText(draft.coverUrl).length > 0;

  return {
    id: "guest-preview-site",
    tenantId: "guest-preview-tenant",
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
    blocks: [
      {
        id: "guest_hero",
        type: "hero",
        enabled: true,
        data: {
          businessName: cleanText(draft.businessName) || "Yangi Biznes",
          category: cleanText(draft.category),
          description: cleanText(draft.description),
          coverUrl: hasCover ? cleanText(draft.coverUrl) : undefined,
        },
      },
      {
        id: "guest_contacts",
        type: "contact_buttons",
        enabled: hasContact,
        data: {
          phone: optionalUrl(draft.phone),
          telegram: optionalUrl(draft.telegram),
          instagram: optionalUrl(draft.instagram),
          whatsapp: optionalUrl(draft.whatsapp),
          website: optionalUrl(draft.website),
        },
      },
      {
        id: "guest_highlights",
        type: "highlights",
        enabled: isPlus || isPro,
        data: {
          title: isPro ? "Premium ko'rsatkichlar" : "Nima uchun tanlashadi",
          items: [
            { id: "fast", label: "Aloqa", value: "1 tap" },
            { id: "qr", label: "QR sahifa", value: "24/7" },
            { id: "booking", label: "Yozilish", value: "Online" },
          ],
        },
      },
      {
        id: "guest_services",
        type: "services",
        enabled: services.length > 0,
        data: {
          title: isPro ? "Signature xizmatlar" : "Xizmatlar",
          items: services,
        },
      },
      {
        id: "guest_process",
        type: "process",
        enabled: isPro,
        data: {
          title: "Ish jarayoni",
          items: [
            {
              id: "step_1",
              step: "01",
              title: "So'rov",
              description: "Mijoz QR sahifadan yoziladi yoki qo'ng'iroq qiladi.",
            },
            {
              id: "step_2",
              step: "02",
              title: "Kelishuv",
              description: "Narx, muddat va xizmat tarkibi aniqlanadi.",
            },
            {
              id: "step_3",
              step: "03",
              title: "Bajarish",
              description: "Buyurtma yoki xizmat belgilangan vaqtda bajariladi.",
            },
            {
              id: "step_4",
              step: "04",
              title: "Natija",
              description: "Mijoz yakuniy natijani oladi va qayta bog'lanadi.",
            },
          ],
        },
      },
      {
        id: "guest_promo",
        type: "promo",
        enabled: isPlus || isPro,
        data: {
          title: isPro ? "Private buyurtma uchun vaqt band qiling" : "Bugun yoziling",
          description:
            "QR sahifa mijozni ortiqcha qidiruvsiz telefon, Telegram yoki WhatsAppga olib boradi.",
          actionLabel: "Telegramda yozilish",
          actionUrl: draft.telegram || "https://t.me/example",
        },
      },
      {
        id: "guest_gallery",
        type: "gallery",
        enabled: (isPlus || isPro) && galleryImages.length > 0,
        data: {
          title: isPro ? "Portfolio" : "Ishlardan namunalar",
          images: galleryImages,
        },
      },
      {
        id: "guest_testimonials",
        type: "testimonials",
        enabled: (isPlus || isPro) && testimonials.length > 0,
        data: {
          title: "Mijozlar fikri",
          items: testimonials,
        },
      },
      {
        id: "guest_faq",
        type: "faq",
        enabled: isPro,
        data: {
          title: "Savollar",
          items: [
            {
              id: "faq_1",
              question: "Qanday bog'lanaman?",
              answer: "Telefon, Telegram, Instagram yoki WhatsApp tugmalari orqali.",
            },
            {
              id: "faq_2",
              question: "Narx qanday belgilanadi?",
              answer: "Xizmat turi, muddat va paketga qarab kelishiladi.",
            },
          ],
        },
      },
      {
        id: "guest_hours",
        type: "working_hours",
        enabled: !isPro,
        data: {
          title: "Ish vaqti",
          rows: [
            { day: "Dushanba - Shanba", value: "09:00 - 19:00" },
            { day: "Yakshanba", value: "Oldindan yozilish" },
          ],
        },
      },
      {
        id: "guest_location",
        type: "location",
        enabled: hasAddress,
        data: {
          title: isPro ? "Manzil" : "Qayerdamiz",
          address: cleanText(draft.address),
          mapUrl: "https://maps.google.com",
        },
      },
    ],
  };
}

export function buildDraftFromSite(site: PublishedSite): GuestDraft {
  const hero = site.blocks.find((block) => block.type === "hero");
  const contacts = site.blocks.find((block) => block.type === "contact_buttons");
  const services = site.blocks.find((block) => block.type === "services");
  const gallery = site.blocks.find((block) => block.type === "gallery");
  const testimonials = site.blocks.find((block) => block.type === "testimonials");
  const location = site.blocks.find((block) => block.type === "location");

  return getDraftForPlan(site.templateKey, {
    ...defaultGuestDraft,
    plan: site.templateKey,
    businessName:
      hero?.type === "hero" ? hero.data.businessName : site.title,
    slug: site.tenantSlug ?? normalizeSlug(site.title),
    category: hero?.type === "hero" ? hero.data.category : "",
    description:
      hero?.type === "hero" ? hero.data.description : site.description,
    phone:
      contacts?.type === "contact_buttons" ? contacts.data.phone ?? "" : "",
    telegram:
      contacts?.type === "contact_buttons" ? contacts.data.telegram ?? "" : "",
    instagram:
      contacts?.type === "contact_buttons" ? contacts.data.instagram ?? "" : "",
    whatsapp:
      contacts?.type === "contact_buttons" ? contacts.data.whatsapp ?? "" : "",
    website:
      contacts?.type === "contact_buttons" ? contacts.data.website ?? "" : "",
    address: location?.type === "location" ? location.data.address : "",
    coverUrl: hero?.type === "hero" ? hero.data.coverUrl ?? "" : "",
    primaryColor: site.theme.primaryColor,
    accentColor: site.theme.accentColor ?? site.theme.primaryColor,
    services:
      services?.type === "services"
        ? services.data.items.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description ?? "",
            price: item.price ?? "",
          }))
        : [],
    galleryImages:
      gallery?.type === "gallery"
        ? gallery.data.images.map((item) => ({
            id: item.id,
            url: item.url,
            alt: item.alt,
          }))
        : [],
    testimonials:
      testimonials?.type === "testimonials"
        ? testimonials.data.items.map((item) => ({
            id: item.id,
            name: item.name,
            text: item.text,
          }))
        : [],
  });
}

export function buildGuestPublicUrl(slug: string) {
  const normalized = normalizeSlug(slug) || "guest";
  return `${process.env.NEXT_PUBLIC_SITE_BASE_URL ?? "http://127.0.0.1:3000"}/${normalized}`;
}
