"use client";

import { useEffect, useState } from "react";
import styles from "@/app/match/match.module.css";

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !deferred) return null;

  const install = async () => {
    await deferred.prompt();
    setVisible(false);
    setDeferred(null);
  };

  return (
    <div className={styles.installBanner}>
      <div>
        <p className={styles.installTitle}>Instala ASTRO</p>
        <p className={styles.installBody}>Acceso rápido como app en tu teléfono</p>
      </div>
      <div className={styles.installActions}>
        <button type="button" className={styles.miniBtn} onClick={() => setVisible(false)}>
          Luego
        </button>
        <button type="button" className={styles.primaryBtn} onClick={() => void install()}>
          Instalar
        </button>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}
