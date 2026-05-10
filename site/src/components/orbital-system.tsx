"use client";

import { motion, MotionValue, useTransform } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import styles from "./astro-hero.module.css";

interface RingData {
  id: number;
  src: string;
  size: string;
  rotZ: number;
  speed: number;
  originX: number | string;
  originY: number | string;
  variant: string;
  depth: number;
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
  src, size, rotZ, speed, originX, originY, variant, depth,
  progress, time, mouseX, mouseY, playSound, onBurst
}: CornerRingProps) {
  const [isBursting, setIsBursting] = useState(false);
  
  // Efecto de flotación "tipo juego" usando el tiempo global
  const floatX = useTransform(time, (t) => Math.sin(t * 0.001 * speed) * 15);
  const floatY = useTransform(time, (t) => Math.cos(t * 0.001 * (speed * 0.8)) * 12);
  const floatRotate = useTransform(time, (t) => rotZ + (t * 0.02 * speed));

  const handleRingClick = () => {
    if (isBursting) return;
    setIsBursting(true);
    playSound("glitch");
    if (onBurst) onBurst();
    setTimeout(() => setIsBursting(false), 800);
  };

  return (
    <motion.div
      className={`${styles.ringContainer} ${isBursting ? styles.ringBurstActive : ""}`}
      style={{
        width: size,
        height: size,
        left: originX,
        top: originY,
        x: floatX,
        y: floatY,
        rotateZ: floatRotate,
        zIndex: (depth as any),
      }}
    >
      <motion.div
        className={styles.ringWrapper}
        onClick={handleRingClick}
        whileHover={{ scale: 1.1, filter: "brightness(1.4) saturate(1.2)" }}
        whileTap={{ scale: 0.9 }}
      >
        <div className={styles.ringAura} aria-hidden="true" />
        <div 
          className={`${styles.ringInner} ${styles[variant]}`}
          style={{ backgroundImage: `url(${src})` }}
        />
        {isBursting && <div className={styles.ringBurstEffect} aria-hidden="true" />}
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
  const hasInitialized = useRef(false);

  const handleAddRing = () => {
    const newId = Date.now();
    const newRing = {
      id: newId,
      src: `/astro/rings/ring-${(newId % 4) + 1}.png`,
      size: isMobile ? "28vmin" : "25vmin",
      rotZ: Math.random() * 360,
      speed: (0.5 + Math.random() * 1.2) * (Math.random() > 0.5 ? 1 : -1),
      originX: `${10 + Math.random() * 80}%`,
      originY: `${10 + Math.random() * 80}%`,
      variant: ["ring1", "ring2", "ring3", "ring4"][newId % 4],
      depth: Math.floor(Math.random() * 10) + 100, // Z-Index dinámico
    };
    setDynamicRings(prev => [...prev, newRing]);
    playSound("transition");
  };

  useEffect(() => {
    if (!hasInitialized.current && viewport.w > 0) {
      setDynamicRings([
        { id: 1, src: "/astro/rings/ring-1.png", size: isMobile ? "32vmin" : "38vmin", rotZ: 12, speed: 1.2, originX: "15%", originY: "15%", variant: "ring1", depth: 105 },
        { id: 2, src: "/astro/rings/ring-2.png", size: isMobile ? "32vmin" : "38vmin", rotZ: -18, speed: -1.4, originX: "85%", originY: "18%", variant: "ring2", depth: 95 },
        { id: 3, src: "/astro/rings/ring-3.png", size: isMobile ? "32vmin" : "38vmin", rotZ: 48, speed: 1.6, originX: "18%", originY: "82%", variant: "ring3", depth: 110 },
        { id: 4, src: "/astro/rings/ring-4.png", size: isMobile ? "32vmin" : "38vmin", rotZ: -10, speed: -1.1, originX: "82%", originY: "85%", variant: "ring4", depth: 90 },
      ]);
      hasInitialized.current = true;
    }
  }, [isMobile, viewport.w]);

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
