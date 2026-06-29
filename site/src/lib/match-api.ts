import { ASTRO_CONFIG } from "@/config/astro-config";
import type {
  AstroMatch,
  AstroProfile,
  ChatMessage,
  SwipeRecord,
} from "@/types/match";

const API_URL = process.env.NEXT_PUBLIC_INSFORGE_API_URL ?? "/api/insforge";
const PROJECT_ID = ASTRO_CONFIG.project.id;

const JSON_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

type RemoteProfile = {
  id: string;
  project_id: string;
  role: string;
  display_name: string;
  bio: string;
  city: string;
  avatar_url: string;
  portfolio_urls: unknown;
  body_parts: unknown;
  body_part_photos: unknown;
  availability: unknown;
  badges: unknown;
  created_at: string;
  updated_at: string;
};

type RemoteSwipe = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  action: string;
  created_at: string;
};

type RemoteConnection = {
  id: string;
  tatuador_id: string;
  lienzo_id: string;
  status: string;
  initiated_by: string;
  is_super_like: boolean;
  created_at: string;
  matched_at: string | null;
};

type RemoteMessage = {
  id: string;
  match_id: string;
  sender_id: string;
  text: string;
  created_at: string;
};

export type MatchRemoteBundle = {
  profiles: AstroProfile[];
  swipes: SwipeRecord[];
  matches: AstroMatch[];
  messages: ChatMessage[];
};

export type ApiHealth = {
  online: boolean;
  tablesReady: boolean;
  error?: string;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function profileFromRemote(row: RemoteProfile): AstroProfile {
  return {
    id: row.id,
    role: row.role as AstroProfile["role"],
    displayName: row.display_name,
    bio: row.bio ?? "",
    city: row.city ?? "",
    avatarUrl: row.avatar_url ?? "",
    portfolioUrls: asArray<string>(row.portfolio_urls),
    bodyParts: asArray<AstroProfile["bodyParts"][number]>(row.body_parts),
    bodyPartPhotos: asArray<AstroProfile["bodyPartPhotos"][number]>(row.body_part_photos),
    availability: asArray<AstroProfile["availability"][number]>(row.availability),
    badges: asArray<AstroProfile["badges"][number]>(row.badges),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function profileToRemote(profile: AstroProfile): RemoteProfile {
  return {
    id: profile.id,
    project_id: PROJECT_ID,
    role: profile.role,
    display_name: profile.displayName,
    bio: profile.bio,
    city: profile.city,
    avatar_url: profile.avatarUrl,
    portfolio_urls: profile.portfolioUrls,
    body_parts: profile.bodyParts,
    body_part_photos: profile.bodyPartPhotos,
    availability: profile.availability,
    badges: profile.badges,
    created_at: profile.createdAt,
    updated_at: new Date().toISOString(),
  };
}

async function apiGet<T>(path: string): Promise<T[]> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GET ${path} → ${response.status}`);
  return response.json();
}

async function apiUpsert(path: string, rows: unknown[]): Promise<boolean> {
  if (!rows.length) return true;
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      ...JSON_HEADERS,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`POST ${path} → ${response.status}: ${detail.slice(0, 200)}`);
  }
  return true;
}

export async function checkMatchApiHealth(): Promise<ApiHealth> {
  try {
    const response = await fetch(
      `${API_URL}/match_profiles?project_id=eq.${PROJECT_ID}&limit=1`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    if (response.ok) return { online: true, tablesReady: true };
    const detail = await response.text();
    const tablesReady = !detail.includes("does not exist") && !detail.includes("42P01");
    return {
      online: false,
      tablesReady,
      error: tablesReady
        ? `API ${response.status}`
        : "Tablas Match no creadas. Ejecuta scripts/apply-match-schema.sh en el servidor.",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "API error";
    return { online: false, tablesReady: false, error: message };
  }
}

export async function fetchMatchBundle(since?: string): Promise<MatchRemoteBundle> {
  const msgSince = since ? `&created_at=gt.${encodeURIComponent(since)}` : "";

  const [profiles, swipes, connections, messages] = await Promise.all([
    apiGet<RemoteProfile>(
      `/match_profiles?project_id=eq.${PROJECT_ID}&order=updated_at.desc&limit=500`
    ),
    apiGet<RemoteSwipe>(
      `/match_swipes?project_id=eq.${PROJECT_ID}&order=created_at.desc&limit=2000`
    ),
    apiGet<RemoteConnection>(
      `/match_connections?project_id=eq.${PROJECT_ID}&order=created_at.desc&limit=1000`
    ),
    apiGet<RemoteMessage>(
      `/match_messages?project_id=eq.${PROJECT_ID}&order=created_at.asc&limit=3000${msgSince}`
    ),
  ]);

  return {
    profiles: profiles.map(profileFromRemote),
    swipes: swipes.map((s) => ({
      id: s.id,
      fromUserId: s.from_user_id,
      toUserId: s.to_user_id,
      action: s.action as SwipeRecord["action"],
      createdAt: s.created_at,
    })),
    matches: connections.map((m) => ({
      id: m.id,
      tatuadorId: m.tatuador_id,
      lienzoId: m.lienzo_id,
      status: m.status as AstroMatch["status"],
      initiatedBy: m.initiated_by,
      isSuperLike: m.is_super_like,
      createdAt: m.created_at,
      matchedAt: m.matched_at ?? undefined,
    })),
    messages: messages.map((msg) => ({
      id: msg.id,
      matchId: msg.match_id,
      senderId: msg.sender_id,
      text: msg.text,
      createdAt: msg.created_at,
    })),
  };
}

export async function pushProfile(profile: AstroProfile): Promise<boolean> {
  return apiUpsert("/match_profiles", [profileToRemote(profile)]);
}

export async function pushSwipe(swipe: SwipeRecord): Promise<boolean> {
  return apiUpsert("/match_swipes", [
    {
      id: swipe.id,
      project_id: PROJECT_ID,
      from_user_id: swipe.fromUserId,
      to_user_id: swipe.toUserId,
      action: swipe.action,
      created_at: swipe.createdAt,
    },
  ]);
}

export async function pushMatch(match: AstroMatch): Promise<boolean> {
  return apiUpsert("/match_connections", [
    {
      id: match.id,
      project_id: PROJECT_ID,
      tatuador_id: match.tatuadorId,
      lienzo_id: match.lienzoId,
      status: match.status,
      initiated_by: match.initiatedBy,
      is_super_like: match.isSuperLike,
      created_at: match.createdAt,
      matched_at: match.matchedAt ?? null,
    },
  ]);
}

export async function pushMessage(message: ChatMessage): Promise<boolean> {
  return apiUpsert("/match_messages", [
    {
      id: message.id,
      project_id: PROJECT_ID,
      match_id: message.matchId,
      sender_id: message.senderId,
      text: message.text,
      created_at: message.createdAt,
    },
  ]);
}

export async function pushFullState(snapshot: {
  profile?: AstroProfile;
  swipes?: SwipeRecord[];
  matches?: AstroMatch[];
  messages?: ChatMessage[];
}): Promise<void> {
  const tasks: Promise<boolean>[] = [];
  if (snapshot.profile) tasks.push(pushProfile(snapshot.profile));
  if (snapshot.swipes?.length) {
    for (const s of snapshot.swipes) tasks.push(pushSwipe(s));
  }
  if (snapshot.matches?.length) {
    for (const m of snapshot.matches) tasks.push(pushMatch(m));
  }
  if (snapshot.messages?.length) {
    for (const msg of snapshot.messages) tasks.push(pushMessage(msg));
  }
  await Promise.all(tasks);
}
