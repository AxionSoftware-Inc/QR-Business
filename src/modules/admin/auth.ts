import { cookies } from "next/headers";

export const adminSessionCookie = "qr-admin-session";
export const adminGoogleEmailCookie = "qr-admin-google-email";

const defaultAdminEmails = ["shaxzodturayev123@gmail.com"];

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? "";
}

export function isAdminPasswordConfigured() {
  return getAdminPassword().length >= 8;
}

export function createAdminSessionValue() {
  const password = getAdminPassword();
  return Buffer.from(`admin:${password}`).toString("base64url");
}

export function getAllowedAdminEmails() {
  const configured = process.env.ADMIN_GOOGLE_EMAILS ?? "";
  return [...defaultAdminEmails, ...configured.split(",")]
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdminEmail(email: string) {
  return getAllowedAdminEmails().includes(email.trim().toLowerCase());
}

export async function isAdminAuthenticated() {
  if (!isAdminPasswordConfigured()) {
    return false;
  }

  const cookieStore = await cookies();
  return cookieStore.get(adminSessionCookie)?.value === createAdminSessionValue();
}

export function verifyAdminPassword(password: string) {
  return isAdminPasswordConfigured() && password === getAdminPassword();
}
