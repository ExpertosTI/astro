import { sha256Hex, checkRateLimit } from "@/lib/security";

/** SHA-256 of "2BK2" — override with NEXT_PUBLIC_ASTRO_ADMIN_HASH if needed. */
const ADMIN_HASH =
  process.env.NEXT_PUBLIC_ASTRO_ADMIN_HASH ??
  "42f1d13c590da7ebf7e1b2712e2a8b67b482359ef5f6a179593be70878a495e5";

const ADMIN_SESSION_KEY = "astro-admin-session";
const ADMIN_TOKEN_KEY = "astro-admin-token";
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

export function createAdminSession(serverToken?: string): void {
  if (typeof window === "undefined") return;
  const session: AdminSession = {
    token: crypto.randomUUID?.() ?? String(Date.now()),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  if (serverToken) {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, serverToken);
  }
}

export function getAdminApiToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw) as AdminSession;
    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
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
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}
