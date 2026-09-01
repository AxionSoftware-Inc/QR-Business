export type SiteStatus = "draft" | "published" | "disabled";

export type SiteTheme = {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  surfaceColor: string;
  accentColor?: string;
};

export type HeroBlock = {
  id: string;
  type: "hero";
  enabled: boolean;
  data: {
    businessName: string;
    category: string;
    description: string;
    logoUrl?: string;
    coverUrl?: string;
  };
};

export type ContactButtonsBlock = {
  id: string;
  type: "contact_buttons";
  enabled: boolean;
  data: {
    phone?: string;
    telegram?: string;
    instagram?: string;
    whatsapp?: string;
    website?: string;
  };
};

export type ServicesBlock = {
  id: string;
  type: "services";
  enabled: boolean;
  data: {
    title: string;
    items: Array<{
      id: string;
      name: string;
      description?: string;
      price?: string;
    }>;
  };
};

export type GalleryBlock = {
  id: string;
  type: "gallery";
  enabled: boolean;
  data: {
    title: string;
    images: Array<{
      id: string;
      url: string;
      alt: string;
    }>;
  };
};

export type LocationBlock = {
  id: string;
  type: "location";
  enabled: boolean;
  data: {
    title: string;
    address: string;
    mapUrl?: string;
  };
};

export type WorkingHoursBlock = {
  id: string;
  type: "working_hours";
  enabled: boolean;
  data: {
    title: string;
    rows: Array<{
      day: string;
      value: string;
    }>;
  };
};

export type HighlightsBlock = {
  id: string;
  type: "highlights";
  enabled: boolean;
  data: {
    title: string;
    items: Array<{
      id: string;
      label: string;
      value: string;
    }>;
  };
};

export type PromoBlock = {
  id: string;
  type: "promo";
  enabled: boolean;
  data: {
    title: string;
    description: string;
    actionLabel?: string;
    actionUrl?: string;
  };
};

export type TestimonialsBlock = {
  id: string;
  type: "testimonials";
  enabled: boolean;
  data: {
    title: string;
    items: Array<{
      id: string;
      name: string;
      text: string;
    }>;
  };
};

export type ProcessBlock = {
  id: string;
  type: "process";
  enabled: boolean;
  data: {
    title: string;
    items: Array<{
      id: string;
      step: string;
      title: string;
      description: string;
    }>;
  };
};

export type FaqBlock = {
  id: string;
  type: "faq";
  enabled: boolean;
  data: {
    title: string;
    items: Array<{
      id: string;
      question: string;
      answer: string;
    }>;
  };
};

export type SiteBlock =
  | HeroBlock
  | ContactButtonsBlock
  | ServicesBlock
  | GalleryBlock
  | LocationBlock
  | WorkingHoursBlock
  | HighlightsBlock
  | PromoBlock
  | TestimonialsBlock
  | ProcessBlock
  | FaqBlock;

export type PublishedSite = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  title: string;
  description: string;
  templateKey: "oddiy" | "plus" | "pro";
  status: SiteStatus;
  theme: SiteTheme;
  blocks: SiteBlock[];
  publishedAt: string;
  showPlatformBranding: boolean;
};
