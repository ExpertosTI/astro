"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AstroProfile } from "@/types/match";
import { BadgeRow } from "./BadgeRow";
import { BODY_PARTS, DAYS, TIME_SLOTS } from "@/lib/match-constants";
import styles from "@/app/match/match.module.css";

type Props = {
  profile: AstroProfile;
  open: boolean;
  onClose: () => void;
  onBlock?: () => void;
};

export function ProfileDetailModal({ profile, open, onClose, onBlock }: Props) {
  const [photoIndex, setPhotoIndex] = useState(0);

  const photos = [
    ...(profile.avatarUrl ? [profile.avatarUrl] : []),
    ...profile.bodyPartPhotos.map((p) => p.url),
    ...profile.portfolioUrls,
  ];

  const partsLabel = profile.bodyParts
    .map((p) => BODY_PARTS.find((b) => b.id === p)?.label ?? p)
    .join(" · ");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.detailOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.detailSheet}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.detailHandle} />

            {photos.length > 0 && (
              <div className={styles.detailGallery}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photos[photoIndex]} alt={profile.displayName} className={styles.detailMainImg} />
                {photos.length > 1 && (
                  <div className={styles.detailThumbs}>
                    {photos.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`${styles.detailThumb} ${i === photoIndex ? styles.detailThumbActive : ""}`}
                        onClick={() => setPhotoIndex(i)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className={styles.detailBody}>
              <h2 className={styles.detailName}>
                {profile.displayName}
                <span className={styles.detailCity}>{profile.city}</span>
              </h2>
              <p className={styles.detailRole}>
                {profile.role === "lienzo" ? `Lienzo · ${partsLabel}` : "Tatuador"}
              </p>
              <BadgeRow badges={profile.badges} />
              <p className={styles.detailBio}>{profile.bio}</p>

              {profile.availability.length > 0 && (
                <>
                  <h3 className={styles.sectionTitle}>Disponibilidad</h3>
                  {profile.availability.map((slot) => (
                    <p key={slot.day} className={styles.detailAvail}>
                      {DAYS.find((d) => d.id === slot.day)?.label}:{" "}
                      {slot.slots.map((s) => TIME_SLOTS.find((t) => t.id === s)?.label).join(", ")}
                    </p>
                  ))}
                </>
              )}

              <div className={styles.detailActions}>
                {onBlock && (
                  <button type="button" className={styles.blockBtn} onClick={onBlock}>
                    Bloquear y reportar
                  </button>
                )}
                <button type="button" className={styles.ghostBtn} onClick={onClose}>
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
