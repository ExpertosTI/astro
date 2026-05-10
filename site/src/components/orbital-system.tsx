"use client";

import { motion, MotionValue, useTransform } from "framer-motion";
import { useState, useMemo } from "react";
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

interface OrbitalSystemProps {
  progress: MotionValue<number>;
  time: MotionValue<number>;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  playSound: (type: "glitch" | "transition") => void;
  isMobile: boolean;
  viewport: { w: number; h: number };
}

function CornerRing({
  src, size, rotZ, speed, originX, originY, fieldX, fieldY, driftX, driftY, swayX, swayY, phase, variant, progress, time, mouseX, mouseY, playSound,
}: any) {
  const [isBursting, setIsBursting] = useState(false);

  const handleRingClick = () => {
    if (isBursting) return;
    setIsBursting(true);
    playSound("glitch");
    setTimeout(() => setIsBursting(false), 600);
  };

  const wrap = (value: number, limit: number) => {
    const span = limit * 2;
    return ((((value + limit) % span) + span) % span) - limit;
  };

  const dx = useTransform([progress, time, mouseX], ([p, t, mx]) => {
    const driftAutoX = Math.sin((t as number) / 2800 + phase) * 35 + Math.sin((t as number) / 1400) * 12;
    const travelX = originX + driftX * (p as number) + phase * swayX * 0.7;
    const mouseReaction = (mx as number) * 65 * (Math.sin(phase) + 1.2);
    return wrap(travelX, fieldX) + driftAutoX + mouseReaction;
  });

  const dy = useTransform([progress, time, mouseY], ([p, t, my]) => {
    const driftAutoY = Math.cos((t as number) / 3200 + phase) * 35 + Math.cos((t as number) / 1600) * 12;
    const travelY = originY + driftY * (p as number) + phase * swayY * 0.6;
    const mouseReaction = (my as number) * 65 * (Math.cos(phase) + 1.2);
    return wrap(travelY, fieldY) + driftAutoY + mouseReaction;
  });

  const idleRot = useTransform(time, (t: any) => Math.sin((t as number) / 4000 + phase) * 4);
  const scrollRot = useTransform(progress, (value: any) => rotZ + (value as number) * speed * 15);
  const totalRot = useTransform([scrollRot, idleRot], ([sr, ir]) => (sr as number) + (ir as number));

  const visualProgress = useTransform(progress, (v: any) => Math.min(Math.max((v as number) % 1.2, 0), 1));
  const ringOpacity = useTransform(visualProgress, [0, 0.15, 0.7, 1], [0, 0.95, 0.9, 0]);
  const baseScale = useTransform(visualProgress, [0, 0.3, 0.9, 1], [1.2, 0.8, 0.3, 0]);
  const ringZIndex = useTransform(visualProgress, (value) => (value > 0.65 ? 120 : 40));

  return (
    <motion.div
      className={`${styles.orbitalRing} ${isBursting ? styles.ringBurstActive : ""}`}
      onClick={handleRingClick}
      style={{
        width: size,
        height: size,
        x: dx,
        y: dy,
        rotate: totalRot,
        scale: baseScale,
        opacity: ringOpacity,
        zIndex: ringZIndex,
        cursor: "pointer",
        pointerEvents: "auto",
        position: "absolute"
      }}
    >
      <img src={src} className={styles.ringInner} alt="Orbital Ring" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      {isBursting && <div className={styles.ringBurstEffect} />}
    </motion.div>
  );
}

export default function OrbitalSystem({ progress, time, mouseX, mouseY, playSound, isMobile, viewport }: OrbitalSystemProps) {
  const rings = useMemo(() => [
    {
      id: 1,
      src: "/astro/rings/ring-1.png",
      size: isMobile ? "44vmin" : "42vmin",
      rotZ: 12,
      speed: 42,
      originX: -Math.round(viewport.w * 0.32),
      originY: -Math.round(viewport.h * 0.22),
      fieldX: Math.round(viewport.w * 0.66),
      fieldY: Math.round(viewport.h * 0.5),
      driftX: Math.round(viewport.w * 0.24),
      driftY: Math.round(viewport.h * 0.16),
      swayX: Math.round(viewport.w * 0.08),
      swayY: Math.round(viewport.h * 0.06),
      phase: Math.PI * 1.08,
      variant: "ring1",
    },
    {
      id: 2,
      src: "/astro/rings/ring-2.png",
      size: isMobile ? "42vmin" : "40vmin",
      rotZ: -18,
      speed: -36,
      originX: Math.round(viewport.w * 0.68),
      originY: -Math.round(viewport.h * 0.2),
      fieldX: Math.round(viewport.w * 0.68),
      fieldY: Math.round(viewport.h * 0.5),
      driftX: -Math.round(viewport.w * 0.26),
      driftY: Math.round(viewport.h * 0.14),
      swayX: Math.round(viewport.w * 0.07),
      swayY: Math.round(viewport.h * 0.06),
      phase: Math.PI * 0.14,
      variant: "ring2",
    },
    {
      id: 3,
      src: "/astro/rings/ring-3.png",
      size: isMobile ? "40vmin" : "38vmin",
      rotZ: 48,
      speed: 50,
      originX: -Math.round(viewport.w * 0.28),
      originY: Math.round(viewport.h * 0.62),
      fieldX: Math.round(viewport.w * 0.64),
      fieldY: Math.round(viewport.h * 0.52),
      driftX: Math.round(viewport.w * 0.22),
      driftY: -Math.round(viewport.h * 0.15),
      swayX: Math.round(viewport.w * 0.08),
      swayY: Math.round(viewport.h * 0.06),
      phase: Math.PI * 1.62,
      variant: "ring3",
    },
    {
      id: 4,
      src: "/astro/rings/ring-4.png",
      size: isMobile ? "46vmin" : "44vmin",
      rotZ: -10,
      speed: -28,
      originX: Math.round(viewport.w * 0.65),
      originY: Math.round(viewport.h * 0.64),
      fieldX: Math.round(viewport.w * 0.66),
      fieldY: Math.round(viewport.h * 0.48),
      driftX: -Math.round(viewport.w * 0.2),
      driftY: -Math.round(viewport.h * 0.12),
      swayX: Math.round(viewport.w * 0.07),
      swayY: Math.round(viewport.h * 0.05),
      phase: Math.PI * 0.58,
      variant: "ring4",
    },
  ], [viewport.h, viewport.w, isMobile]);

  return (
    <div className={styles.ringsLayer}>
      {rings.map((r) => (
        <CornerRing
          key={r.id}
          {...r}
          progress={progress}
          time={time}
          mouseX={mouseX}
          mouseY={mouseY}
          playSound={playSound}
        />
      ))}
    </div>
  );
}
