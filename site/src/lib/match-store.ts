import { computeProfileBadges } from "@/lib/badges";
import { MATCH_STORAGE_KEY, MATCH_STORAGE_KEY_LEGACY } from "@/lib/match-constants";
import { processImageFile, isLikelyImageFile } from "@/lib/image-process";
import {
  checkRateLimit,
  createSessionToken,
  isSessionValid,
  isValidUrl,
  sanitizeBio,
  sanitizeChatMessage,
  sanitizeCity,
  sanitizeDisplayName,
  sessionExpiresAt,
} from "@/lib/security";
import type {
  AppNotification,
  AstroMatch,
  AstroProfile,
  ChatMessage,
  DiscoverFilters,
  MatchAppState,
  MatchSession,
  SwipeAction,
  SwipeRecord,
  UserRole,
  UserStats,
} from "@/types/match";
import { DAILY_LIMITS } from "@/types/match";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function defaultStats(): UserStats {
  const today = todayKey();
  return {
    streak: 1,
    lastActiveDate: today,
    swipesToday: 0,
    swipesDate: today,
    superLikesToday: 0,
    superLikesDate: today,
    rewindsToday: 0,
    rewindsDate: today,
    totalSwipes: 0,
    totalMatches: 0,
    profileViewsReceived: 0,
  };
}

const SEED_PROFILES: AstroProfile[] = [
  {
    id: "seed-lienzo-1",
    role: "lienzo",
    displayName: "Camila R.",
    bio: "Busco pieza en antebrazo, estilo fine line o floral. Primera vez como lienzo, muy emocionada.",
    city: "Santo Domingo",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop",
    portfolioUrls: [],
    bodyParts: ["antebrazo", "mano"],
    bodyPartPhotos: [
      {
        part: "antebrazo",
        url: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=500&fit=crop",
      },
    ],
    availability: [
      { day: "sab", slots: ["tarde", "noche"] },
      { day: "dom", slots: ["manana", "tarde"] },
    ],
    badges: ["early_adopter"],
    willingToPay: true,
    budgetMin: 80,
    budgetMax: 180,
    sessionMinRate: null,
    rateOpenToDiscuss: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seed-lienzo-2",
    role: "lienzo",
    displayName: "André M.",
    bio: "Espalda completa disponible. Me gusta el blackwork y el realismo. Flexible con horarios.",
    city: "Santiago",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
    portfolioUrls: [],
    bodyParts: ["espalda", "hombro"],
    bodyPartPhotos: [
      {
        part: "espalda",
        url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=500&fit=crop",
      },
      {
        part: "hombro",
        url: "https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400&h=500&fit=crop",
      },
    ],
    availability: [
      { day: "vie", slots: ["noche"] },
      { day: "sab", slots: ["manana", "tarde", "noche"] },
    ],
    badges: ["early_adopter", "lienzo_verificado"],
    willingToPay: true,
    budgetMin: 120,
    budgetMax: 350,
    sessionMinRate: null,
    rateOpenToDiscuss: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seed-lienzo-3",
    role: "lienzo",
    displayName: "Valentina S.",
    bio: "Pierna y muslo libres. Estilo japonés o neotradicional. Disponible en semana por las tardes.",
    city: "Santo Domingo",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop",
    portfolioUrls: [],
    bodyParts: ["pierna", "muslo"],
    bodyPartPhotos: [
      {
        part: "pierna",
        url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=500&fit=crop",
      },
    ],
    availability: [
      { day: "mar", slots: ["tarde"] },
      { day: "jue", slots: ["tarde", "noche"] },
    ],
    badges: ["early_adopter"],
    willingToPay: true,
    budgetMin: 60,
    budgetMax: 150,
    sessionMinRate: null,
    rateOpenToDiscuss: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seed-lienzo-4",
    role: "lienzo",
    displayName: "Diego L.",
    bio: "Hombro y pecho disponibles. Fan del neotradicional y lettering.",
    city: "Santo Domingo",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop",
    portfolioUrls: [],
    bodyParts: ["hombro", "pecho"],
    bodyPartPhotos: [
      {
        part: "hombro",
        url: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=500&fit=crop",
      },
    ],
    availability: [
      { day: "lun", slots: ["noche"] },
      { day: "mie", slots: ["tarde", "noche"] },
    ],
    badges: ["early_adopter"],
    willingToPay: false,
    budgetMin: null,
    budgetMax: null,
    sessionMinRate: null,
    rateOpenToDiscuss: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seed-tatuador-1",
    role: "tatuador",
    displayName: "Ink Nova",
    bio: "Especialista en fine line y microrealismo. 8 años de experiencia. Estudio en Piantini.",
    city: "Santo Domingo",
    avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=500&fit=crop",
    portfolioUrls: [
      "https://images.unsplash.com/photo-1611501275019-9b5cda994ee8?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1590246814883-57c511b30dd2?w=400&h=400&fit=crop",
    ],
    bodyParts: [],
    bodyPartPhotos: [],
    availability: [
      { day: "lun", slots: ["tarde", "noche"] },
      { day: "mie", slots: ["tarde", "noche"] },
      { day: "vie", slots: ["tarde"] },
    ],
    badges: ["artista_destacado", "early_adopter"],
    willingToPay: false,
    budgetMin: null,
    budgetMax: null,
    sessionMinRate: 100,
    rateOpenToDiscuss: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
function defaultState(): MatchAppState {
  return {
    session: null,
    profiles: SEED_PROFILES,
    swipes: [],
    matches: [],
    messages: [],
    notifications: [],
    blocked: [],
    profileViews: [],
    filters: { city: "", bodyPart: "" },
    lastSwipe: null,
  };
}

function migrateLegacy(): MatchAppState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MATCH_STORAGE_KEY_LEGACY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MatchAppState>;
    localStorage.removeItem(MATCH_STORAGE_KEY_LEGACY);
    return {
      ...defaultState(),
      ...parsed,
      notifications: parsed.notifications ?? [],
      blocked: parsed.blocked ?? [],
      profileViews: parsed.profileViews ?? [],
      filters: parsed.filters ?? { city: "", bodyPart: "" },
      lastSwipe: null,
    };
  } catch {
    return null;
  }
}

