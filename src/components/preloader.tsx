"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { editionData } from "@/content/edition";
import { ASTRO_CONFIG } from "@/config/astro-config";
import styles from "./astro-hero.module.css";

const SEQUENCE = [...ASTRO_CONFIG.assets.preloader, editionData.logo];
const LOGO_STEP = SEQUENCE.length - 1;

export default function Preloader({ onDone, ready }: { onDone: () => void; ready: boolean }) {
  const [step, setStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Bloqueo de scroll agresivo
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    
    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
    };
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
          return s; // Se queda en el logo hasta que 'ready' sea true
        }
        return s + 1;
      });
    }, 850); 
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
        {SEQUENCE.map((src, i) => (
          <motion.div
            key={src}
            className={styles.preloaderElement}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={i === step ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.88 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                    src={src}
                    alt={`loading-${i}`}
                    style={{ 
                        objectFit: "contain", 
                        width: i === LOGO_STEP ? "74%" : "100%",
                        height: i === LOGO_STEP ? "74%" : "100%",
                        position: "absolute"
                    }}
                />
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className={styles.scanline} style={{ opacity: 0.15 }} />
    </motion.div>
  );
}
