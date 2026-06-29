"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMatch } from "@/components/match/MatchProvider";
import { BadgeRow } from "@/components/match/BadgeRow";
import styles from "../match.module.css";

export default function ActivityPage() {
  const router = useRouter();
  const {
    state,
    ready,
    likesReceived,
    profileViewers,
    unreadCount,
    markRead,
    limits,
  } = useMatch();

  useEffect(() => {
    if (!ready) return;
    if (!state.session) router.replace("/match/onboarding/");
    else markRead();
  }, [ready, state.session, router, markRead]);

  const superLikes = likesReceived.filter((p) =>
    state.swipes.some(
      (s) => s.toUserId === state.session?.userId && s.fromUserId === p.id && s.action === "superlike"
    )
  );

  return (
    <>
      <header className={styles.matchHeader}>
        <span className={styles.matchLogo}>ACTIVIDAD</span>
        {unreadCount > 0 && <span className={styles.matchTag}>{unreadCount} nuevas</span>}
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>🔥 {limits.streak}</span>
          <span className={styles.statLabel}>Racha días</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{likesReceived.length}</span>
          <span className={styles.statLabel}>Te dieron like</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{profileViewers.length}</span>
          <span className={styles.statLabel}>Vieron tu perfil</span>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>⭐ Super Likes recibidos</h2>
      {superLikes.length === 0 ? (
        <p className={styles.activityEmpty}>Nadie te ha super-likeado aún. ¡Mejora tu perfil!</p>
      ) : (
        <div className={styles.activityList}>
          {superLikes.map((p) => (
            <div key={p.id} className={styles.activityItem}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.avatarUrl} alt="" className={styles.matchAvatar} />
              <div>
                <p className={styles.matchListName}>{p.displayName}</p>
                <BadgeRow badges={p.badges} />
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className={styles.sectionTitle}>♥ Te dieron like</h2>
      {likesReceived.length === 0 ? (
        <p className={styles.activityEmpty}>Sigue activo — la visibilidad crece con tu racha.</p>
      ) : (
        <div className={styles.activityList}>
          {likesReceived.map((p) => (
            <div key={p.id} className={styles.activityItem}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.avatarUrl} alt="" className={styles.matchAvatar} />
              <div>
                <p className={styles.matchListName}>{p.displayName}</p>
                <p className={styles.matchListStatus}>{p.city} · {p.role}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className={styles.sectionTitle}>👁 Vieron tu perfil</h2>
      {profileViewers.length === 0 ? (
        <p className={styles.activityEmpty}>Completa fotos de zonas para más visitas.</p>
      ) : (
        <div className={styles.activityList}>
          {profileViewers.map((p) => (
            <div key={p.id} className={styles.activityItem}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.avatarUrl} alt="" className={styles.matchAvatar} />
              <p className={styles.matchListName}>{p.displayName}</p>
            </div>
          ))}
        </div>
      )}

      <h2 className={styles.sectionTitle}>🔔 Notificaciones</h2>
      <div className={styles.notifList}>
        {state.notifications.slice(0, 12).map((n) => (
          <div key={n.id} className={`${styles.notifItem} ${!n.read ? styles.notifUnread : ""}`}>
            <p className={styles.notifTitle}>{n.title}</p>
            <p className={styles.notifBody}>{n.body}</p>
            {n.relatedMatchId && n.type === "match" && (
              <Link href={`/match/chat/?id=${n.relatedMatchId}`} className={styles.notifLink}>
                Ir al chat →
              </Link>
            )}
          </div>
        ))}
        {state.notifications.length === 0 && (
          <p className={styles.activityEmpty}>Sin notificaciones aún.</p>
        )}
      </div>
    </>
  );
}
