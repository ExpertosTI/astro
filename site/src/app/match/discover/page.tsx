"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useMatch } from "@/components/match/MatchProvider";
import { MatchBrand } from "@/components/match/MatchBrand";
import { SwipeCard } from "@/components/match/SwipeCard";
import { ProfileDetailModal } from "@/components/match/ProfileDetailModal";
import { FilterPanel } from "@/components/match/FilterPanel";
import { PullToRefresh } from "@/components/match/PullToRefresh";
import { triggerHaptic } from "@/lib/match-haptics";
import { nativePrompt, sendNativeNotification } from "@/lib/astro-native";
import styles from "../match.module.css";

export default function DiscoverPage() {
  const router = useRouter();
  const {
    state,
    ready,
    discover,
    syncStatus,
    syncError,
    swipe,
    rewind,
    block,
    viewProfile,
    updateFilters,
    limits,
    refreshNow,
  } = useMatch();

  const [index, setIndex] = useState(0);
  const [prevFilters, setPrevFilters] = useState(state.filters);

  if (state.filters.city !== prevFilters.city || state.filters.bodyPart !== prevFilters.bodyPart) {
    setPrevFilters(state.filters);
    setIndex(0);
  }

  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayTitle, setOverlayTitle] = useState("");
  const [overlayBody, setOverlayBody] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!state.session) router.replace("/match/onboarding/");
  }, [ready, state.session, router]);

  const current = discover[index];
  const cities = useMemo(
    () => [...new Set(state.profiles.map((p) => p.city))].sort(),
    [state.profiles]
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  const handleSwipe = (direction: "like" | "pass" | "superlike") => {
    if (!current) return;
    if (direction === "superlike") viewProfile(current.id);
    
    // Trigger native haptic feedback
    void triggerHaptic(direction === "superlike" ? "heavy" : direction === "like" ? "medium" : "light");

    const result = swipe(current.id, direction);
    if (!result.ok) {
      showToast(result.error ?? "No se pudo completar");
      return;
    }
    if (direction === "like" || direction === "superlike") {
      const titleText = direction === "superlike" ? "⭐ SUPER LIKE" : "¡INTERÉS ENVIADO!";
      const bodyText = result.matched
        ? `¡Match instantáneo con ${current.displayName}!`
        : direction === "superlike"
          ? `${current.displayName} verá tu super like primero`
          : `Esperando respuesta de ${current.displayName}`;

      setOverlayTitle(titleText);
      setOverlayBody(bodyText);
      setShowOverlay(true);
      setTimeout(() => setShowOverlay(false), 2400);

      if (result.matched) {
        void triggerHaptic("success");
        void sendNativeNotification({
          title: "🎉 ¡ES UN MATCH!",
          body: `Conectaste con ${current.displayName}. Ya pueden chatear.`,
        });
      }
    }
    setIndex((i) => i + 1);
  };

  const handleRewind = () => {
    void triggerHaptic("selection");
    const result = rewind();
    if (!result.ok) {
      showToast(result.error ?? "No se pudo deshacer");
      return;
    }
    setIndex((i) => Math.max(0, i - 1));
    showToast("Swipe deshecho");
  };

  const openDetail = () => {
    if (!current) return;
    void triggerHaptic("light");
    viewProfile(current.id);
    setDetailOpen(true);
  };

  const handleBlock = async () => {
    if (!current) return;
    const reasonInput = await nativePrompt({
      title: "Reportar y Bloquear Usuario",
      message: `Escribe el motivo del reporte para ${current.displayName}:`,
      placeholder: "Motivo del reporte...",
      defaultText: "Comportamiento inadecuado",
    });

    if (reasonInput === null) return; // User cancelled

    block(current.id, reasonInput || "Reportado por usuario");
    setDetailOpen(false);
    setIndex((i) => i + 1);
    showToast("Usuario bloqueado ✓");
  };

  const roleLabel = state.session?.profile.role === "tatuador" ? "Lienzos" : "Tatuadores";

  return (
    <PullToRefresh onRefresh={refreshNow}>
    <>
      <header className={styles.discoverHeader}>
        <MatchBrand compact />
        <div className={styles.headerActions}>
          <span className={styles.streakBadge}>🔥 {limits.streak}</span>
          <button type="button" className={styles.filterBtn} onClick={() => setFilterOpen(true)}>
            ⚙
          </button>
        </div>
      </header>

      <div className={styles.limitsBar}>
        <span>⭐ {limits.superLikes} super</span>
        <span>↩ {limits.rewinds} rewind</span>
        <span>{roleLabel}</span>
      </div>

      <FilterPanel
        filters={state.filters}
        cities={cities}
        open={filterOpen}
        onChange={updateFilters}
        onClose={() => setFilterOpen(false)}
      />

      <div className={styles.swipeDeck}>
        {current ? (
          <>
            <SwipeCard
              profile={current}
              onSwipe={handleSwipe}
              onDetail={openDetail}
            />
            <div className={styles.swipeActions}>
              <button
                type="button"
                className={`${styles.swipeBtn} ${styles.swipeBtnRewind}`}
                onClick={handleRewind}
                aria-label="Deshacer"
                title="Deshacer último swipe"
              >
                ↩
              </button>
              <button
                type="button"
                className={`${styles.swipeBtn} ${styles.swipeBtnPass}`}
                onClick={() => handleSwipe("pass")}
                aria-label="Pasar"
              >
                ✕
              </button>
              <button
                type="button"
                className={`${styles.swipeBtn} ${styles.swipeBtnSuper}`}
                onClick={() => handleSwipe("superlike")}
                aria-label="Super Like"
                title="Super Like"
              >
                ⭐
              </button>
              <button
                type="button"
                className={`${styles.swipeBtn} ${styles.swipeBtnLike}`}
                onClick={() => handleSwipe("like")}
                aria-label="Match"
              >
                ♥
              </button>
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <h2>SIN MÁS PERFILES</h2>
            {syncStatus === "offline" ? (
              <p>
                Sin conexión en vivo — los perfiles de otros dispositivos no aparecen hasta activar el servidor.
                {syncError ? ` (${syncError})` : ""}
              </p>
            ) : (
              <p>Esperando nuevos {roleLabel.toLowerCase()} en la red. Se actualiza cada pocos segundos.</p>
            )}
            <button
              type="button"
              className={styles.primaryBtn}
              style={{ marginTop: "1rem" }}
              onClick={() => updateFilters({ city: "", bodyPart: "" })}
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {current && (
        <ProfileDetailModal
          profile={current}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          onBlock={handleBlock}
        />
      )}

      {toast && <div className={styles.toast}>{toast}</div>}

      <AnimatePresence>
        {showOverlay && (
          <motion.div
            className={styles.matchOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className={styles.matchOverlayCard}>
              <p className={styles.matchOverlayTitle}>{overlayTitle}</p>
              <p style={{ color: "var(--muted)" }}>{overlayBody}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
    </PullToRefresh>
  );
}
