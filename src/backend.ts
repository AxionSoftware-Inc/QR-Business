import type { PublishedSite } from "@/modules/sites/types";
import type { Tenant, TenantDomain } from "@/modules/tenants/types";

export const tenants: Tenant[] = [
  {
    id: "tenant_lola_flowers",
    ownerId: null,
    name: "Lola Flowers",
    slug: "lola",
    status: "active",
    plan: "oddiy",
    createdAt: "2026-04-27T00:00:00.000Z",
    updatedAt: "2026-04-27T00:00:00.000Z",
  },
  {
    id: "tenant_sabina_beauty",
    ownerId: null,
    name: "Sabina Beauty",
    slug: "sabina",
    status: "active",
    plan: "plus",
    createdAt: "2026-04-27T00:00:00.000Z",
    updatedAt: "2026-04-27T00:00:00.000Z",
  },
  {
    id: "tenant_gulasal_atelier",
    ownerId: null,
    name: "Gulasal Atelier",
    slug: "gulasal",
    status: "active",
    plan: "pro",
    createdAt: "2026-04-27T00:00:00.000Z",
    updatedAt: "2026-04-27T00:00:00.000Z",
  },
];

export const domains: TenantDomain[] = [
  {
    id: "domain_lola",
    tenantId: "tenant_lola_flowers",
    hostname: "lola.localhost",
    type: "subdomain",
    status: "verified",
    verifiedAt: "2026-04-27T00:00:00.000Z",
  },
  {
    id: "domain_sabina",
    tenantId: "tenant_sabina_beauty",
    hostname: "sabina.localhost",
    type: "subdomain",
    status: "verified",
    verifiedAt: "2026-04-27T00:00:00.000Z",
  },
  {
    id: "domain_gulasal",
    tenantId: "tenant_gulasal_atelier",
    hostname: "gulasal.localhost",
    type: "subdomain",
    status: "verified",
    verifiedAt: "2026-04-27T00:00:00.000Z",
  },
];

