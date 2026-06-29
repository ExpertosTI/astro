"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

type SwipeOutcome = { ok: boolean; error?: string; matched?: boolean };

type MatchContextValue = {
  state: MatchAppState;
  ready: boolean;
  discover: AstroProfile[];
  matches: AstroMatch[];
  likesReceived: AstroProfile[];
  profileViewers: AstroProfile[];
  unreadCount: number;
  limits: ReturnType<typeof getDailyLimitsRemaining>;
  register: (role: UserRole, data: Partial<AstroProfile>) => void;
  saveProfile: (data: Partial<AstroProfile>) => void;
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
};

const MatchContext = createContext<MatchContextValue | null>(null);

export function MatchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MatchAppState>(() => loadMatchState());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(loadMatchState());
    setReady(true);
  }, []);

  const register = useCallback((role: UserRole, data: Partial<AstroProfile>) => {
    setState((prev) => createProfile(prev, role, data).state);
  }, []);

  const saveProfile = useCallback((data: Partial<AstroProfile>) => {
    setState((prev) => {
      const id = prev.session?.userId;
      if (!id) return prev;
      return updateProfile(prev, id, data);
    });
  }, []);

  const swipe = useCallback((toUserId: string, action: SwipeAction): SwipeOutcome => {
    let result: SwipeOutcome = { ok: false };
    setState((prev) => {
      const outcome = swipeProfile(prev, toUserId, action);
      result = outcome.error
        ? { ok: false, error: outcome.error }
        : { ok: true, matched: outcome.matched };
      return outcome.state;
    });
    return result;
  }, []);

  const rewind = useCallback((): SwipeOutcome => {
    let result: SwipeOutcome = { ok: false };
    setState((prev) => {
      const outcome = rewindSwipe(prev);
      result = outcome.error ? { ok: false, error: outcome.error } : { ok: true };
      return outcome.state;
    });
    return result;
  }, []);

  const accept = useCallback((matchId: string) => {
    setState((prev) => acceptMatch(prev, matchId));
  }, []);

  const reject = useCallback((matchId: string) => {
    setState((prev) => rejectMatch(prev, matchId));
  }, []);

  const chat = useCallback((matchId: string, text: string): SwipeOutcome => {
    let result: SwipeOutcome = { ok: false };
    setState((prev) => {
      const outcome = sendMessage(prev, matchId, text);
      result = outcome.error ? { ok: false, error: outcome.error } : { ok: true };
      return outcome.state;
    });
    return result;
  }, []);

  const block = useCallback((userId: string, reason: string) => {
    setState((prev) => blockUser(prev, userId, reason));
  }, []);

  const viewProfile = useCallback((userId: string) => {
    setState((prev) => recordProfileView(prev, userId));
  }, []);

  const updateFilters = useCallback((filters: DiscoverFilters) => {
    setState((prev) => setFilters(prev, filters));
  }, []);

  const markRead = useCallback(() => {
    setState((prev) => markNotificationsRead(prev));
  }, []);

  const signOut = useCallback(() => {
    setState((prev) => logoutStore(prev));
  }, []);

  const value = useMemo<MatchContextValue>(
    () => ({
      state,
      ready,
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
    }),
    [
      state,
      ready,
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
    ]
  );

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}

export function useMatch() {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error("useMatch must be used within MatchProvider");
  return ctx;
}
