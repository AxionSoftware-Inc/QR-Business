export const supportedLocales = ["uz", "en", "ru"] as const;
export type AppLocale = (typeof supportedLocales)[number];

export function normalizeLocale(value?: string | null): AppLocale {
  const base = String(value ?? "").trim().toLowerCase().split(/[-_]/)[0];
  return supportedLocales.includes(base as AppLocale) ? (base as AppLocale) : "en";
}

const catalog = {
  uz: {
    dashboard: "Dashboard", settings: "Sozlamalar", sites: "Saytlar", published: "Published",
    views: "Ko‘rishlar", scans: "QR scanlar", clicks: "Bosishlar", newSite: "Yangi sayt",
    refresh: "Yangilash", edit: "Tahrirlash", publicSite: "Public sayt", customDomain: "Custom domain",
    add: "Qo‘shish", verify: "Tekshirish", workspace: "Workspace", planLimits: "Plan va limitlar",
    team: "Team", media: "Media", dynamicQr: "Dynamic QR", customDomains: "Custom domainlar",
    advancedAnalytics: "Kengaytirilgan analytics", removeBranding: "Brandingni olib tashlash",
    workspaceDescription: "Har bir biznes alohida workspace ichida boshqariladi.",
    noSites: "Bu workspace’da hali sayt yo‘q", createFirstSite: "Birinchi saytni yarating.",
    loadingDashboard: "Dashboard yuklanmoqda...", signIn: "Account bilan kiring", signInGoogle: "Google bilan kirish",
    qrPng: "QR PNG", qrSvg: "QR SVG", domainPlaceholder: "example.com", pendingProof: "TXT proof hali topilmadi.",
    workspaceSettingsSaved: "Workspace sozlamalari saqlandi.", settingsLoading: "Sozlamalar yuklanmoqda...",
    workspaceNotFound: "Workspace topilmadi.", name: "Nomi", locale: "Til", timezone: "Vaqt zonasi",
    viewPlans: "Planlarni ko‘rish", realUsage: "Server hisoblagan real usage.", teamSeat: "Team seat",
    active: "active", pending: "pending", plan: "Plan", usage: "Usage",
  },
  en: {
    dashboard: "Dashboard", settings: "Settings", sites: "Sites", published: "Published",
    views: "Views", scans: "QR scans", clicks: "Clicks", newSite: "New site",
    refresh: "Refresh", edit: "Edit", publicSite: "Public site", customDomain: "Custom domain",
    add: "Add", verify: "Verify", workspace: "Workspace", planLimits: "Plan and limits",
    team: "Team", media: "Media", dynamicQr: "Dynamic QR", customDomains: "Custom domains",
    advancedAnalytics: "Advanced analytics", removeBranding: "Remove branding",
    workspaceDescription: "Each business is managed inside its own workspace.",
    noSites: "This workspace has no sites yet", createFirstSite: "Create your first site.",
    loadingDashboard: "Loading dashboard...", signIn: "Sign in to your account", signInGoogle: "Sign in with Google",
    qrPng: "QR PNG", qrSvg: "QR SVG", domainPlaceholder: "example.com", pendingProof: "TXT proof has not been found yet.",
    workspaceSettingsSaved: "Workspace settings saved.", settingsLoading: "Loading settings...",
    workspaceNotFound: "Workspace not found.", name: "Name", locale: "Language", timezone: "Timezone",
    viewPlans: "View plans", realUsage: "Usage calculated by the server.", teamSeat: "Team seat",
    active: "active", pending: "pending", plan: "Plan", usage: "Usage",
  },
  ru: {
    dashboard: "Панель", settings: "Настройки", sites: "Сайты", published: "Опубликовано",
    views: "Просмотры", scans: "QR-сканы", clicks: "Клики", newSite: "Новый сайт",
    refresh: "Обновить", edit: "Редактировать", publicSite: "Публичный сайт", customDomain: "Свой домен",
    add: "Добавить", verify: "Проверить", workspace: "Рабочее пространство", planLimits: "План и лимиты",
    team: "Команда", media: "Медиа", dynamicQr: "Динамические QR", customDomains: "Свои домены",
    advancedAnalytics: "Расширенная аналитика", removeBranding: "Без брендинга",
    workspaceDescription: "Каждый бизнес управляется в отдельном рабочем пространстве.",
    noSites: "В этом пространстве пока нет сайтов", createFirstSite: "Создайте первый сайт.",
    loadingDashboard: "Загрузка панели...", signIn: "Войдите в аккаунт", signInGoogle: "Войти через Google",
    qrPng: "QR PNG", qrSvg: "QR SVG", domainPlaceholder: "example.com", pendingProof: "TXT-подтверждение пока не найдено.",
    workspaceSettingsSaved: "Настройки сохранены.", settingsLoading: "Загрузка настроек...",
    workspaceNotFound: "Рабочее пространство не найдено.", name: "Название", locale: "Язык", timezone: "Часовой пояс",
    viewPlans: "Посмотреть планы", realUsage: "Фактическое использование по данным сервера.", teamSeat: "Место в команде",
    active: "активно", pending: "ожидает", plan: "План", usage: "Использование",
  },
} as const;

export type TranslationKey = keyof typeof catalog.en;

export function t(locale: string | null | undefined, key: TranslationKey): string {
  return catalog[normalizeLocale(locale)][key] ?? catalog.en[key];
}
