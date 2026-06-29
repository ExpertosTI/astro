"use client";

import { useEffect, useRef, useState } from "react";
import { splitMessageSegments } from "@/lib/chat-utils";
import styles from "@/app/match/match.module.css";

type Props = {
  text: string;
  mine: boolean;
  time: string;
  readAt?: string;
  animate?: boolean;
};

export function ChatBubble({ text, mine, time, readAt, animate = false }: Props) {
  const [visible, setVisible] = useState(animate ? "" : text);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (!animate || animatedRef.current) {
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

  return (
    <div
      className={`${styles.chatBubble} ${
        mine ? styles.chatBubbleMine : styles.chatBubbleTheirs
      } ${animate ? styles.chatBubbleAnimate : ""}`}
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
  );
}
