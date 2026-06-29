"use client";

import styles from "@/app/match/match.module.css";

type Props = {
  name: string;
};

export function TypingIndicator({ name }: Props) {
  return (
    <div className={styles.typingRow} aria-live="polite">
      <div className={styles.typingBubble}>
        <span className={styles.typingDots}>
          <span />
          <span />
          <span />
        </span>
      </div>
      <span className={styles.typingLabel}>{name} está escribiendo…</span>
    </div>
  );
}
