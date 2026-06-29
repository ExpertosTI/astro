import type { AstroProfile, Badge, BadgeId } from "@/types/match";

export const BADGE_CATALOG: Record<BadgeId, Badge> = {
  perfil_completo: {
    id: "perfil_completo",
    label: "Perfil Completo",
    emoji: "✦",
    description: "Completaste toda tu información",
  },
  primer_match: {
    id: "primer_match",
    label: "Primer Match",
    emoji: "⚡",
    description: "Tu primera conexión exitosa",
  },
  veterano: {
    id: "veterano",
    label: "Veterano",
    emoji: "🔥",
    description: "5+ matches confirmados",
  },
  lienzo_verificado: {
    id: "lienzo_verificado",
    label: "Lienzo Verificado",
    emoji: "🎨",
    description: "Fotos y disponibilidad validadas",
  },
  artista_destacado: {
    id: "artista_destacado",
    label: "Artista Destacado",
    emoji: "👑",
    description: "Portfolio y bio completos",
  },
  early_adopter: {
    id: "early_adopter",
    label: "Early Adopter",
    emoji: "🚀",
    description: "Entraste en la primera ola",
  },
  super_activo: {
    id: "super_activo",
    label: "Super Activo",
    emoji: "💫",
    description: "Actividad constante en la plataforma",
  },
  racha_7: {
    id: "racha_7",
    label: "Racha x7",
    emoji: "🔥",
    description: "7 días seguidos en la app",
  },
  super_like_pro: {
    id: "super_like_pro",
    label: "Super Like Pro",
    emoji: "⭐",
    description: "Enviaste 10+ super likes",
  },
};

export function computeProfileBadges(
  profile: AstroProfile,
  matchCount = 0,
  stats?: { streak?: number; superLikesSent?: number }
): BadgeId[] {
  const badges = new Set<BadgeId>(profile.badges);

  badges.add("early_adopter");

  const hasCompleteProfile =
    profile.displayName.length > 1
    && profile.bio.length > 10
    && profile.avatarUrl.length > 0
    && profile.bodyParts.length > 0
    && profile.availability.some((a) => a.slots.length > 0);

  if (hasCompleteProfile) badges.add("perfil_completo");

  if (profile.role === "lienzo" && profile.bodyPartPhotos.length >= 2) {
    badges.add("lienzo_verificado");
  }

  if (profile.role === "tatuador" && profile.portfolioUrls.length >= 2 && profile.bio.length > 30) {
    badges.add("artista_destacado");
  }

  if (matchCount >= 1) badges.add("primer_match");
  if (matchCount >= 5) badges.add("veterano");
  if ((stats?.streak ?? 0) >= 7) badges.add("racha_7");
  if ((stats?.superLikesSent ?? 0) >= 10) badges.add("super_like_pro");
  if ((stats?.streak ?? 0) >= 3) badges.add("super_activo");

  return [...badges];
}

export function getBadge(id: BadgeId): Badge {
  return BADGE_CATALOG[id];
}
