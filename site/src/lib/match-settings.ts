import type { MatchPreferences } from "@/types/match";

const PREFS_KEY = "astro-match-prefs";

export const DEFAULT_MATCH_PREFS: MatchPreferences = {
  sound: true,
  haptics: true,
  push: true,
  typingFx: true,
};

export function loadMatchPreferences(): MatchPreferences {
  if (typeof window === "undefined") return DEFAULT_MATCH_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_MATCH_PREFS;
    return { ...DEFAULT_MATCH_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_MATCH_PREFS;
  }
}

export function saveMatchPreferences(prefs: MatchPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function updateMatchPreference<K extends keyof MatchPreferences>(
  key: K,
  value: MatchPreferences[K]
): MatchPreferences {
  const next = { ...loadMatchPreferences(), [key]: value };
  saveMatchPreferences(next);
  return next;
}
