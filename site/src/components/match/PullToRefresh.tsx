"use client";

import { useRef, useState, type ReactNode } from "react";
import styles from "@/app/match/match.module.css";

type Props = {
  onRefresh: () => Promise<void>;
  children: ReactNode;
};

export function PullToRefresh({ onRefresh, children }: Props) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY > 8) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setPull(Math.min(delta * 0.45, 72));
  };

  const onTouchEnd = async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pull > 56 && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPull(0);
  };

  return (
    <div
      className={styles.pullWrap}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={() => void onTouchEnd()}
    >
      <div
        className={styles.pullIndicator}
        style={{
          height: pull,
          opacity: pull > 8 ? 1 : 0,
        }}
      >
        <span className={refreshing ? styles.pullSpin : ""}>
          {refreshing ? "↻" : pull > 56 ? "Suelta" : "↓"}
        </span>
      </div>
      {children}
    </div>
  );
}