function touchDailyStats(stats: UserStats): UserStats {
  const today = todayKey();
  const next = { ...stats };

  if (next.swipesDate !== today) {
    next.swipesToday = 0;
    next.swipesDate = today;
  }
  if (next.superLikesDate !== today) {
    next.superLikesToday = 0;
    next.superLikesDate = today;
  }
  if (next.rewindsDate !== today) {
    next.rewindsToday = 0;
    next.rewindsDate = today;
  }

  if (next.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    next.streak = next.lastActiveDate === yesterdayKey ? next.streak + 1 : 1;
    next.lastActiveDate = today;
  }

  return next;
}

function countSuperLikesSent(state: MatchAppState, userId: string) {
  return state.swipes.filter((s) => s.fromUserId === userId && s.action === "superlike").length;
}

function refreshBadges(state: MatchAppState, profileId: string): AstroProfile | undefined {
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile) return undefined;
  const matchCount = state.matches.filter(
    (m) => m.status === "matched" && (m.tatuadorId === profileId || m.lienzoId === profileId)
  ).length;
  const stats = state.session?.userId === profileId ? state.session.stats : undefined;
  return {
    ...profile,
    badges: computeProfileBadges(profile, matchCount, {
      streak: stats?.streak,
      superLikesSent: countSuperLikesSent(state, profileId),
    }),
  };
}

function pushNotification(
  state: MatchAppState,
  notification: Omit<AppNotification, "id" | "read" | "createdAt">
): AppNotification[] {
  const item: AppNotification = {
    ...notification,
    id: uid(),
    read: false,
    createdAt: new Date().toISOString(),
  };
  return [item, ...state.notifications].slice(0, 50);
}

function isBlocked(state: MatchAppState, _from: string, toUserId: string) {
  return state.blocked.some((b) => b.userId === toUserId);
}

