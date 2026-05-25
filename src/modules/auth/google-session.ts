"use client";

export type GoogleUserSession = {
  email: string;
  name: string;
  picture: string;
  sub: string;
};

const googleSessionStorageKey = "bm-google-user-session";

export function getGoogleUserSession(): GoogleUserSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(googleSessionStorageKey);
    return raw ? (JSON.parse(raw) as GoogleUserSession) : null;
  } catch {
    window.localStorage.removeItem(googleSessionStorageKey);
    return null;
  }
}

export function saveGoogleUserSession(session: GoogleUserSession) {
  window.localStorage.setItem(googleSessionStorageKey, JSON.stringify(session));
}

export function clearGoogleUserSession() {
  window.localStorage.removeItem(googleSessionStorageKey);
}

export function decodeGoogleCredential(credential: string): GoogleUserSession {
  const payload = credential.split(".")[1] ?? "";
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = JSON.parse(
    window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")),
  ) as Partial<GoogleUserSession>;

  return {
    email: decoded.email ?? "",
    name: decoded.name ?? decoded.email ?? "Google user",
    picture: decoded.picture ?? "",
    sub: decoded.sub ?? "",
  };
}
