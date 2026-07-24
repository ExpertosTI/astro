export type UserRole = "tatuador" | "lienzo";

export type BodyPart =
  | "brazo"
  | "antebrazo"
  | "hombro"
  | "espalda"
  | "pecho"
  | "pierna"
  | "muslo"
  | "mano"
  | "cuello"
  | "otro";

export type DayOfWeek =
  | "lun"
  | "mar"
  | "mie"
  | "jue"
  | "vie"
  | "sab"
  | "dom";

export type TimeSlot = "manana" | "tarde" | "noche";

export type BadgeId =
  | "perfil_completo"
  | "primer_match"
  | "veterano"
  | "lienzo_verificado"
  | "artista_destacado"
  | "early_adopter"
  | "super_activo"
  | "racha_7"
  | "super_like_pro";

export type Badge = {
  id: BadgeId;
  label: string;
  emoji: string;
  description: string;
};

export type AvailabilitySlot = {
  day: DayOfWeek;
  slots: TimeSlot[];
};

export type BodyPartPhoto = {
  part: BodyPart;
  url: string;
};

export type AstroProfile = {
  id: string;
  role: UserRole;
  displayName: string;
  bio: string;
  city: string;
  avatarUrl: string;
  portfolioUrls: string[];
  bodyParts: BodyPart[];
  bodyPartPhotos: BodyPartPhoto[];
  availability: AvailabilitySlot[];
  badges: BadgeId[];
  /** Lienzo: disposición a pagar por sesión */
  willingToPay: boolean;
  budgetMin: number | null;
  budgetMax: number | null;
  /** Tatuador: mínimo por sesión o abierto a DM */
  sessionMinRate: number | null;
  rateOpenToDiscuss: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SwipeAction = "like" | "pass" | "superlike";

export type SwipeRecord = {
  id: string;
  fromUserId: string;
  toUserId: string;
  action: SwipeAction;
  createdAt: string;
};

export type MatchStatus = "pending" | "matched" | "rejected";

export type AstroMatch = {
  id: string;
  tatuadorId: string;
  lienzoId: string;
  status: MatchStatus;
  initiatedBy: string;
  isSuperLike: boolean;
  createdAt: string;
  matchedAt?: string;
};

export type MessageReactions = Record<string, string[]>;

export type ChatMessage = {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  createdAt: string;
  readAt?: string;
  reactions?: MessageReactions;
};

export type TypingRecord = {
  matchId: string;
  userId: string;
  updatedAt: string;
};

export type PushPlatform = "web" | "android" | "ios";

export type PushSubscriptionRecord = {
  id: string;
  userId: string;
  token: string;
  platform: PushPlatform;
  updatedAt: string;
};

export type MatchPreferences = {
  sound: boolean;
  haptics: boolean;
  push: boolean;
  typingFx: boolean;
};

export type UserStats = {
  streak: number;
  lastActiveDate: string;
  swipesToday: number;
  swipesDate: string;
  superLikesToday: number;
  superLikesDate: string;
  rewindsToday: number;
  rewindsDate: string;
  totalSwipes: number;
  totalMatches: number;
  profileViewsReceived: number;
};

export type MatchSession = {
  userId: string;
  profile: AstroProfile;
  stats: UserStats;
  token: string;
  expiresAt: string;
};

export type NotificationType =
  | "match"
  | "superlike"
  | "pending"
  | "view"
  | "message";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedUserId?: string;
  relatedMatchId?: string;
  read: boolean;
  createdAt: string;
};

export type DiscoverFilters = {
  city: string;
  bodyPart: BodyPart | "";
};

export type BlockedRecord = {
  userId: string;
  reason: string;
  blockedAt: string;
};

export type ProfileView = {
  viewerId: string;
  viewedId: string;
  createdAt: string;
};

export type MatchAppState = {
  session: MatchSession | null;
  profiles: AstroProfile[];
  swipes: SwipeRecord[];
  matches: AstroMatch[];
  messages: ChatMessage[];
  notifications: AppNotification[];
  blocked: BlockedRecord[];
  profileViews: ProfileView[];
  filters: DiscoverFilters;
  lastSwipe: SwipeRecord | null;
};

export const REACTION_EMOJIS = ["❤️", "🔥", "😂", "👍", "😮", "🎨"] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export const DAILY_LIMITS = {
  superLikes: 3,
  rewinds: 1,
  swipes: 100,
  messagesPerMinute: 20,
} as const;