export function loadMatchState(): MatchAppState {
  if (typeof window === "undefined") return defaultState();

  try {
    let parsed: MatchAppState | null = null;
    const raw = localStorage.getItem(MATCH_STORAGE_KEY);
    if (raw) {
      parsed = JSON.parse(raw) as MatchAppState;
    } else {
      parsed = migrateLegacy();
    }
    if (!parsed) return defaultState();

    const seedIds = new Set(SEED_PROFILES.map((p) => p.id));
    const normalizeProfile = (p: AstroProfile): AstroProfile => ({
      ...p,
      willingToPay: Boolean(p.willingToPay),
      budgetMin: p.budgetMin ?? null,
      budgetMax: p.budgetMax ?? null,
      sessionMinRate: p.sessionMinRate ?? null,
      rateOpenToDiscuss: Boolean(p.rateOpenToDiscuss),
    });
    const mergedProfiles = [
      ...SEED_PROFILES,
      ...parsed.profiles.filter((p) => !seedIds.has(p.id)),
    ].map(normalizeProfile);

    let session = parsed.session;
    if (session && !isSessionValid(session.expiresAt)) {
      session = null;
    }
    if (session) {
      const stats = touchDailyStats(session.stats ?? defaultStats());
      const profile = refreshBadges({ ...parsed, profiles: mergedProfiles }, session.userId);
      session = {
        ...session,
        stats,
        profile: profile ?? session.profile,
      };
    }

    return {
      ...defaultState(),
      ...parsed,
      profiles: mergedProfiles,
      session,
      notifications: parsed.notifications ?? [],
      blocked: parsed.blocked ?? [],
      profileViews: parsed.profileViews ?? [],
      filters: parsed.filters ?? { city: "", bodyPart: "" },
      lastSwipe: parsed.lastSwipe ?? null,
    };
  } catch {
    return defaultState();
  }
}

export function saveMatchState(state: MatchAppState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(state));
}

function createSession(profile: AstroProfile): MatchSession {
  return {
    userId: profile.id,
    profile,
    stats: defaultStats(),
    token: createSessionToken(),
    expiresAt: sessionExpiresAt(7),
  };
}

export function createProfile(
  state: MatchAppState,
  role: UserRole,
  data: Partial<AstroProfile>
): { state: MatchAppState; profile: AstroProfile } {
  const id = uid();
  const now = new Date().toISOString();
  const profile: AstroProfile = {
    id,
    role,
    displayName: sanitizeDisplayName(data.displayName ?? ""),
    bio: sanitizeBio(data.bio ?? ""),
    city: sanitizeCity(data.city ?? "Santo Domingo"),
    avatarUrl: isValidUrl(data.avatarUrl ?? "") ? (data.avatarUrl ?? "") : "",
    portfolioUrls: (data.portfolioUrls ?? []).filter(isValidUrl).slice(0, 6),
    bodyParts: data.bodyParts ?? [],
    bodyPartPhotos: (data.bodyPartPhotos ?? []).filter((p) => isValidUrl(p.url)).slice(0, 10),
    availability: data.availability ?? [],
    badges: ["early_adopter"],
    willingToPay: Boolean(data.willingToPay),
    budgetMin: data.budgetMin ?? null,
    budgetMax: data.budgetMax ?? null,
    sessionMinRate: data.sessionMinRate ?? null,
    rateOpenToDiscuss: Boolean(data.rateOpenToDiscuss),
    createdAt: now,
    updatedAt: now,
  };
  profile.badges = computeProfileBadges(profile, 0);

  const session = createSession(profile);
  const next: MatchAppState = {
    ...state,
    session,
    profiles: [...state.profiles.filter((p) => p.id !== id), profile],
    notifications: pushNotification(state, {
      type: "view",
      title: "¡Bienvenido a ASTRO Match!",
      body: "Completa tu perfil para más visibilidad.",
    }),
  };
  saveMatchState(next);
  return { state: next, profile };
}

