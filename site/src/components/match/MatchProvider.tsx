"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { checkMatchApiHealth } from "@/lib/match-api";
import {
  initialCloudSync,
  pullAndMerge,
  syncMutation,
  syncProfileToCloud,
} from "@/lib/match-sync";
import {
  acceptMatch,
  blockUser,
  createProfile,
  getDailyLimitsRemaining,
  getDiscoverProfiles,
  getLikesReceived,
  getMyMatches,
  getProfileById,
  getProfileViewers,
  getUnreadCount,
  loadMatchState,
  logout as logoutStore,
  markNotificationsRead,
  recordProfileView,
  rejectMatch,
  rewindSwipe,
  sendMessage,
  setFilters,
  swipeProfile,
  updateProfile,
} from "@/lib/match-store";
import type {
  AstroMatch,
  AstroProfile,
  DiscoverFilters,
  MatchAppState,
  SwipeAction,
  UserRole,
} from "@/types/match";

export type SyncStatusType = "online" | "syncing" | "offline" | "hidden";

type SwipeOutcome = { ok: boolean; error?: string; matched?: boolean };

type MatchContextValue = {
  state: MatchAppState;
  ready: boolean;
  syncStatus: SyncStatusType;
  syncError?: string;
  discover: AstroProfile[];
  matches: AstroMatch[];
  likesReceived: AstroProfile[];
  profileViewers: AstroProfile[];
  unreadCount: number;
  limits: ReturnType<typeof getDailyLimitsRemaining>;
  register: (role: UserRole, data: Partial<AstroProfile>) => Promise<void>;
  saveProfile: (data: Partial<AstroProfile>) => Promise<void>;
  swipe: (toUserId: string, action: SwipeAction) => SwipeOutcome;
  rewind: () => SwipeOutcome;
  accept: (matchId: string) => void;
  reject: (matchId: string) => void;
  chat: (matchId: string, text: string) => SwipeOutcome;
  block: (userId: string, reason: string) => void;
  viewProfile: (userId: string) => void;
  updateFilters: (filters: DiscoverFilters) => void;
  markRead: () => void;
  signOut: () => void;
  getProfile: (id: string) => AstroProfile | undefined;
  refreshNow: () => Promise<void>;
};

const MatchContext = createContext<MatchContextValue | null>(null);

const POLL_MS = 3000;

