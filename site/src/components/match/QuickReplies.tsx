"use client";

import { QUICK_REPLIES } from "@/lib/match-constants";
import styles from "@/app/match/match.module.css";

type Props = {
  onSelect: (text: string) => void;
};

export function QuickReplies({ onSelect }: Props) {
  return (
    <div className={styles.quickReplies}>
      {QUICK_REPLIES.map((text) => (
        <button key={text} type="button" className={styles.quickReplyBtn} onClick={() => onSelect(text)}>
          {text}
        </button>
      ))}
    </div>
  );
}
