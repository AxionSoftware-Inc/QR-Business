"use client";

const ownerTokenStorageKey = "bm-guest-owner-token";
const ownerContactStorageKey = "bm-guest-owner-contact";
const ownerRecoveryCodeStorageKey = "bm-guest-owner-recovery-code";

export function getGuestOwnerToken() {
  const existing = window.localStorage.getItem(ownerTokenStorageKey);

  if (existing) {
    return existing;
  }

  const token = crypto.randomUUID();
  window.localStorage.setItem(ownerTokenStorageKey, token);
  return token;
}

export function saveGuestOwnerToken(token: string) {
  window.localStorage.setItem(ownerTokenStorageKey, token);
}

export function getGuestOwnerContact() {
  return window.localStorage.getItem(ownerContactStorageKey) ?? "";
}

export function saveGuestOwnerContact(contact: string) {
  const normalized = contact.trim().toLowerCase();

  if (!normalized) {
    window.localStorage.removeItem(ownerContactStorageKey);
    return;
  }

  window.localStorage.setItem(ownerContactStorageKey, normalized);
}

export function getGuestOwnerRecoveryCode() {
  return window.localStorage.getItem(ownerRecoveryCodeStorageKey) ?? "";
}

export function saveGuestOwnerRecoveryCode(code: string) {
  const normalized = code.trim().toUpperCase();

  if (!normalized) {
    window.localStorage.removeItem(ownerRecoveryCodeStorageKey);
    return;
  }

  window.localStorage.setItem(ownerRecoveryCodeStorageKey, normalized);
}
