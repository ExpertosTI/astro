"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMatch } from "@/components/match/MatchProvider";
import { BadgeRow } from "@/components/match/BadgeRow";
import { MatchSettingsPanel } from "@/components/match/MatchSettingsPanel";
import { BODY_PARTS, DAYS, TIME_SLOTS } from "@/lib/match-constants";
import { formatProfilePricing } from "@/lib/match-pricing";
import styles from "../match.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const { state, ready, signOut, limits, likesReceived, matches } = useMatch();
  const profile = state.session?.profile;

  useEffect(() => {
    if (!ready) return;
    if (!state.session) router.replace("/match/onboarding/");
  }, [ready, state.session, router]);

  if (!profile) return null;

  const roleLabel = profile.role === "tatuador" ? "Tatuador" : "Lienzo / Voluntario";

  return (
    <>
      <header className={styles.matchHeader}>
        <span className={styles.matchLogo}>PERFIL</span>
        <Link href="/match/onboarding/" className={styles.matchTag}>
          Editar
        </Link>
      </header>

      <div className={styles.profileHero}>
        {profile.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt={profile.displayName} className={styles.profileAvatar} />
        )}
        <h1 className={styles.profileName}>{profile.displayName}</h1>
        {formatProfilePricing(profile) && (
          <span className={styles.pricingChip}>{formatProfilePricing(profile)}</span>
        )}
        <p className={styles.profileRole}>{roleLabel} · {profile.city}</p>
        <BadgeRow badges={profile.badges} />
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>🔥 {limits.streak}</span>
          <span className={styles.statLabel}>Racha</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{matches.filter((m) => m.status === "matched").length}</span>
          <span className={styles.statLabel}>Matches</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{likesReceived.length}</span>
          <span className={styles.statLabel}>Likes</span>
        </div>
      </div>

      <MatchSettingsPanel userId={profile.id} />

      {profile.bio && (
        <>
          <h2 className={styles.sectionTitle}>Bio</h2>
          <p style={{ fontSize: "0.85rem", lineHeight: 1.5, color: "rgba(246,233,212,0.88)" }}>
            {profile.bio}
          </p>
        </>
      )}

      {profile.role === "lienzo" && profile.bodyParts.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Zonas disponibles</h2>
          <div className={styles.chipGrid}>
            {profile.bodyParts.map((part) => (
              <span key={part} className={`${styles.chip} ${styles.chipActive}`}>
                {BODY_PARTS.find((b) => b.id === part)?.label ?? part}
              </span>
            ))}
          </div>
        </>
      )}

      {profile.availability.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Disponibilidad</h2>
          {profile.availability.map((slot) => (
            <p key={slot.day} style={{ fontSize: "0.78rem", marginBottom: "0.35rem", color: "var(--muted)" }}>
              {DAYS.find((d) => d.id === slot.day)?.label}:{" "}
              {slot.slots.map((s) => TIME_SLOTS.find((t) => t.id === s)?.label).join(", ")}
            </p>
          ))}
        </>
      )}

      {profile.bodyPartPhotos.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Fotos de zonas</h2>
          <div className={styles.bodyPartGallery}>
            {profile.bodyPartPhotos.map((photo) => (
              <div key={photo.part} className={styles.bodyPartSlide}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.part} />
                <p className={styles.bodyPartLabel}>
                  {BODY_PARTS.find((b) => b.id === photo.part)?.label ?? photo.part}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {profile.portfolioUrls.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Portfolio</h2>
          <div className={styles.photoGrid}>
            {profile.portfolioUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <div key={i} className={styles.photoThumb}><img src={url} alt={`Work ${i + 1}`} /></div>
            ))}
          </div>
        </>
      )}

      <button
        type="button"
        className={styles.ghostBtn}
        style={{ marginTop: "2rem" }}
        onClick={() => {
          signOut();
          router.push("/match/onboarding/");
        }}
      >
        Cerrar sesión
      </button>
    </>
  );
}
