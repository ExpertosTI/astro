"use client";

import { motion, MotionValue } from "framer-motion";
import { useState, useEffect } from "react";
import styles from "./astro-hero.module.css";

interface RingData {
  id: number;
  src: string;
  size: string;
  rotZ: number;
  speed: number;
  originX: number;
  originY: number;
  fieldX: number;
  fieldY: number;
  driftX: number;
  driftY: number;
  swayX: number;
  swayY: number;
  phase: number;
  variant: string;
}

interface CornerRingProps extends RingData {
  progress: MotionValue<number>;
  time: MotionValue<number>;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  playSound: (type: any) => void;
  onBurst?: () => void;
}

function CornerRing({
  src, size, rotZ, speed, originX, originY, fieldX, fieldY,
  driftX, driftY, swayX, swayY, phase, variant,
  progress, time, mouseX, mouseY, playSound, onBurst
}: CornerRingProps) {
  const [isBursting, setIsBursting] = useState(false);

  const handleRingClick = () => {
    if (isBursting) return;
    setIsBursting(true);
    playSound("glitch");
    if (onBurst) onBurst();
    setTimeout(() => setIsBursting(false), 600);
  };

  return (
    <motion.div
      className={`${styles.ringContainer} ${isBursting ? styles.ringBurstActive : ""}`}
      style={{
        width: size,
        height: size,
        x: originX,
        y: originY,
        rotateZ: rotZ,
      }}
    >
      <motion.div
        className={styles.ringWrapper}
        onClick={handleRingClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className={styles.ringAura} />
        <div 
          className={`${styles.ringInner} ${styles[variant]}`}
          style={{ backgroundImage: `url(${src})` }}
        />
        {isBursting && <div className={styles.ringBurstEffect} />}
      </motion.div>
    </motion.div>
  );
}

export default function OrbitalSystem({ 
  isMobile, viewport, progress, time, mouseX, mouseY, playSound 
}: { 
  isMobile: boolean; 
  viewport: { w: number; h: number };
  progress: MotionValue<number>;
  time: MotionValue<number>;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  playSound: (type: any) => void;
}) {
  const [dynamicRings, setDynamicRings] = useState<RingData[]>([]);

  const handleAddRing = () => {
    const newId = Date.now();
    const newRing = {
      id: newId,
      src: `/astro/rings/ring-${(newId % 4) + 1}.png`,
      size: isMobile ? "32vmin" : "30vmin",
      rotZ: Math.random() * 360,
      speed: 0.8 + Math.random() * 1.5,
      originX: -100 + Math.random() * 200,
      originY: -100 + Math.random() * 200,
      fieldX: 180,
      fieldY: 180,
      driftX: -25 + Math.random() * 50,
      driftY: -25 + Math.random() * 50,
      swayX: 15 + Math.random() * 35,
      swayY: 15 + Math.random() * 35,
      phase: Math.random() * Math.PI * 2,
      variant: ["ring1", "ring2", "ring3", "ring4"][newId % 4],
    };
    setDynamicRings(prev => [...prev, newRing]);
    playSound("transition");
  };

  useEffect(() => {
    setDynamicRings([
      { id: 1, src: "/astro/rings/ring-1.png", size: isMobile ? "35vmin" : "38vmin", rotZ: 12, speed: 42, originX: -Math.round(viewport.w * 0.32), originY: -Math.round(viewport.h * 0.22), fieldX: Math.round(viewport.w * 0.66), fieldY: Math.round(viewport.h * 0.5), driftX: Math.round(viewport.w * 0.24), driftY: Math.round(viewport.h * 0.16), swayX: Math.round(viewport.w * 0.08), swayY: Math.round(viewport.h * 0.06), phase: Math.PI * 1.08, variant: "ring1" },
      { id: 2, src: "/astro/rings/ring-2.png", size: isMobile ? "35vmin" : "38vmin", rotZ: -18, speed: -36, originX: Math.round(viewport.w * 0.68), originY: -Math.round(viewport.h * 0.2), fieldX: Math.round(viewport.w * 0.68), fieldY: Math.round(viewport.h * 0.5), driftX: -Math.round(viewport.w * 0.26), driftY: Math.round(viewport.h * 0.14), swayX: Math.round(viewport.w * 0.07), swayY: Math.round(viewport.h * 0.06), phase: Math.PI * 0.14, variant: "ring2" },
      { id: 3, src: "/astro/rings/ring-3.png", size: isMobile ? "35vmin" : "38vmin", rotZ: 48, speed: 50, originX: -Math.round(viewport.w * 0.28), originY: Math.round(viewport.h * 0.62), fieldX: Math.round(viewport.w * 0.64), fieldY: Math.round(viewport.h * 0.52), driftX: Math.round(viewport.w * 0.22), driftY: -Math.round(viewport.h * 0.15), swayX: Math.round(viewport.w * 0.08), swayY: Math.round(viewport.h * 0.06), phase: Math.PI * 1.62, variant: "ring3" },
      { id: 4, src: "/astro/rings/ring-4.png", size: isMobile ? "35vmin" : "38vmin", rotZ: -10, speed: -28, originX: Math.round(viewport.w * 0.65), originY: Math.round(viewport.h * 0.64), fieldX: Math.round(viewport.w * 0.66), fieldY: Math.round(viewport.h * 0.48), driftX: -Math.round(viewport.w * 0.2), driftY: -Math.round(viewport.h * 0.12), swayX: Math.round(viewport.w * 0.07), swayY: Math.round(viewport.h * 0.05), phase: Math.PI * 0.58, variant: "ring4" },
    ]);
  }, [isMobile, viewport.h, viewport.w]);

  return (
    <div className={styles.ringsLayer}>
      {dynamicRings.map((r) => (
        <CornerRing
          key={r.id}
          {...r}
          progress={progress}
          time={time}
          mouseX={mouseX}
          mouseY={mouseY}
          playSound={playSound}
          onBurst={handleAddRing}
        />
      ))}
    </div>
  );
}
