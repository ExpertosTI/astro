import { sha256Hex, checkRateLimit } from "@/lib/security";

const ADMIN_HASH =
  process.env.NEXT_PUBLIC_ASTRO_ADMIN_HASH ??
  "59c01efdcf1b63e7709325d63183f1b0e03e01c8afca97a49904919e0b942bd2";

const ADMIN_SESSION_KEY = "astro-admin-session";
const SESSION_TTL_MS = 30 * 60 * 1000;

type AdminSession = {
  token: string;
  expiresAt: number;
};

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const limit = checkRateLimit("admin-login", 5, 15 * 60 * 1000);
  if (!limit.allowed) return false;

  const hash = await sha256Hex(password);
  return hash === ADMIN_HASH;
}

export function createAdminSession(): void {
  if (typeof window === "undefined") return;
  const session: AdminSession = {
    token: crypto.randomUUID?.() ?? String(Date.now()),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw) as AdminSession;
    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}
