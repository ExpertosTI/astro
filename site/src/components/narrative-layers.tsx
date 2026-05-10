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
  coordsSkew: MotionValue<number>;
  isGlitchingOut: boolean;
  isMobile: boolean;
}

export default function NarrativeLayers({
  titleOpacity, titleY, editionOpacity,
  storyOpacity, storyY, coordsOpacity, coordsSkew,
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

      <motion.div 
        className={`${styles.coordBlock} ${styles.terminalFrame} ${isGlitchingOut ? styles.dirtyTransmission : ""} ${!isMobile && !isGlitchingOut ? styles.desktopGlitchReveal : ""}`} 
        style={{ opacity: storyOpacity, y: storyY, skewY: coordsSkew, zIndex: 50 }}
      >
        <div className={styles.terminalGlow} aria-hidden="true" />
        <div className={styles.signalBar} />
        <p className={styles.location}>{editionData.location}</p>
        <p className={styles.coordinates}>{editionData.coordinates}</p>
      </motion.div>
    </>
  );
}
