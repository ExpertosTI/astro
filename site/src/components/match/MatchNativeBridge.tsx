"use client";

import { useEffect } from "react";
import { initMatchNativeShell } from "@/lib/match-native";
import { initNativePush, registerMatchServiceWorker } from "@/lib/match-push";
import { unlockAudio } from "@/lib/match-sfx";

type Props = {
  userId?: string;
};

export function MatchNativeBridge({ userId }: Props) {
  useEffect(() => {
    void initMatchNativeShell();
    void registerMatchServiceWorker();

    const unlock = () => {
      unlockAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
  }, []);

  useEffect(() => {
    if (!userId) return;
    void initNativePush(userId);
  }, [userId]);

  return null;
}
