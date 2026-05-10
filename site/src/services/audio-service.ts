"use client";

type SoundType = "click" | "glitch" | "transition";

export const AudioService = {
  play: (type: SoundType) => {
    try {
      const audio = new Audio(`/astro/sounds/${type}.mp3`);
      audio.volume = type === "glitch" ? 0.15 : 0.3;
      audio.play().catch(() => {
        // Autoplay policy might block initial sound
        console.debug("Audio playback blocked by browser policy");
      });
    } catch (e) {
      console.error("Audio error:", e);
    }
  }
};
