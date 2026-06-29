"use client";

import styles from "@/app/match/match.module.css";

export function MatchAmbient() {
  return (
    <div className={styles.ambient} aria-hidden>
      <span className={styles.ambientOrb1} />
      <span className={styles.ambientOrb2} />
      <span className={styles.ambientOrb3} />
      <span className={styles.ambientGrid} />
    </div>
  );
}