export function updateProfile(
  state: MatchAppState,
  profileId: string,
  data: Partial<AstroProfile>
): MatchAppState {
  const profiles = state.profiles.map((p) => {
    if (p.id !== profileId) return p;
    const updated: AstroProfile = {
      ...p,
      displayName: data.displayName !== undefined ? sanitizeDisplayName(data.displayName) : p.displayName,
      bio: data.bio !== undefined ? sanitizeBio(data.bio) : p.bio,
      city: data.city !== undefined ? sanitizeCity(data.city) : p.city,
      avatarUrl: data.avatarUrl !== undefined && isValidUrl(data.avatarUrl) ? data.avatarUrl : p.avatarUrl,
      portfolioUrls:
        data.portfolioUrls !== undefined
          ? data.portfolioUrls.filter(isValidUrl).slice(0, 6)
          : p.portfolioUrls,
      bodyParts: data.bodyParts ?? p.bodyParts,
      bodyPartPhotos:
        data.bodyPartPhotos !== undefined
          ? data.bodyPartPhotos.filter((bp) => isValidUrl(bp.url)).slice(0, 10)
          : p.bodyPartPhotos,
      availability: data.availability ?? p.availability,
      willingToPay: data.willingToPay !== undefined ? Boolean(data.willingToPay) : p.willingToPay,
      budgetMin: data.budgetMin !== undefined ? data.budgetMin : p.budgetMin,
      budgetMax: data.budgetMax !== undefined ? data.budgetMax : p.budgetMax,
      sessionMinRate: data.sessionMinRate !== undefined ? data.sessionMinRate : p.sessionMinRate,
      rateOpenToDiscuss:
        data.rateOpenToDiscuss !== undefined ? Boolean(data.rateOpenToDiscuss) : p.rateOpenToDiscuss,
      updatedAt: new Date().toISOString(),
    };
    const matchCount = state.matches.filter(
      (m) => m.status === "matched" && (m.tatuadorId === profileId || m.lienzoId === profileId)
    ).length;
    updated.badges = computeProfileBadges(updated, matchCount, {
      streak: state.session?.userId === profileId ? state.session.stats.streak : undefined,
      superLikesSent: countSuperLikesSent(state, profileId),
    });
    return updated;
  });

  const session =
    state.session?.userId === profileId
      ? { ...state.session, profile: profiles.find((p) => p.id === profileId)! }
      : state.session;

  const next = { ...state, profiles, session };
  saveMatchState(next);
  return next;
}

type SwipeResult = { state: MatchAppState; error?: string; matched?: boolean };

export function swipeProfile(
  state: MatchAppState,
  toUserId: string,
  action: SwipeAction
): SwipeResult {
  const fromUserId = state.session?.userId;
  if (!fromUserId || !state.session) return { state, error: "Sesión inválida" };

  if (isBlocked(state, fromUserId, toUserId)) {
    return { state, error: "Usuario bloqueado" };
  }

  const limit = checkRateLimit(`swipe-${fromUserId}`, DAILY_LIMITS.swipes, 24 * 60 * 60 * 1000);
  if (!limit.allowed) return { state, error: "Límite diario de swipes alcanzado" };

  const stats = touchDailyStats(state.session.stats);
  if (stats.swipesToday >= DAILY_LIMITS.swipes) {
    return { state, error: "Límite diario de swipes alcanzado" };
  }

  if (action === "superlike" && stats.superLikesToday >= DAILY_LIMITS.superLikes) {
    return { state, error: "Sin super likes hoy. Vuelve mañana." };
  }

  const existing = state.swipes.find(
    (s) => s.fromUserId === fromUserId && s.toUserId === toUserId
  );
  if (existing) return { state, error: "Ya evaluaste este perfil" };

  const swipe: SwipeRecord = {
    id: uid(),
    fromUserId,
    toUserId,
    action,
    createdAt: new Date().toISOString(),
  };

  let matches = [...state.matches];
  let notifications = [...state.notifications];
  const me = state.session.profile;
  const target = state.profiles.find((p) => p.id === toUserId);
  let matched = false;

  const isLike = action === "like" || action === "superlike";

  if (isLike && target) {
    const tatuadorId = me.role === "tatuador" ? me.id : target.id;
    const lienzoId = me.role === "lienzo" ? me.id : target.id;

    const reverseLike = state.swipes.find(
      (s) =>
        s.fromUserId === toUserId
        && s.toUserId === fromUserId
        && (s.action === "like" || s.action === "superlike")
    );

    const existingMatch = matches.find(
      (m) => m.tatuadorId === tatuadorId && m.lienzoId === lienzoId
    );

    if (!existingMatch) {
      const newMatch: AstroMatch = {
        id: uid(),
        tatuadorId,
        lienzoId,
        status: reverseLike || action === "superlike" ? "matched" : "pending",
        initiatedBy: fromUserId,
        isSuperLike: action === "superlike",
        createdAt: new Date().toISOString(),
        matchedAt: reverseLike || action === "superlike" ? new Date().toISOString() : undefined,
      };
      matches.push(newMatch);
      if (newMatch.status === "matched") {
        matched = true;
        notifications = pushNotification({ ...state, notifications }, {
          type: "match",
          title: "¡Nuevo Match!",
          body: `Conectaste con ${target.displayName}`,
          relatedUserId: toUserId,
          relatedMatchId: newMatch.id,
        });
      } else {
        notifications = pushNotification({ ...state, notifications }, {
          type: action === "superlike" ? "superlike" : "pending",
          title: action === "superlike" ? "Super Like enviado ⭐" : "Interés enviado",
          body: `Esperando respuesta de ${target.displayName}`,
          relatedUserId: toUserId,
          relatedMatchId: newMatch.id,
        });
      }
    } else if ((reverseLike || action === "superlike") && existingMatch.status === "pending") {
      matches = matches.map((m) =>
        m.id === existingMatch.id
          ? {
              ...m,
              status: "matched" as const,
              matchedAt: new Date().toISOString(),
              isSuperLike: m.isSuperLike || action === "superlike",
            }
          : m
      );
      matched = true;
      notifications = pushNotification({ ...state, notifications }, {
        type: "match",
        title: "¡Match confirmado!",
        body: `Ahora puedes chatear con ${target.displayName}`,
        relatedUserId: toUserId,
        relatedMatchId: existingMatch.id,
      });
    }
  }

  stats.swipesToday += 1;
  stats.totalSwipes += 1;
  if (action === "superlike") stats.superLikesToday += 1;

  const next: MatchAppState = {
    ...state,
    session: { ...state.session, stats },
    swipes: [...state.swipes, swipe],
    matches,
    notifications,
    lastSwipe: swipe,
  };
  saveMatchState(next);
  return { state: next, matched };
}

