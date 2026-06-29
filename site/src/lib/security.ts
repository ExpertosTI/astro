const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_TEXT = {
  displayName: 60,
  bio: 500,
  city: 80,
  chat: 1000,
} as const;

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => HTML_ESCAPE[ch] ?? ch);
}

export function sanitizeText(text: string, maxLen: number): string {
  return escapeHtml(text.trim().slice(0, maxLen));
}

export function sanitizeDisplayName(name: string): string {
  return sanitizeText(name, MAX_TEXT.displayName);
}

export function sanitizeBio(bio: string): string {
  return sanitizeText(bio, MAX_TEXT.bio);
}

export function sanitizeCity(city: string): string {
  return sanitizeText(city, MAX_TEXT.city);
}

export function sanitizeChatMessage(text: string): string {
  return text
    .trim()
    .slice(0, MAX_TEXT.chat)
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "");
}

export function isValidUrl(url: string): boolean {
  if (!url) return true;
  if (url.startsWith("data:image/")) {
    return url.length < 700_000;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Solo se permiten imágenes JPG, PNG, WebP o GIF.";
  }
  if (file.size > 2_000_000) {
    return "La imagen no puede superar 2MB.";
  }
  return null;
}

type RateLimitBucket = { count: number; resetAt: number };

const buckets = new Map<string, RateLimitBucket>();

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

export function createSessionToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 15)}`;
}

export function sessionExpiresAt(days = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function isSessionValid(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}

export async function sha256Hex(text: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return text;
  }
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
