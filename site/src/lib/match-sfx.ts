import { loadMatchPreferences } from "@/lib/match-settings";

export type SfxType = "send" | "message" | "match" | "swipe" | "superlike" | "tap";

const SFX_MAP: Record<SfxType, string> = {
  send: "/astro/sfx/click.mp3",
  message: "/astro/sfx/type.mp3",
  match: "/astro/sfx/transition.mp3",
  swipe: "/astro/sfx/click.mp3",
  superlike: "/astro/sfx/glitch.mp3",
  tap: "/astro/sfx/click.mp3",
};

const VOLUME: Record<SfxType, number> = {
  send: 0.35,
  message: 0.28,
  match: 0.45,
  swipe: 0.22,
  superlike: 0.38,
  tap: 0.18,
};

let unlocked = false;

export function unlockAudio(): void {
  unlocked = true;
}

export function playMatchSfx(type: SfxType): void {
  if (!loadMatchPreferences().sound) return;
  try {
    const audio = new Audio(SFX_MAP[type]);
    audio.volume = VOLUME[type];
    void audio.play().catch(() => {
      if (!unlocked) return;
    });
  } catch {
    /* ignore */
  }
}

export function playMatchChord(): void {
  if (!loadMatchPreferences().sound || typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02 + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35 + i * 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.04);
      osc.stop(ctx.currentTime + 0.5);
    });
    window.setTimeout(() => void ctx.close(), 700);
  } catch {
    playMatchSfx("match");
  }
}
