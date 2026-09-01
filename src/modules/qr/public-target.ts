const MAX_QR_TARGET_LENGTH = 2048;

function normalizeHost(value: string) {
  return value.trim().toLowerCase().replace(/^www\./, "");
}

function configuredRootHost() {
  const explicit = process.env.ROOT_DOMAIN?.trim();
  if (explicit) return normalizeHost(explicit.split(":")[0] ?? explicit);

  const siteBase = process.env.NEXT_PUBLIC_SITE_BASE_URL?.trim();
  if (siteBase) {
    try {
      return normalizeHost(new URL(siteBase).hostname);
    } catch {}
  }
  return "localhost";
}

export function validatePublicQrTarget(value: string) {
  const raw = value.trim();
  if (!raw || raw.length > MAX_QR_TARGET_LENGTH) return null;

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return null;
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") return null;
  if (target.username || target.password) return null;

  const host = normalizeHost(target.hostname);
  const root = configuredRootHost();
  const local = root === "localhost" || root === "127.0.0.1";
  const allowed = local
    ? host === "localhost" || host === "127.0.0.1"
    : host === root || host.endsWith(`.${root}`);

  if (!allowed) return null;
  return target.toString();
}
