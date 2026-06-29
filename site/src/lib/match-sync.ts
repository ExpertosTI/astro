import {
  fetchMatchBundle,
  pushFullState,
  pushMatch,
  pushMessage,
  pushProfile,
  pushSwipe,
  pushTyping,
  type MatchRemoteBundle,
} from "@/lib/match-api";
import { computeProfileBadges } from "@/lib/badges";
import { saveMatchState } from "@/lib/match-store";
import type {
  AppNotification,
  AstroMatch,
  AstroProfile,
  ChatMessage,
  MatchAppState,
  SwipeRecord,
  TypingRecord,
} from "@/types/match";

const SYNC_TS_KEY = "astro-match-last-sync";

function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of [...local, ...remote]) {
    map.set(item.id, item);
  }
  return [...map.values()];
}

function mergeReactions(
  a?: ChatMessage["reactions"],
  b?: ChatMessage["reactions"]
): ChatMessage["reactions"] {
  const out: NonNullable<ChatMessage["reactions"]> = { ...(a ?? {}) };
  for (const [emoji, users] of Object.entries(b ?? {})) {
    out[emoji] = [...new Set([...(out[emoji] ?? []), ...users])];
  }
  return Object.keys(out).length ? out : undefined;
}

function mergeMessages(local: ChatMessage[], remote: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const m of [...local, ...remote]) {
    const prev = map.get(m.id);
    if (!prev) {
      map.set(m.id, m);
      continue;
    }
    const readAt =
      prev.readAt && m.readAt
        ? new Date(prev.readAt) > new Date(m.readAt)
          ? prev.readAt
          : m.readAt
        : prev.readAt ?? m.readAt;
    map.set(m.id, {
      ...prev,
      ...m,
      readAt,
      reactions: mergeReactions(prev.reactions, m.reactions),
    });
  }
  return [...map.values()];
}

function mergeProfiles(local: AstroProfile[], remote: AstroProfile[]): AstroProfile[] {
  const map = new Map<string, AstroProfile>();
  for (const p of [...local, ...remote]) {
    const prev = map.get(p.id);
    if (!prev || new Date(p.updatedAt).getTime() >= new Date(prev.updatedAt).getTime()) {
      map.set(p.id, p);
    }
  }
  return [...map.values()].map((p) => ({
    ...p,
    badges: computeProfileBadges(p),
  }));
}

