"use client";

import { useEffect, useRef, useState } from "react";
import { splitMessageSegments } from "@/lib/chat-utils";
import { loadMatchPreferences } from "@/lib/match-settings";
import type { MessageReactions } from "@/types/match";
import styles from "@/app/match/match.module.css";

type Props = {
  text: string;
  mine: boolean;
  time: string;
  readAt?: string;
  animate?: boolean;
  reactions?: MessageReactions;
  myUserId?: string;
  onReact?: () => void;
  onToggleReaction?: (emoji: string) => void;
};

export function ChatBubble({
  text,
  mine,
  time,
  readAt,
  animate = false,
  reactions,
  myUserId,
  onReact,
  onToggleReaction,
}: Props) {
  const [visible, setVisible] = useState(animate ? "" : text);
  const animatedRef = useRef(false);
  const longPressRef = useRef<number | null>(null);

  useEffect(() => {
    const typingFx = loadMatchPreferences().typingFx;
    if (!animate || !typingFx || animatedRef.current) {
      setVisible(text);
      return;
    }

    setVisible("");
    let i = 0;
    let timer = 0;
    const step = () => {
      i += 1;
      setVisible(text.slice(0, i));
      if (i < text.length) {
        const delay = /\s/.test(text[i - 1] ?? "") ? 18 : 12;
        timer = window.setTimeout(step, delay);
      } else {
        animatedRef.current = true;
      }
    };
    timer = window.setTimeout(step, 120);
    return () => window.clearTimeout(timer);
  }, [text, animate]);

  const receipt = mine ? (readAt ? "✓✓" : "✓") : null;
  const reactionEntries = Object.entries(reactions ?? {}).filter(([, users]) => users.length);

  const handlePointerDown = () => {
    if (!onReact) return;
    longPressRef.current = window.setTimeout(() => onReact(), 420);
  };

  const clearLongPress = () => {
    if (longPressRef.current) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  return (
    <div
      className={`${styles.chatBubbleWrap} ${mine ? styles.chatBubbleWrapMine : ""}`}
      onDoubleClick={() => onToggleReaction?.("❤️")}
    >
      <div
        className={`${styles.chatBubble} ${
          mine ? styles.chatBubbleMine : styles.chatBubbleTheirs
        } ${animate ? styles.chatBubbleAnimate : ""}`}
        onPointerDown={handlePointerDown}
        onPointerUp={clearLongPress}
        onPointerLeave={clearLongPress}
        onContextMenu={(e) => {
          e.preventDefault();
          onReact?.();
        }}
      >
        <p className={styles.chatBubbleText}>
          {splitMessageSegments(visible).map((seg, idx) =>
            seg.type === "emoji" ? (
              <span key={idx} className={styles.chatEmoji}>
                {seg.value}
              </span>
            ) : (
              <span key={idx}>{seg.value}</span>
            )
          )}
          {animate && visible.length < text.length && (
            <span className={styles.chatCursor}>|</span>
          )}
        </p>
        <div className={styles.chatMeta}>
          <span>{time}</span>
          {receipt && (
            <span className={readAt ? styles.chatReadDone : styles.chatReadSent}>
              {receipt}
            </span>
          )}
        </div>
      </div>
      {reactionEntries.length > 0 && (
        <div className={styles.reactionRow}>
          {reactionEntries.map(([emoji, users]) => (
            <button
              key={emoji}
              type="button"
              className={`${styles.reactionChip} ${
                myUserId && users.includes(myUserId) ? styles.reactionChipActive : ""
              }`}
              onClick={() => onToggleReaction?.(emoji)}
            >
              {emoji}
              {users.length > 1 && <span className={styles.reactionCount}>{users.length}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
