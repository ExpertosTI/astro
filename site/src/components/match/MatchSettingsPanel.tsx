"use client";

import { useEffect, useState } from "react";
import type { MatchPreferences } from "@/types/match";
import {
  DEFAULT_MATCH_PREFS,
  loadMatchPreferences,
  saveMatchPreferences,
} from "@/lib/match-settings";
import {
  registerMatchServiceWorker,
  requestPushPermission,
  subscribeWebPush,
} from "@/lib/match-push";
import { playMatchSfx, unlockAudio } from "@/lib/match-sfx";
import { triggerHaptic } from "@/lib/match-haptics";
import styles from "@/app/match/match.module.css";

type Props = {
  userId?: string;
};

export function MatchSettingsPanel({ userId }: Props) {
  const [prefs, setPrefs] = useState<MatchPreferences>(() => {
    if (typeof window !== "undefined") return loadMatchPreferences();
    return DEFAULT_MATCH_PREFS;
  });
  const [pushStatus, setPushStatus] = useState<string>("");

  useEffect(() => {
    void registerMatchServiceWorker();
  }, []);

  const toggle = (key: keyof MatchPreferences) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    saveMatchPreferences(next);
    if (key === "sound" && next.sound) {
      unlockAudio();
      playMatchSfx("tap");
    }
    if (key === "haptics" && next.haptics) void triggerHaptic("light");
  };

  const enablePush = async () => {
    if (!userId) return;
    const perm = await requestPushPermission();
    if (perm !== "granted") {
      setPushStatus("Permiso denegado — actívalo en ajustes del sistema");
      return;
    }
    const ok = await subscribeWebPush(userId);
    setPushStatus(ok ? "Notificaciones activadas ✓" : "No se pudo registrar push");
    const next = { ...prefs, push: true };
    setPrefs(next);
    saveMatchPreferences(next);
  };

  return (
    <div className={styles.settingsPanel}>
      <h2 className={styles.sectionTitle}>⚙ Experiencia</h2>
      <div className={styles.settingsList}>
        <label className={styles.settingRow}>
          <span>Sonidos</span>
          <input type="checkbox" checked={prefs.sound} onChange={() => toggle("sound")} />
        </label>
        <label className={styles.settingRow}>
          <span>Vibración / hápticos</span>
          <input type="checkbox" checked={prefs.haptics} onChange={() => toggle("haptics")} />
        </label>
        <label className={styles.settingRow}>
          <span>Efecto de tipeo en mensajes</span>
          <input type="checkbox" checked={prefs.typingFx} onChange={() => toggle("typingFx")} />
        </label>
        <label className={styles.settingRow}>
          <span>Notificaciones push</span>
          <input type="checkbox" checked={prefs.push} onChange={() => toggle("push")} />
        </label>
      </div>
      {prefs.push && userId && (
        <button type="button" className={styles.secondaryBtn} onClick={() => void enablePush()}>
          Activar notificaciones del sistema
        </button>
      )}
      {pushStatus && <p className={styles.settingHint}>{pushStatus}</p>}
    </div>
  );
}