function detectNewActivity(
  prev: MatchAppState,
  next: MatchAppState,
  userId: string | undefined
): AppNotification[] {
  if (!userId) return [];
  const notifications = [...next.notifications];

  const prevMatchIds = new Set(prev.matches.map((m) => m.id));
  for (const m of next.matches) {
    if (prevMatchIds.has(m.id)) continue;
    const otherId = m.tatuadorId === userId ? m.lienzoId : m.tatuadorId;
    const other = next.profiles.find((p) => p.id === otherId);
    if (m.status === "matched") {
      notifications.unshift({
        id: `sync-match-${m.id}`,
        type: "match",
        title: "¡Nuevo match en vivo!",
        body: other ? `Conectaste con ${other.displayName}` : "Nueva conexión",
        relatedUserId: otherId,
        relatedMatchId: m.id,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  const prevMsgIds = new Set(prev.messages.map((m) => m.id));
  for (const msg of next.messages) {
    if (prevMsgIds.has(msg.id) || msg.senderId === userId) continue;
    const sender = next.profiles.find((p) => p.id === msg.senderId);
    notifications.unshift({
      id: `sync-msg-${msg.id}`,
      type: "message",
      title: "Nuevo mensaje",
      body: `${sender?.displayName ?? "Alguien"}: ${msg.text.slice(0, 60)}`,
      relatedUserId: msg.senderId,
      relatedMatchId: msg.matchId,
      read: false,
      createdAt: msg.createdAt,
    });
  }

  const prevSwipeKeys = new Set(
    prev.swipes.map((s) => `${s.fromUserId}:${s.toUserId}`)
  );
  for (const s of next.swipes) {
    if (s.toUserId !== userId || s.action === "pass") continue;
    const key = `${s.fromUserId}:${s.toUserId}`;
    if (prevSwipeKeys.has(key)) continue;
    const liker = next.profiles.find((p) => p.id === s.fromUserId);
    notifications.unshift({
      id: `sync-like-${s.id}`,
      type: s.action === "superlike" ? "superlike" : "pending",
      title: s.action === "superlike" ? "⭐ Super Like recibido" : "Alguien te dio like",
      body: liker ? `${liker.displayName} quiere conectar` : "Revisa tu actividad",
      relatedUserId: s.fromUserId,
      read: false,
      createdAt: s.createdAt,
    });
  }

  return notifications.slice(0, 50);
}

export function mergeRemoteIntoState(
  local: MatchAppState,
  remote: MatchRemoteBundle
): MatchAppState {
  const profiles = mergeProfiles(
    local.profiles.filter((p) => !p.id.startsWith("seed-")),
    remote.profiles
  );

  const swipes = mergeById(local.swipes, remote.swipes) as SwipeRecord[];
  const matches = mergeById(local.matches, remote.matches) as AstroMatch[];
  const messages = mergeMessages(local.messages, remote.messages);

  let session = local.session;
  if (session) {
    const fresh = profiles.find((p) => p.id === session!.userId);
    if (fresh) session = { ...session, profile: fresh };
  }

  const merged: MatchAppState = {
    ...local,
    profiles,
    swipes,
    matches,
    messages,
    session,
  };

  const notifications = detectNewActivity(local, merged, session?.userId);
  return {
    ...merged,
    notifications: mergeById(local.notifications, notifications) as AppNotification[],
  };
}

export async function pullAndMerge(
  state: MatchAppState
): Promise<{ state: MatchAppState; typing: TypingRecord[] }> {
  const since = typeof window !== "undefined"
    ? localStorage.getItem(SYNC_TS_KEY) ?? undefined
    : undefined;

  const remote = await fetchMatchBundle(since);
  const merged = mergeRemoteIntoState(state, remote);

  if (typeof window !== "undefined") {
    localStorage.setItem(SYNC_TS_KEY, new Date().toISOString());
  }
  saveMatchState(merged);
  return { state: merged, typing: remote.typing };
}

export async function syncProfileToCloud(profile: AstroProfile): Promise<boolean> {
  return pushProfile(profile);
}

export async function syncMutation(
  state: MatchAppState,
  patch: {
    profile?: AstroProfile;
    swipe?: SwipeRecord;
    match?: AstroMatch;
    message?: ChatMessage;
    messages?: ChatMessage[];
    typing?: TypingRecord;
  }
): Promise<void> {
  const tasks: Promise<boolean>[] = [];
  if (patch.profile) tasks.push(pushProfile(patch.profile));
  if (patch.swipe) tasks.push(pushSwipe(patch.swipe));
  if (patch.match) tasks.push(pushMatch(patch.match));
  if (patch.message) tasks.push(pushMessage(patch.message));
  if (patch.messages?.length) {
    for (const m of patch.messages) tasks.push(pushMessage(m));
  }
  if (patch.typing) tasks.push(pushTyping(patch.typing));
  await Promise.all(tasks);

  if (state.session?.profile && !patch.profile) {
    await pushProfile(state.session.profile);
  }
}

export async function initialCloudSync(
  state: MatchAppState
): Promise<{ state: MatchAppState; typing: TypingRecord[] }> {
  if (state.session?.profile) {
    await pushFullState({
      profile: state.session.profile,
      swipes: state.swipes.filter((s) => s.fromUserId === state.session!.userId),
      matches: state.matches.filter(
        (m) => m.tatuadorId === state.session!.userId || m.lienzoId === state.session!.userId
      ),
      messages: state.messages.filter((m) => {
        const match = state.matches.find((x) => x.id === m.matchId);
        return match && (
          match.tatuadorId === state.session!.userId || match.lienzoId === state.session!.userId
        );
      }),
    });
  }
  return pullAndMerge(state);
}
