/** DR / US phone helpers for WhatsApp (ASTRO — Santo Domingo). */

export function digitsOnly(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

/** Normalize to international digits without + (DR/US: 10 → 1XXXXXXXXXX). */
export function normalizePhoneDigits(raw: string): string {
  const d = digitsOnly(raw);
  if (!d) return "";
  if (d.length === 10) return `1${d}`;
  if (d.length === 11 && d.startsWith("1")) return d;
  if (d.startsWith("00") && d.length > 10) return d.slice(2);
  return d;
}

export function isValidPhone(raw: string) {
  const d = normalizePhoneDigits(raw);
  return d.length >= 11;
}
