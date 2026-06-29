"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMatch } from "@/components/match/MatchProvider";
import { formatRelativeTime } from "@/lib/chat-utils";
import styles from "../match.module.css";

export default function MatchesPage() {
  const router = useRouter();
  const {
    state,
    ready,
    matches,
    getProfile,
    accept,
    reject,
    getMatchUnread,
    getLastMessage,
    unreadMessagesCount,
  } = useMatch();
  const me = state.session?.userId;

  useEffect(() => {
    if (!ready) return;
    if (!state.session) router.replace("/match/onboarding/");
  }, [ready, state.session, router]);

  const sorted = [...matches].sort((a, b) => {
    const lastA = getLastMessage(a.id)?.createdAt ?? a.createdAt;
    const lastB = getLastMessage(b.id)?.createdAt ?? b.createdAt;
    return new Date(lastB).getTime() - new Date(lastA).getTime();
  });

  return (
    <>
      <header className={styles.matchHeader}>
        <span className={styles.matchLogo}>MATCHES</span>
        <span className={styles.matchTag}>
          {sorted.length} conexiones
          {unreadMessagesCount > 0 ? ` · ${unreadMessagesCount} msgs` : ""}
        </span>
      </header>

      {sorted.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>AÚN SIN MATCHES</h2>
          <p>Desliza en Descubrir para encontrar tu próximo lienzo o artista.</p>
          <Link href="/match/discover/" className={styles.primaryBtn} style={{ marginTop: "1rem", display: "inline-flex" }}>
            Ir a Descubrir
          </Link>
        </div>
      ) : (
        <div className={styles.matchList}>
          {sorted.map((match) => {
            const otherId = match.tatuadorId === me ? match.lienzoId : match.tatuadorId;
            const other = getProfile(otherId);
            if (!other) return null;

            const isPending = match.status === "pending";
            const isIncoming =
              isPending && match.initiatedBy !== me && state.session?.profile.role === "lienzo";
            const lastMsg = getLastMessage(match.id);
            const unread = getMatchUnread(match.id);

            return (
              <div key={match.id} className={styles.matchListItem}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={other.avatarUrl || other.bodyPartPhotos[0]?.url}
                  alt={other.displayName}
                  className={styles.matchAvatar}
                />
                <div className={styles.matchListInfo}>
                  <p className={styles.matchListName}>
                    {other.displayName}
                    {unread > 0 && <span className={styles.matchUnreadBadge}>{unread}</span>}
                  </p>
                  <p className={styles.matchListStatus}>
                    {lastMsg
                      ? `${lastMsg.senderId === me ? "Tú: " : ""}${lastMsg.text.slice(0, 48)}${lastMsg.text.length > 48 ? "…" : ""}`
                      : match.isSuperLike
                        ? "⭐ Super Like"
                        : match.status === "matched"
                          ? "Match confirmado · Inicia el chat"
                          : isIncoming
                            ? "Quiere conectar contigo"
                            : "Esperando respuesta"}
                  </p>
                  {lastMsg && (
                    <span className={styles.matchListTime}>
                      {formatRelativeTime(lastMsg.createdAt)}
                    </span>
                  )}
                </div>
                {isIncoming ? (
                  <div className={styles.matchActions}>
                    <button
                      type="button"
                      className={`${styles.miniBtn} ${styles.miniBtnAccept}`}
                      onClick={() => accept(match.id)}
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      className={`${styles.miniBtn} ${styles.miniBtnReject}`}
                      onClick={() => reject(match.id)}
                    >
                      ✕
                    </button>
                  </div>
                ) : match.status === "matched" ? (
                  <Link href={`/match/chat/?id=${match.id}`} className={styles.miniBtn}>
                    Chat
                  </Link>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
