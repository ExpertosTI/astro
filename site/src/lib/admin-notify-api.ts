import { getAdminApiToken } from "@/lib/admin-auth";

const BASE = "/api/notify";

async function adminFetch(path: string, init: RequestInit = {}) {
  const token = getAdminApiToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function loginAdminApi(password: string) {
  return adminFetch("/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function fetchWhatsAppStatus() {
  return adminFetch("/whatsapp/status");
}

export async function fetchWhatsAppQr() {
  return adminFetch("/whatsapp/qr");
}

export async function pollWhatsAppConnection() {
  return adminFetch("/whatsapp/connection");
}

export async function logoutWhatsApp() {
  return adminFetch("/whatsapp/logout", { method: "POST" });
}

export async function testWhatsApp(to?: string) {
  return adminFetch("/whatsapp/test", {
    method: "POST",
    body: JSON.stringify(to ? { to } : {}),
  });
}

export async function fetchMailStatus() {
  return adminFetch("/mail/status");
}

export async function testMail(to?: string) {
  return adminFetch("/mail/test", {
    method: "POST",
    body: JSON.stringify(to ? { to } : {}),
  });
}