export function rewindSwipe(state: MatchAppState): { state: MatchAppState; error?: string } {
  const fromUserId = state.session?.userId;
  if (!fromUserId || !state.session || !state.lastSwipe) {
    return { state, error: "Nada que deshacer" };
  }
  if (state.lastSwipe.fromUserId !== fromUserId) {
    return { state, error: "Swipe inválido" };
  }

  const stats = touchDailyStats(state.session.stats);
  if (stats.rewindsToday >= DAILY_LIMITS.rewinds) {
    return { state, error: "Ya usaste tu rewind de hoy" };
  }

  const toUserId = state.lastSwipe.toUserId;
  const swipes = state.swipes.filter((s) => s.id !== state.lastSwipe!.id);
  const matches = state.matches.filter(
    (m) =>
      !(
        m.initiatedBy === fromUserId
        && (m.tatuadorId === toUserId || m.lienzoId === toUserId)
        && m.status !== "rejected"
      )
  );

  stats.rewindsToday += 1;

  const next: MatchAppState = {
    ...state,
    session: { ...state.session, stats },
    swipes,
    matches,
    lastSwipe: null,
  };
  saveMatchState(next);
  return { state: next };
}

export function acceptMatch(state: MatchAppState, matchId: string): MatchAppState {
  const me = state.session?.userId;
  const match = state.matches.find((m) => m.id === matchId);
  if (!me || !match || match.status !== "pending") return state;
  if (match.tatuadorId !== me && match.lienzoId !== me) return state;

  const otherId = match.tatuadorId === me ? match.lienzoId : match.tatuadorId;
  const other = state.profiles.find((p) => p.id === otherId);

  const matches = state.matches.map((m) =>
    m.id === matchId
      ? { ...m, status: "matched" as const, matchedAt: new Date().toISOString() }
      : m
  );

  let stats = state.session?.stats ?? defaultStats();
  stats = { ...stats, totalMatches: stats.totalMatches + 1 };

  const next: MatchAppState = {
    ...state,
    session: state.session ? { ...state.session, stats } : null,
    matches,
    notifications: pushNotification(state, {
      type: "match",
      title: "¡Match confirmado!",
      body: other ? `Conectaste con ${other.displayName}` : "Nueva conexión activa",
      relatedUserId: otherId,
      relatedMatchId: matchId,
    }),
  };
  saveMatchState(next);
  return next;
}

export function rejectMatch(state: MatchAppState, matchId: string): MatchAppState {
  const me = state.session?.userId;
  const match = state.matches.find((m) => m.id === matchId);
  if (!me || !match) return state;
  if (match.tatuadorId !== me && match.lienzoId !== me) return state;

  const matches = state.matches.map((m) =>
    m.id === matchId ? { ...m, status: "rejected" as const } : m
  );
  const next = { ...state, matches };
  saveMatchState(next);
  return next;
}

