"use client";

import { motion, MotionValue } from "framer-motion";
import { editionData } from "@/content/edition";
import styles from "./astro-hero.module.css";

interface NarrativeLayersProps {
  titleOpacity: MotionValue<number>;
  titleY: MotionValue<string>;
  editionOpacity: MotionValue<number>;
  storyOpacity: MotionValue<number>;
  storyY: MotionValue<string>;
  coordsOpacity: MotionValue<number>;
  coordsY: MotionValue<string>;
  coordsSkew: MotionValue<number>;
  isGlitchingOut: boolean;
  isMobile: boolean;
}

export default function NarrativeLayers({
  titleOpacity, titleY, editionOpacity,
  storyOpacity, storyY, coordsOpacity, coordsY, coordsSkew,
  isGlitchingOut, isMobile
}: NarrativeLayersProps) {
  return (
    <>
      <motion.div 
        className={`${styles.titleBlock} ${isGlitchingOut ? styles.dirtyTransmission : ""} ${!isMobile && !isGlitchingOut ? styles.desktopGlitchReveal : ""}`} 
        style={{ opacity: titleOpacity, y: titleY, zIndex: 55 }}
      >
        <h2 className={styles.mainTitle}>ASTRO SDQ</h2>
        <motion.p className={styles.edition} style={{ opacity: editionOpacity }}>5TA EDICIÓN</motion.p>
      </motion.div>

      {/* Bloque de Historia/Mensaje */}
      <motion.div 
        className={`${styles.coordBlock} ${isGlitchingOut ? styles.dirtyTransmission : ""} ${!isMobile && !isGlitchingOut ? styles.desktopGlitchReveal : ""}`} 
        style={{ opacity: storyOpacity, y: storyY, zIndex: 45 }}
      >
        <p className={styles.missionText} style={{ color: "white", fontSize: "1.2rem", maxWidth: "40ch" }}>
            ESTAMOS PREPARANDO LA MAYOR EXPERIENCIA ASTRO HASTA LA FECHA.
        </p>
      </motion.div>

      {/* Bloque de Coordenadas (Original) */}
      <motion.div 
        className={`${styles.coordBlock} ${styles.terminalFrame} ${isGlitchingOut ? styles.dirtyTransmission : ""} ${!isMobile && !isGlitchingOut ? styles.desktopGlitchReveal : ""}`} 
        style={{ opacity: coordsOpacity, y: coordsY, skewY: coordsSkew, zIndex: 50 }}
      >
        <div className={styles.terminalGlow} aria-hidden="true" />
        <div className={styles.signalBar} />
        <p className={styles.location}>{editionData.location}</p>
        <p className={styles.coordinates}>{editionData.coordinates}</p>
      </motion.div>
    </>
  );
}
