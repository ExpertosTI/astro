"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { editionData } from "@/content/edition";
import { ASTRO_CONFIG } from "@/config/astro-config";
import styles from "./astro-hero.module.css";

const SEQUENCE = [...ASTRO_CONFIG.assets.preloader, editionData.logo];
const LOGO_STEP = SEQUENCE.length - 1;

export default function Preloader({ onDone, ready }: { onDone: () => void; ready: boolean }) {
  const [step, setStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Bloqueo de scroll estricto
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => {
        if (s === LOGO_STEP) {
          if (ready && !isExiting) {
            setIsExiting(true);
            setTimeout(onDone, 950);
            return s;
          }
          return 0;
        }
        return s + 1;
      });
    }, 850); // Ritmo original pausado
    return () => clearInterval(interval);
  }, [ready, isExiting, onDone]);

  return (
    <motion.div
      className={styles.preloader}
      initial={{ opacity: 1 }}
      animate={isExiting
        ? {
            opacity: [1, 1, 0.4, 1, 0],
            x: [0, -6, 8, -4, 0],
            filter: [
              "brightness(1) blur(0px)",
              "brightness(1.5) blur(2px)",
              "contrast(1.4) blur(0px)",
              "brightness(1.2) blur(4px)",
              "brightness(0) blur(10px)"
            ],
          }
        : { opacity: 1, x: 0, filter: "brightness(1) blur(0px)" }}
      transition={{ duration: isExiting ? 0.9 : 0.2, ease: "easeInOut" }}
    >
      <div className={`${styles.missionHud} ${isExiting ? styles.missionHudActive : ""}`}>
        <p className={styles.missionText}>SYSTEM: OK // NEBULA: ACTIVE // ASTRO SDQ LINKED</p>
      </div>
      
      <div className={styles.preloaderInner}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className={styles.preloaderElement}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                src={SEQUENCE[step]}
                alt={`loading-${step}`}
                style={{ 
                    objectFit: "contain", 
                    width: step === LOGO_STEP ? "74%" : "100%",
                    height: step === LOGO_STEP ? "74%" : "100%"
                }}
                />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      
      <div className={styles.scanline} style={{ opacity: 0.15 }} />
    </motion.div>
  );
}
