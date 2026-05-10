"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { editionData } from "@/content/edition";
import { ASTRO_CONFIG } from "@/config/astro-config";
import styles from "./astro-hero.module.css";

const SEQUENCE = [...ASTRO_CONFIG.assets.preloader, editionData.logo];

export default function Preloader({ onDone, ready }: { onDone: () => void; ready: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => {
        if (s === SEQUENCE.length - 1) {
          if (ready) {
            setTimeout(onDone, 800);
            return s;
          }
          return 0;
        }
        return s + 1;
      });
    }, 450);
    return () => clearInterval(interval);
  }, [ready, onDone]);

  return (
    <motion.div 
      className={styles.preloader} 
      exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }} 
      transition={{ duration: 0.8 }}
    >
      <div className={styles.preloaderInner}>
        <AnimatePresence mode="wait">
          <motion.div 
            key={step} 
            initial={{ opacity: 0, scale: 0.8 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 1.2 }} 
            className={styles.preloaderAsset}
          >
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              <img src={SEQUENCE[step]} alt="loading" style={{ objectFit: "contain", width: "100%", height: "100%" }} />
            </div>
          </motion.div>
        </AnimatePresence>
        <div className={styles.preloaderLine}>
          <motion.div 
            className={styles.preloaderProgress} 
            initial={{ width: 0 }} 
            animate={{ width: "100%" }} 
            transition={{ duration: 0.4 }} 
          />
        </div>
      </div>
    </motion.div>
  );
}