export function sendMessage(
  state: MatchAppState,
  matchId: string,
  text: string
): { state: MatchAppState; error?: string } {
  const senderId = state.session?.userId;
  if (!senderId || !state.session) return { state, error: "Sesión inválida" };

  const match = state.matches.find((m) => m.id === matchId);
  if (!match || match.status !== "matched") return { state, error: "Match no válido" };
  if (match.tatuadorId !== senderId && match.lienzoId !== senderId) {
    return { state, error: "No autorizado" };
  }

  const sanitized = sanitizeChatMessage(text);
  if (!sanitized) return { state, error: "Mensaje vacío" };

  const limit = checkRateLimit(
    `chat-${senderId}`,
    DAILY_LIMITS.messagesPerMinute,
    60 * 1000
  );
  if (!limit.allowed) return { state, error: "Demasiados mensajes. Espera un momento." };

  const message: ChatMessage = {
    id: uid(),
    matchId,
    senderId,
    text: sanitized,
    createdAt: new Date().toISOString(),
  };

  const next = { ...state, messages: [...state.messages, message] };
  saveMatchState(next);
  return { state: next };
}

export function toggleMessageReaction(
  state: MatchAppState,
  messageId: string,
  emoji: string,
  userId: string
): { state: MatchAppState; message?: ChatMessage } {
  let updated: ChatMessage | undefined;

  const messages = state.messages.map((m) => {
    if (m.id !== messageId) return m;
    const reactions = { ...(m.reactions ?? {}) };
    const users = reactions[emoji] ?? [];
    if (users.includes(userId)) {
      const nextUsers = users.filter((id) => id !== userId);
      if (nextUsers.length) reactions[emoji] = nextUsers;
      else delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, userId];
    }
    updated = {
      ...m,
      reactions: Object.keys(reactions).length ? reactions : undefined,
    };
    return updated;
  });

  if (!updated) return { state };

  const next = { ...state, messages };
  saveMatchState(next);
  return { state: next, message: updated };
}

export function recordProfileView(
  state: MatchAppState,
  viewedId: string
): MatchAppState {
  const viewerId = state.session?.userId;
  if (!viewerId || viewerId === viewedId) return state;

  const exists = state.profileViews.some(
    (v) => v.viewerId === viewerId && v.viewedId === viewedId
  );
  if (exists) return state;

  const view = { viewerId, viewedId, createdAt: new Date().toISOString() };
  const next: MatchAppState = {
    ...state,
    profileViews: [...state.profileViews, view],
  };
  saveMatchState(next);
  return next;
}

export function blockUser(
  state: MatchAppState,
  userId: string,
  reason: string
): MatchAppState {
  const me = state.session?.userId;
  if (!me || userId === me) return state;

  const blocked = [
    ...state.blocked.filter((b) => b.userId !== userId),
    { userId, reason: sanitizeBio(reason).slice(0, 120), blockedAt: new Date().toISOString() },
  ];

  const matches = state.matches.map((m) => {
    const involves =
      (m.tatuadorId === me && m.lienzoId === userId)
      || (m.lienzoId === me && m.tatuadorId === userId);
    return involves ? { ...m, status: "rejected" as const } : m;
  });

  const next = { ...state, blocked, matches };
  saveMatchState(next);
  return next;
}

export function setFilters(
  state: MatchAppState,
  filters: DiscoverFilters
): MatchAppState {
  const next = {
    ...state,
    filters: {
      city: sanitizeCity(filters.city),
      bodyPart: filters.bodyPart,
    },
  };
  saveMatchState(next);
  return next;
}

export function markMessagesRead(
  state: MatchAppState,
  matchId: string,
  readerId: string
): { state: MatchAppState; updated: ChatMessage[] } {
  const now = new Date().toISOString();
  const updated: ChatMessage[] = [];

  const messages = state.messages.map((m) => {
    if (m.matchId !== matchId || m.senderId === readerId || m.readAt) return m;
    const next = { ...m, readAt: now };
    updated.push(next);
    return next;
  });

  if (!updated.length) return { state, updated: [] };

  const next = { ...state, messages };
  saveMatchState(next);
  return { state: next, updated };
}

export function getUnreadMessagesCount(
  state: MatchAppState,
  userId: string
): number {
  return state.messages.filter(
    (m) => m.senderId !== userId && !m.readAt && state.matches.some(
      (match) =>
        match.id === m.matchId
        && match.status === "matched"
        && (match.tatuadorId === userId || match.lienzoId === userId)
    )
  ).length;
}

