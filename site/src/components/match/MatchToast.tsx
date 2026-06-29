"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { AppNotification } from "@/types/match";
import { NOTIFICATION_META } from "@/lib/chat-utils";
import styles from "@/app/match/match.module.css";

type Props = {
  toast: AppNotification | null;
  onDismiss: () => void;
};

export function MatchToast({ toast, onDismiss }: Props) {
  const href =
    toast?.relatedMatchId && (toast.type === "match" || toast.type === "message")
      ? `/match/chat/?id=${toast.relatedMatchId}`
      : "/match/activity/";

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          className={styles.matchToast}
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
        >
          <Link href={href} className={styles.matchToastLink} onClick={onDismiss}>
            <span className={styles.matchToastIcon}>
              {NOTIFICATION_META[toast.type].icon}
            </span>
            <div>
              <p className={styles.matchToastTitle}>{toast.title}</p>
              <p className={styles.matchToastBody}>{toast.body}</p>
            </div>
          </Link>
          <button
            type="button"
            className={styles.matchToastClose}
            onClick={onDismiss}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
