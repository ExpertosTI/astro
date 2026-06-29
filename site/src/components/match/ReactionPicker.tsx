"use client";

import { REACTION_EMOJIS } from "@/types/match";
import styles from "@/app/match/match.module.css";

type Props = {
  open: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

export function ReactionPicker({ open, onSelect, onClose }: Props) {
  if (!open) return null;

  return (
    <div className={styles.reactionPickerBackdrop} onClick={onClose} role="presentation">
      <div
        className={styles.reactionPicker}
        onClick={(e) => e.stopPropagation()}
        role="toolbar"
        aria-label="Reacciones"
      >
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={styles.reactionPickerBtn}
            onClick={() => onSelect(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
