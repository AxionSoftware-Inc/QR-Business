import { cookies } from "next/headers";
import {
  adminGoogleEmailCookie,
  adminSessionCookie,
  createAdminSessionValue,
  isAllowedAdminEmail,
  isAdminPasswordConfigured,
} from "@/modules/admin/auth";

const googleClientId =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ??
  "597660282677-v5085ek6no8ee4uqklp9skp07o2mbc3j.apps.googleusercontent.com";

type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string;
  name?: string;
  picture?: string;
  sub?: string;
};

export async function POST(request: Request) {
  if (!isAdminPasswordConfigured()) {
    return Response.json({ detail: "Admin auth is not configured." }, { status: 503 });
  }

  const payload = (await request.json().catch(() => null)) as {
    credential?: string;
  } | null;
  const credential = payload?.credential;

  if (!credential) {
    return Response.json({ detail: "Google credential is required." }, { status: 400 });
  }

  const tokenInfoResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    { cache: "no-store" },
  );

  if (!tokenInfoResponse.ok) {
    return Response.json({ detail: "Google credential is invalid." }, { status: 401 });
  }

  const tokenInfo = (await tokenInfoResponse.json()) as GoogleTokenInfo;
  const email = tokenInfo.email?.trim().toLowerCase() ?? "";

  if (
    tokenInfo.aud !== googleClientId ||
    tokenInfo.email_verified !== "true" ||
    !email ||
    !isAllowedAdminEmail(email)
  ) {
    return Response.json({ detail: "This Google account is not an admin." }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set(adminSessionCookie, createAdminSessionValue(), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  cookieStore.set(adminGoogleEmailCookie, email, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return Response.json({
    email,
    name: tokenInfo.name ?? email,
    picture: tokenInfo.picture ?? "",
  });
}
