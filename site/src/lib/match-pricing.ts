import type { AstroProfile } from "@/types/match";

function money(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return null;
  return `US$${Math.round(n)}`;
}

/** Short pricing line for cards / detail. */
export function formatProfilePricing(profile: AstroProfile): string | null {
  if (profile.role === "lienzo") {
    if (!profile.willingToPay) return "Presupuesto por definir";
    const min = money(profile.budgetMin);
    const max = money(profile.budgetMax);
    if (min && max) return `Presupuesto ${min}–${max}`;
    if (min) return `Desde ${min}`;
    if (max) return `Hasta ${max}`;
    return "Dispuesto a pagar";
  }
  if (profile.rateOpenToDiscuss) return "Tarifa: abierta a DM";
  const min = money(profile.sessionMinRate);
  return min ? `Mínimo ${min}` : null;
}
