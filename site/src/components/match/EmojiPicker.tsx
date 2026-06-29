"use client";

import { CHAT_EMOJIS } from "@/lib/chat-utils";
import styles from "@/app/match/match.module.css";

type Props = {
  open: boolean;
  onToggle: () => void;
  onSelect: (emoji: string) => void;
};

export function EmojiPicker({ open, onToggle, onSelect }: Props) {
  return (
    <div className={styles.emojiWrap}>
      <button
        type="button"
        className={styles.emojiToggle}
        onClick={onToggle}
        aria-label="Emojis"
        aria-expanded={open}
      >
        😊
      </button>
      {open && (
        <div className={styles.emojiPanel} role="listbox" aria-label="Emojis">
          {CHAT_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={styles.emojiBtn}
              onClick={() => onSelect(emoji)}
              aria-label={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
