"use client";

import Link from "next/link";
import type { AppNotification } from "@/types/match";
import {
  formatRelativeTime,
  groupNotificationsByDay,
  NOTIFICATION_META,
} from "@/lib/chat-utils";
import styles from "@/app/match/match.module.css";

type Props = {
  notifications: AppNotification[];
  onMarkRead?: () => void;
};

function notificationHref(n: AppNotification): string | null {
  if (n.relatedMatchId && (n.type === "match" || n.type === "message")) {
    return `/match/chat/?id=${n.relatedMatchId}`;
  }
  if (n.type === "pending" || n.type === "superlike") {
    return "/match/matches/";
  }
  return "/match/activity/";
}

export function NotificationFeed({ notifications, onMarkRead }: Props) {
  const groups = groupNotificationsByDay(notifications.slice(0, 24));

  if (!notifications.length) {
    return <p className={styles.activityEmpty}>Sin notificaciones aún.</p>;
  }

  return (
    <div className={styles.notifFeed}>
      {groups.map((group) => (
        <section key={group.day} className={styles.notifDayGroup}>
          <h3 className={styles.notifDayLabel}>{group.day}</h3>
          {group.items.map((n) => {
            const meta = NOTIFICATION_META[n.type];
            const href = notificationHref(n);
            const content = (
              <>
                <div className={styles.notifIconWrap}>
                  <span className={styles.notifIcon}>{meta.icon}</span>
                  {!n.read && <span className={styles.notifDot} />}
                </div>
                <div className={styles.notifContent}>
                  <div className={styles.notifTopRow}>
                    <p className={styles.notifTitle}>{n.title}</p>
                    <span className={styles.notifTime}>{formatRelativeTime(n.createdAt)}</span>
                  </div>
                  <p className={styles.notifBody}>{n.body}</p>
                  <span className={styles.notifTypeTag}>{meta.label}</span>
                </div>
              </>
            );

            if (!href) {
              return (
                <div
                  key={n.id}
                  className={`${styles.notifCard} ${!n.read ? styles.notifUnread : ""}`}
                >
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={n.id}
                href={href}
                className={`${styles.notifCard} ${!n.read ? styles.notifUnread : ""}`}
                onClick={onMarkRead}
              >
                {content}
              </Link>
            );
          })}
        </section>
      ))}
    </div>
  );
}
