import { loadMatchPreferences } from "@/lib/match-settings";
import { triggerNativeHaptic } from "@/lib/astro-native";

export type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

export async function triggerHaptic(type: HapticType): Promise<void> {
  if (!loadMatchPreferences().haptics) return;
  await triggerNativeHaptic(type);
}
