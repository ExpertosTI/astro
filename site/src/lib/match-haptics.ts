import { loadMatchPreferences } from "@/lib/match-settings";

export type HapticType = "light" | "medium" | "heavy" | "success" | "selection";

const VIBRATE: Record<HapticType, number | number[]> = {
  light: 8,
  medium: 16,
  heavy: 28,
  success: [12, 40, 18],
  selection: 6,
};

async function capacitorImpact(style: "Light" | "Medium" | "Heavy"): Promise<void> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const map = { Light: ImpactStyle.Light, Medium: ImpactStyle.Medium, Heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: map[style] });
  } catch {
    /* web fallback below */
  }
}

export async function triggerHaptic(type: HapticType): Promise<void> {
  if (!loadMatchPreferences().haptics) return;

  if (type === "light") await capacitorImpact("Light");
  else if (type === "medium") await capacitorImpact("Medium");
  else if (type === "heavy" || type === "success") await capacitorImpact("Heavy");
  else await capacitorImpact("Light");

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(VIBRATE[type]);
  }
}