export function MatchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MatchAppState>(() => loadMatchState());
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>("syncing");
  const [syncError, setSyncError] = useState<string>();
  const stateRef = useRef(state);
  const syncingRef = useRef(false);

  stateRef.current = state;

  const runPull = useCallback(async (base?: MatchAppState) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncStatus((s) => (s === "offline" ? "offline" : "syncing"));
    try {
      const health = await checkMatchApiHealth();
      if (!health.online) {
        setSyncStatus("offline");
        setSyncError(health.error ?? "API no disponible. Ejecuta match-schema.sql en el servidor.");
        return;
      }
      const merged = await pullAndMerge(base ?? stateRef.current);
      setState(merged);
      setSyncStatus("online");
      setSyncError(undefined);
    } catch (err) {
      setSyncStatus("offline");
      setSyncError(err instanceof Error ? err.message : "Error de sincronización");
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadMatchState();
      setState(local);
      try {
        const merged = await initialCloudSync(local);
        if (!cancelled) {
          setState(merged);
          setSyncStatus("online");
        }
      } catch (err) {
        if (!cancelled) {
          setSyncStatus("offline");
          setSyncError(err instanceof Error ? err.message : "Sin conexión al servidor");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || !state.session) return;

    const tick = () => {
      if (document.visibilityState === "visible") void runPull();
    };

    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [ready, state.session, runPull]);

  const afterMutation = useCallback(
    async (next: MatchAppState, patch: Parameters<typeof syncMutation>[1]) => {
      setSyncStatus("syncing");
      try {
        await syncMutation(next, patch);
        await runPull(next);
      } catch {
        setSyncStatus("offline");
      }
    },
    [runPull]
  );

  const register = useCallback(
    async (role: UserRole, data: Partial<AstroProfile>) => {
      const { state: next, profile } = createProfile(stateRef.current, role, data);
      setState(next);
      setSyncStatus("syncing");
      try {
        const ok = await syncProfileToCloud(profile);
        if (!ok) throw new Error("No se pudo publicar tu perfil");
        const merged = await pullAndMerge(next);
        setState(merged);
        setSyncStatus("online");
      } catch (err) {
        setSyncStatus("offline");
        setSyncError(err instanceof Error ? err.message : "Error al publicar");
        throw err;
      }
    },
    []
  );

  const saveProfile = useCallback(async (data: Partial<AstroProfile>) => {
    const id = stateRef.current.session?.userId;
    if (!id) return;
    const next = updateProfile(stateRef.current, id, data);
    const profile = next.session?.profile;
    if (profile) await afterMutation(next, { profile });
    else setState(next);
  }, [afterMutation]);

  const swipe = useCallback((toUserId: string, action: SwipeAction): SwipeOutcome => {
    const prev = stateRef.current;
    const outcome = swipeProfile(prev, toUserId, action);
    if (outcome.error) return { ok: false, error: outcome.error };

    const next = outcome.state;
    setState(next);

    const newSwipe = next.swipes.find((s) => !prev.swipes.some((p) => p.id === s.id));
    const newMatch = next.matches.find((m) => !prev.matches.some((p) => p.id === m.id));
    void afterMutation(next, { swipe: newSwipe, match: newMatch });

    return { ok: true, matched: outcome.matched };
  }, [afterMutation]);

  const rewind = useCallback((): SwipeOutcome => {
    const outcome = rewindSwipe(stateRef.current);
    if (outcome.error) return { ok: false, error: outcome.error };
    setState(outcome.state);
    void runPull(outcome.state);
    return { ok: true };
  }, [runPull]);

  const accept = useCallback((matchId: string) => {
    const prev = stateRef.current;
    const next = acceptMatch(prev, matchId);
    setState(next);
    const match = next.matches.find((m) => m.id === matchId);
    void afterMutation(next, { match });
  }, [afterMutation]);

  const reject = useCallback((matchId: string) => {
    const next = rejectMatch(stateRef.current, matchId);
    setState(next);
    const match = next.matches.find((m) => m.id === matchId);
    void afterMutation(next, { match });
  }, [afterMutation]);

  const chat = useCallback((matchId: string, text: string): SwipeOutcome => {
    const outcome = sendMessage(stateRef.current, matchId, text);
    if (outcome.error) return { ok: false, error: outcome.error };
    setState(outcome.state);
    const msg = outcome.state.messages[outcome.state.messages.length - 1];
    void afterMutation(outcome.state, { message: msg });
    return { ok: true };
  }, [afterMutation]);

  const block = useCallback((userId: string, reason: string) => {
    setState(blockUser(stateRef.current, userId, reason));
  }, []);

  const viewProfile = useCallback((userId: string) => {
    setState(recordProfileView(stateRef.current, userId));
  }, []);

  const updateFilters = useCallback((filters: DiscoverFilters) => {
    setState(setFilters(stateRef.current, filters));
  }, []);

  const markRead = useCallback(() => {
    setState(markNotificationsRead(stateRef.current));
  }, []);

  const signOut = useCallback(() => {
    setState(logoutStore(stateRef.current));
  }, []);

  const refreshNow = useCallback(async () => {
    await runPull();
  }, [runPull]);

  const value = useMemo<MatchContextValue>(
    () => ({
      state,
      ready,
      syncStatus,
      syncError,
      discover: getDiscoverProfiles(state),
      matches: getMyMatches(state),
      likesReceived: getLikesReceived(state),
      profileViewers: getProfileViewers(state),
      unreadCount: getUnreadCount(state),
      limits: getDailyLimitsRemaining(state),
      register,
      saveProfile,
      swipe,
      rewind,
      accept,
      reject,
      chat,
      block,
      viewProfile,
      updateFilters,
      markRead,
      signOut,
      getProfile: (id) => getProfileById(state, id),
      refreshNow,
    }),
    [
      state,
      ready,
      syncStatus,
      syncError,
      register,
      saveProfile,
      swipe,
      rewind,
      accept,
      reject,
      chat,
      block,
      viewProfile,
      updateFilters,
      markRead,
      signOut,
      refreshNow,
    ]
  );

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}

export function useMatch() {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error("useMatch must be used within MatchProvider");
  return ctx;
}