export function getMatchUnreadCount(
  state: MatchAppState,
  matchId: string,
  userId: string
): number {
  return state.messages.filter(
    (m) => m.matchId === matchId && m.senderId !== userId && !m.readAt
  ).length;
}

export function getMatchLastMessage(
  state: MatchAppState,
  matchId: string
): ChatMessage | undefined {
  return state.messages
    .filter((m) => m.matchId === matchId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

export function markNotificationsRead(state: MatchAppState): MatchAppState {
  const notifications = state.notifications.map((n) => ({ ...n, read: true }));
  const next = { ...state, notifications };
  saveMatchState(next);
  return next;
}

export function getBlockedIds(state: MatchAppState): Set<string> {
  return new Set(state.blocked.map((b) => b.userId));
}

export function getDiscoverProfiles(state: MatchAppState): AstroProfile[] {
  const me = state.session?.profile;
  if (!me) return [];

  const blocked = getBlockedIds(state);
  const swipedIds = new Set(
    state.swipes.filter((s) => s.fromUserId === me.id).map((s) => s.toUserId)
  );

  const oppositeRole = me.role === "tatuador" ? "lienzo" : "tatuador";
  const { city, bodyPart } = state.filters;

  return state.profiles.filter((p) => {
    if (p.id === me.id || p.role !== oppositeRole) return false;
    if (!p.displayName?.trim()) return false;
    if (swipedIds.has(p.id) || blocked.has(p.id)) return false;
    if (city && !p.city.toLowerCase().includes(city.toLowerCase())) return false;
    if (bodyPart && !p.bodyParts.includes(bodyPart)) return false;
    return true;
  });
}

export function getLikesReceived(state: MatchAppState): AstroProfile[] {
  const me = state.session?.userId;
  if (!me) return [];

  const likerIds = state.swipes
    .filter(
      (s) =>
        s.toUserId === me
        && (s.action === "like" || s.action === "superlike")
    )
    .map((s) => s.fromUserId);

  const blocked = getBlockedIds(state);
  return state.profiles.filter((p) => likerIds.includes(p.id) && !blocked.has(p.id));
}

export function getProfileViewers(state: MatchAppState): AstroProfile[] {
  const me = state.session?.userId;
  if (!me) return [];

  const viewerIds = [
    ...new Set(
      state.profileViews.filter((v) => v.viewedId === me).map((v) => v.viewerId)
    ),
  ];

  return state.profiles.filter((p) => viewerIds.includes(p.id));
}

export function getUnreadCount(state: MatchAppState): number {
  return state.notifications.filter((n) => !n.read).length;
}

export function getMyMatches(state: MatchAppState): AstroMatch[] {
  const me = state.session?.userId;
  if (!me) return [];
  const blocked = getBlockedIds(state);
  return state.matches.filter((m) => {
    if (m.status === "rejected") return false;
    const other = m.tatuadorId === me ? m.lienzoId : m.tatuadorId;
    if (blocked.has(other)) return false;
    return m.tatuadorId === me || m.lienzoId === me;
  });
}

export function getProfileById(state: MatchAppState, id: string): AstroProfile | undefined {
  return state.profiles.find((p) => p.id === id);
}

export function canAccessChat(state: MatchAppState, matchId: string, userId: string): boolean {
  const match = state.matches.find((m) => m.id === matchId);
  if (!match || match.status !== "matched") return false;
  return match.tatuadorId === userId || match.lienzoId === userId;
}

export function logout(state: MatchAppState): MatchAppState {
  const next = { ...state, session: null };
  saveMatchState(next);
  return next;
}

export async function fileToDataUrl(file: File): Promise<string> {
  if (!isLikelyImageFile(file)) {
    throw new Error("Selecciona una imagen válida");
  }
  const result = await processImageFile(file);
  if (!isValidUrl(result)) {
    throw new Error("No se pudo optimizar la imagen");
  }
  return result;
}

export function getDailyLimitsRemaining(state: MatchAppState) {
  const stats = touchDailyStats(state.session?.stats ?? defaultStats());
  return {
    swipes: Math.max(0, DAILY_LIMITS.swipes - stats.swipesToday),
    superLikes: Math.max(0, DAILY_LIMITS.superLikes - stats.superLikesToday),
    rewinds: Math.max(0, DAILY_LIMITS.rewinds - stats.rewindsToday),
    streak: stats.streak,
  };
}
