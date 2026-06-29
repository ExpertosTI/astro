"use client";

import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import type { AstroProfile, SwipeAction } from "@/types/match";
import { BadgeRow } from "./BadgeRow";
import { BODY_PARTS } from "@/lib/match-constants";
import styles from "@/app/match/match.module.css";

type Props = {
  profile: AstroProfile;
  onSwipe: (direction: SwipeAction) => void;
  onDetail?: () => void;
  active?: boolean;
};

export function SwipeCard({ profile, onSwipe, onDetail, active = true }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, -20], [1, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 100) onSwipe("like");
    else if (info.offset.x < -100) onSwipe("pass");
  };

  const partsLabel = profile.bodyParts
    .map((p) => BODY_PARTS.find((b) => b.id === p)?.label ?? p)
    .join(" · ");

  const photos = [
    ...(profile.bodyPartPhotos[0]?.url ? [profile.bodyPartPhotos[0].url] : []),
    ...(profile.avatarUrl ? [profile.avatarUrl] : []),
    ...profile.portfolioUrls,
  ];
  const mainPhoto = photos[0];

  return (
    <motion.div
      className={styles.swipeCardWrap}
      style={{ x, rotate, zIndex: active ? 10 : 1 }}
      drag={active ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={active ? handleDragEnd : undefined}
      whileTap={active ? { cursor: "grabbing" } : undefined}
    >
      <div className={styles.matchCard}>
        <button type="button" className={styles.cardTapZone} onClick={onDetail} aria-label="Ver perfil completo">
          {mainPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mainPhoto} alt={profile.displayName} className={styles.matchCardImage} />
          ) : (
            <div className={styles.matchCardImage} style={{ background: "var(--bg-soft)" }} />
          )}
        </button>
        <div className={styles.matchCardOverlay} />
        <motion.span className={`${styles.swipeStamp} ${styles.stampLike}`} style={{ opacity: likeOpacity }}>
          MATCH
        </motion.span>
        <motion.span className={`${styles.swipeStamp} ${styles.stampPass}`} style={{ opacity: passOpacity }}>
          PASS
        </motion.span>
        {profile.bodyPartPhotos.length > 1 && (
          <div className={styles.photoIndicators}>
            {profile.bodyPartPhotos.slice(0, 4).map((_, i) => (
              <span key={i} className={styles.photoDot} />
            ))}
          </div>
        )}
        <div className={styles.matchCardInfo}>
          <h2 className={styles.matchCardName}>
            {profile.displayName}
            <span className={styles.matchCardCity}>{profile.city}</span>
          </h2>
          <p className={styles.matchCardMeta}>
            {profile.role === "lienzo" ? `Lienzo · ${partsLabel}` : `Tatuador · ${profile.city}`}
          </p>
          <p className={styles.matchCardBio}>{profile.bio}</p>
          <BadgeRow badges={profile.badges} />
          {onDetail && (
            <button type="button" className={styles.viewMoreBtn} onClick={onDetail}>
              Ver perfil completo ↑
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
