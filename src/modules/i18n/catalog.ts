export const supportedLocales = ["uz", "en", "ru"] as const;
export type AppLocale = (typeof supportedLocales)[number];

export function normalizeLocale(value?: string | null): AppLocale {
  const base = String(value ?? "").trim().toLowerCase().split(/[-_]/)[0];
  return supportedLocales.includes(base as AppLocale) ? (base as AppLocale) : "en";
}

const catalog = {
  uz: {
    dashboard: "Dashboard",
    settings: "Sozlamalar",
    sites: "Saytlar",
    published: "Published",
    views: "Ko‘rishlar",
    scans: "QR scanlar",
    clicks: "Bosishlar",
    newSite: "Yangi sayt",
    refresh: "Yangilash",
    edit: "Tahrirlash",
    publicSite: "Public sayt",
    customDomain: "Custom domain",
    add: "Qo‘shish",
    verify: "Verify",
    workspace: "Workspace",
    planLimits: "Plan va limitlar",
    team: "Team",
    media: "Media",
    dynamicQr: "Dynamic QR",
    customDomains: "Custom domains",
    advancedAnalytics: "Advanced analytics",
    removeBranding: "Remove branding",
  },
  en: {
    dashboard: "Dashboard",
    settings: "Settings",
    sites: "Sites",
    published: "Published",
    views: "Views",
    scans: "QR scans",
    clicks: "Clicks",
    newSite: "New site",
    refresh: "Refresh",
    edit: "Edit",
    publicSite: "Public site",
    customDomain: "Custom domain",
    add: "Add",
    verify: "Verify",
    workspace: "Workspace",
    planLimits: "Plan and limits",
    team: "Team",
    media: "Media",
    dynamicQr: "Dynamic QR",
    customDomains: "Custom domains",
    advancedAnalytics: "Advanced analytics",
    removeBranding: "Remove branding",
  },
  ru: {
    dashboard: "Панель",
    settings: "Настройки",
    sites: "Сайты",
    published: "Опубликовано",
    views: "Просмотры",
    scans: "QR-сканы",
    clicks: "Клики",
    newSite: "Новый сайт",
    refresh: "Обновить",
    edit: "Редактировать",
    publicSite: "Публичный сайт",
    customDomain: "Свой домен",
    add: "Добавить",
    verify: "Проверить",
    workspace: "Рабочее пространство",
    planLimits: "План и лимиты",
    team: "Команда",
    media: "Медиа",
    dynamicQr: "Динамические QR",
    customDomains: "Свои домены",
    advancedAnalytics: "Расширенная аналитика",
    removeBranding: "Без брендинга",
  },
} as const;

export type TranslationKey = keyof typeof catalog.en;

export function t(locale: string | null | undefined, key: TranslationKey): string {
  return catalog[normalizeLocale(locale)][key] ?? catalog.en[key];
}
