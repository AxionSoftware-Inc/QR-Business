"use client";

export type V2Membership = {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  role: "owner" | "admin" | "editor" | "analyst";
};

export type V2User = {
  id: string;
  email: string;
  name: string;
  is_staff: boolean;
  memberships: V2Membership[];
};

type SessionResponse = {
  access: string;
  session_expires_at: string;
  user: V2User;
};

let accessToken = "";
let currentUser: V2User | null = null;
let refreshPromise: Promise<SessionResponse | null> | null = null;

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
}

async function parseSessionResponse(response: Response) {
  if (!response.ok) return null;
  const payload = (await response.json()) as SessionResponse;
  if (!payload.access || !payload.user?.id) return null;
  accessToken = payload.access;
  currentUser = payload.user;
  return payload;
}

export function getAccessToken() {
  return accessToken;
}

export function getCachedV2User() {
  return currentUser;
}

export async function loginWithGoogleCredential(credential: string) {
  const response = await fetch(`${apiBaseUrl()}/api/v2/auth/google/`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  return parseSessionResponse(response);
}

export async function refreshV2Session() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${apiBaseUrl()}/api/v2/auth/refresh/`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        accessToken = "";
        currentUser = null;
        return null;
      }
      return await parseSessionResponse(response);
    } catch {
      accessToken = "";
      currentUser = null;
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function logoutV2Session() {
  try {
    await fetch(`${apiBaseUrl()}/api/v2/auth/logout/`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  } finally {
    accessToken = "";
    currentUser = null;
  }
}

export async function authorizedV2Fetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  if (!accessToken) await refreshV2Session();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${apiBaseUrl()}${path}`, { ...init, credentials: "include", headers });
  if (response.status === 401 && retry) {
    const refreshed = await refreshV2Session();
    if (refreshed) return authorizedV2Fetch(path, init, false);
  }
  return response;
}