export const publishedSites: PublishedSite[] = [
  {
    id: "site_lola_flowers",
    tenantId: "tenant_lola_flowers",
    title: "Lola Flowers",
    description: "Gul do'koni uchun oddiy QR vizitka.",
    templateKey: "oddiy",
    status: "published",
    theme: {
      primaryColor: "#b4234a",
      backgroundColor: "#fff8f4",
      textColor: "#27211f",
      surfaceColor: "#ffffff",
    },
    publishedAt: "2026-04-27T00:00:00.000Z",
    blocks: [
      {
        id: "hero_lola",
        type: "hero",
        enabled: true,
        data: {
          businessName: "Lola Flowers",
          category: "Gul do'koni",
          description:
            "Tug'ilgan kun, sovg'a va tadbirlar uchun yangi gullardan guldastalar. Buyurtma Telegram yoki telefon orqali qabul qilinadi.",
        },
      },
      {
        id: "contact_lola",
        type: "contact_buttons",
        enabled: true,
        data: {
          phone: "+998 93 111 22 33",
          telegram: "https://t.me/example",
          instagram: "https://instagram.com/example",
        },
      },
      {
        id: "services_lola",
        type: "services",
        enabled: true,
        data: {
          title: "Xizmatlar",
          items: [
            {
              id: "daily-bouquet",
              name: "Tayyor guldastalar",
              description: "Do'kondagi yangi gullardan tez tayyorlab beriladi.",
              price: "120 000 so'mdan",
            },
            {
              id: "custom-bouquet",
              name: "Buyurtma guldasta",
              description: "Rang, gul turi va byudjet bo'yicha yig'iladi.",
              price: "Kelishiladi",
            },
            {
              id: "delivery",
              name: "Yetkazib berish",
              description: "Shahar ichida manzilga eltib beramiz.",
              price: "25 000 so'mdan",
            },
          ],
        },
      },
      {
        id: "gallery_lola",
        type: "gallery",
        enabled: true,
        data: {
          title: "Guldastalardan namunalar",
          images: [
            {
              id: "lola_flowers_1",
              url: "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=700&q=85",
              alt: "Pink flower bouquet",
            },
            {
              id: "lola_flowers_2",
              url: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?auto=format&fit=crop&w=700&q=85",
              alt: "Fresh floral arrangement",
            },
            {
              id: "lola_flowers_3",
              url: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=700&q=85",
              alt: "Elegant flower bouquet",
            },
          ],
        },
      },
      {
        id: "hours_lola",
        type: "working_hours",
        enabled: true,
        data: {
          title: "Ish vaqti",
          rows: [
            { day: "Dushanba - Shanba", value: "09:00 - 20:00" },
            { day: "Yakshanba", value: "10:00 - 18:00" },
          ],
        },
      },
      {
        id: "location_lola",
        type: "location",
        enabled: true,
        data: {
          title: "Manzil",
          address: "Toshkent, Chilonzor tumani, Bunyodkor shoh ko'chasi",
          mapUrl: "https://maps.google.com",
        },
      },
    ],
  },
  {
    id: "site_sabina_beauty",
    tenantId: "tenant_sabina_beauty",
    title: "Sabina Beauty",
    description: "Go'zallik studiyasi uchun plus QR vizitka.",
    templateKey: "plus",
    status: "published",
    theme: {
      primaryColor: "#7c3aed",
      accentColor: "#db2777",
      backgroundColor: "#faf7ff",
      textColor: "#211827",
      surfaceColor: "#ffffff",
    },
    publishedAt: "2026-04-27T00:00:00.000Z",
    blocks: [
      {
        id: "hero_sabina",
        type: "hero",
        enabled: true,
        data: {
          businessName: "Sabina Beauty",
          category: "Beauty studio",
          description:
            "Makeup, qosh-lash, soch turmagi va kelin obrazlari. Oldindan yozilish orqali xizmat ko'rsatiladi.",
          coverUrl:
            "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=1400&q=85",
        },
      },
      {
        id: "contact_sabina",
        type: "contact_buttons",
        enabled: true,
        data: {
          phone: "+998 90 555 44 33",
          telegram: "https://t.me/example",
          instagram: "https://instagram.com/example",
          whatsapp: "https://wa.me/998905554433",
        },
      },
      {
        id: "highlights_sabina",
        type: "highlights",
        enabled: true,
        data: {
          title: "Nima uchun tanlashadi",
          items: [
            { id: "experience", label: "Tajriba", value: "5+ yil" },
            { id: "clients", label: "Mijozlar", value: "800+" },
            { id: "booking", label: "Yozilish", value: "Online" },
          ],
        },
      },
      {
        id: "services_sabina",
        type: "services",
        enabled: true,
        data: {
          title: "Xizmatlar",
          items: [
            {
              id: "makeup",
              name: "Professional makeup",
              description: "Kundalik, kechki va fotosessiya uchun obraz.",
              price: "250 000 so'mdan",
            },
            {
              id: "brows",
              name: "Qosh dizayni",
              description: "Forma, bo'yash va laminatsiya.",
              price: "90 000 so'mdan",
            },
            {
              id: "hair",
              name: "Soch turmagi",
              description: "To'y, bazm va eventlar uchun styling.",
              price: "180 000 so'mdan",
            },
            {
              id: "bride",
              name: "Kelin paketi",
              description: "Makeup, soch va obrazni to'liq tayyorlash.",
              price: "Kelishiladi",
            },
          ],
        },
      },
      {
        id: "promo_sabina",
        type: "promo",
        enabled: true,
        data: {
          title: "Hafta ichi yozilish uchun bonus",
          description:
            "Dushanba - payshanba kunlari makeup xizmatiga bepul konsultatsiya va obraz bo'yicha tavsiya.",
          actionLabel: "Telegramda yozilish",
          actionUrl: "https://t.me/example",
        },
      },
      {
        id: "gallery_sabina",
        type: "gallery",
        enabled: true,
        data: {
          title: "Ishlardan namunalar",
          images: [
            {
              id: "look_1",
              url: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=700&q=85",
              alt: "Premium makeup tools",
            },
            {
              id: "look_2",
              url: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=700&q=85",
              alt: "Editorial beauty makeup",
            },
            {
              id: "look_3",
              url: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=700&q=85",
              alt: "Beauty studio portrait",
            },
          ],
        },
      },
      {
        id: "testimonials_sabina",
        type: "testimonials",
        enabled: true,
        data: {
          title: "Mijozlar fikri",
          items: [
            {
              id: "review_1",
              name: "Madina",
              text: "Makeup juda tabiiy chiqdi, fotosessiyada ham chiroyli ko'rindi.",
            },
            {
              id: "review_2",
              name: "Nilufar",
              text: "Vaqtida qabul qildi, kelin obrazimni to'liq o'zi yig'ib berdi.",
            },
          ],
        },
      },
      {
        id: "hours_sabina",
        type: "working_hours",
        enabled: true,
        data: {
          title: "Ish vaqti",
          rows: [
            { day: "Dushanba - Juma", value: "10:00 - 19:00" },
            { day: "Shanba", value: "10:00 - 17:00" },
            { day: "Yakshanba", value: "Oldindan yozilish" },
          ],
        },
      },
      {
        id: "location_sabina",
        type: "location",
        enabled: true,
        data: {
          title: "Studio manzili",
          address: "Toshkent, Mirzo Ulug'bek tumani, Buyuk Ipak Yo'li metro atrofida",
          mapUrl: "https://maps.google.com",
        },
      },
    ],
  },
  {
    id: "site_gulasal_atelier",
    tenantId: "tenant_gulasal_atelier",
    title: "Gulasal Atelier",
    description: "Premium libos atelyesi uchun pro QR sayt.",
    templateKey: "pro",
    status: "published",
    theme: {
      primaryColor: "#111827",
      accentColor: "#b08d57",
      backgroundColor: "#f7f2ea",
      textColor: "#17120f",
      surfaceColor: "#fffaf2",
    },
    publishedAt: "2026-04-27T00:00:00.000Z",
    blocks: [
      {
        id: "hero_gulasal",
        type: "hero",
        enabled: true,
        data: {
          businessName: "Gulasal Atelier",
          category: "Premium libos atelyesi",
          description:
            "Kelin liboslari, kechki ko'ylaklar va individual obrazlar uchun o'lchamga mos premium tikuv xizmati.",
          coverUrl:
            "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1600&q=90",
        },
      },
      {
        id: "contact_gulasal",
        type: "contact_buttons",
        enabled: true,
        data: {
          phone: "+998 90 777 88 99",
          telegram: "https://t.me/example",
          instagram: "https://instagram.com/example",
          whatsapp: "https://wa.me/998907778899",
        },
      },
      {
        id: "highlights_gulasal",
        type: "highlights",
        enabled: true,
        data: {
          title: "Atelye darajasi",
          items: [
            { id: "private", label: "Private fitting", value: "1:1" },
            { id: "orders", label: "Premium buyurtmalar", value: "300+" },
            { id: "delivery", label: "Tayyorlash muddati", value: "7-21 kun" },
          ],
        },
      },
      {
        id: "services_gulasal",
        type: "services",
        enabled: true,
        data: {
          title: "Premium xizmatlar",
          items: [
            {
              id: "bridal",
              name: "Kelin libosi",
              description:
                "Eskiz, mato tanlash, o'lcham olish va fittinglar bilan to'liq jarayon.",
              price: "3 500 000 so'mdan",
            },
            {
              id: "evening",
              name: "Kechki ko'ylak",
              description:
                "Tadbir, fotosessiya va sahna chiqishlari uchun individual libos.",
              price: "1 800 000 so'mdan",
            },
            {
              id: "styling",
              name: "Obraz konsultatsiyasi",
              description:
                "Rang, siluet, mato va aksessuar bo'yicha premium tavsiya.",
              price: "350 000 so'm",
            },
          ],
        },
      },
      {
        id: "process_gulasal",
        type: "process",
        enabled: true,
        data: {
          title: "Ish jarayoni",
          items: [
            {
              id: "consult",
              step: "01",
              title: "Konsultatsiya",
              description:
                "Tadbir formati, budjet, uslub va muddat aniqlanadi.",
            },
            {
              id: "sketch",
              step: "02",
              title: "Eskiz va mato",
              description:
                "Siluet chiziladi, mato va detallar kelishiladi.",
            },
            {
              id: "fitting",
              step: "03",
              title: "Fitting",
              description:
                "O'lchamga moslab tikiladi va mayda tuzatishlar qilinadi.",
            },
            {
              id: "delivery",
              step: "04",
              title: "Taqdim qilish",
              description:
                "Tayyor libos final tekshiruvdan keyin topshiriladi.",
            },
          ],
        },
      },
      {
        id: "promo_gulasal",
        type: "promo",
        enabled: true,
        data: {
          title: "Private fitting uchun vaqt band qiling",
          description:
            "Pro sahifa mijozni darhol yozilishga olib keladi: telefon, Telegram va WhatsApp bir joyda.",
          actionLabel: "Konsultatsiyaga yozilish",
          actionUrl: "https://t.me/example",
        },
      },
      {
        id: "gallery_gulasal",
        type: "gallery",
        enabled: true,
        data: {
          title: "Portfolio",
          images: [
            {
              id: "dress_1",
              url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=900&q=90",
              alt: "Premium fashion look",
            },
            {
              id: "dress_2",
              url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=90",
              alt: "Elegant evening dress",
            },
            {
              id: "dress_3",
              url: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=90",
              alt: "Editorial atelier style",
            },
          ],
        },
      },
      {
        id: "testimonials_gulasal",
        type: "testimonials",
        enabled: true,
        data: {
          title: "Mijozlar aytadi",
          items: [
            {
              id: "review_g_1",
              name: "Shahnoza",
              text: "Libos aynan men xohlagan siluetda chiqdi. Fitting jarayoni juda tartibli bo'ldi.",
            },
            {
              id: "review_g_2",
              name: "Gavhar",
              text: "Tadbir kuni o'zimni juda ishonchli his qildim. Detallar premium ko'rindi.",
            },
          ],
        },
      },
      {
        id: "faq_gulasal",
        type: "faq",
        enabled: true,
        data: {
          title: "Savollar",
          items: [
            {
              id: "faq_1",
              question: "Buyurtma qancha vaqtda tayyor bo'ladi?",
              answer:
                "Oddiy liboslar 7-14 kunda, murakkab kelin liboslari 14-21 kunda tayyorlanadi.",
            },
            {
              id: "faq_2",
              question: "Mato o'zimdan bo'lishi mumkinmi?",
              answer:
                "Ha, lekin atelye mato sifati va modelga mosligini oldindan tekshiradi.",
            },
            {
              id: "faq_3",
              question: "Narx qanday aniqlanadi?",
              answer:
                "Model, mato, ishlov murakkabligi va fittinglar soniga qarab individual hisoblanadi.",
            },
          ],
        },
      },
      {
        id: "location_gulasal",
        type: "location",
        enabled: true,
        data: {
          title: "Atelye",
          address: "Toshkent, Mirobod tumani, premium showroom hududi",
          mapUrl: "https://maps.google.com",
        },
      },
    ],
  },
];
