"use client";

import { useMatch } from "@/components/match/MatchProvider";
import styles from "@/app/match/match.module.css";

export function SyncStatus() {
  const { syncStatus, syncError } = useMatch();

  if (syncStatus === "hidden") return null;

  const label =
    syncStatus === "online"
      ? "● En vivo"
      : syncStatus === "syncing"
        ? "↻ Sincronizando…"
        : "○ Sin conexión";

  return (
    <div
      className={`${styles.syncPill} ${
        syncStatus === "online"
          ? styles.syncOnline
          : syncStatus === "syncing"
            ? styles.syncSyncing
            : styles.syncOffline
      }`}
      title={syncError ?? "Estado de sincronización"}
    >
      {label}
    </div>
  );
}
