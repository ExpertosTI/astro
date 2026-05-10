"use client";

import { motion, MotionValue } from "framer-motion";
import { RefObject, useEffect, useState } from "react";
import { ASTRO_CONFIG } from "@/config/astro-config";
import styles from "./astro-hero.module.css";

interface CinemaBackgroundProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  isMobile: boolean;
  videoReady: boolean;
  onVideoReady: () => void;
  mobileVideoScale: MotionValue<number> | number;
  desktopColorReveal: MotionValue<number>;
  desktopNebulaOpacity: MotionValue<number>;
  desktopNebulaX: MotionValue<number>;
  desktopNebulaY: MotionValue<number>;
  desktopNebulaScale: MotionValue<number>;
  desktopNebulaRotate: MotionValue<number>;
  desktopRayOpacity: MotionValue<number>;
  desktopRayX: MotionValue<number>;
  desktopRayY: MotionValue<number>;
  desktopRayScaleX: MotionValue<number>;
  desktopRayScaleY: MotionValue<number>;
  desktopLowerMaskOpacity: MotionValue<number>;
  desktopFrameScale: MotionValue<number>;
  desktopFrameY: MotionValue<number>;
}

export default function CinemaBackground({
  videoRef, isMobile, videoReady, onVideoReady,
  mobileVideoScale, desktopColorReveal,
  desktopNebulaOpacity, desktopNebulaX, desktopNebulaY, desktopNebulaScale, desktopNebulaRotate,
  desktopRayOpacity, desktopRayX, desktopRayY, desktopRayScaleX, desktopRayScaleY,
  desktopLowerMaskOpacity, desktopFrameScale, desktopFrameY
}: CinemaBackgroundProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Si el video falla, disparamos onVideoReady para no bloquear el preloader
  const handleVideoError = () => {
    console.warn("Video failed to load, switching to fallback poster.");
    onVideoReady();
  };

  if (!mounted) return null;

  return (
    <>
      <div className={`${styles.bgFallback} ${videoReady ? styles.bgFallbackHidden : ""}`} />
      
      <motion.video
        key={isMobile ? "mobile" : "desktop"} // Forzamos re-render si cambia el dispositivo
        ref={videoRef}
        muted
        playsInline
        autoPlay
        loop={isMobile}
        preload="auto"
        poster={isMobile ? ASTRO_CONFIG.assets.mobilePoster : ASTRO_CONFIG.assets.fallbackPoster}
        className={styles.bgVideo}
        style={{ scale: isMobile ? (mobileVideoScale as any) : 1 }}
        onLoadedMetadata={onVideoReady}
        onLoadedData={onVideoReady}
        onCanPlay={onVideoReady}
        onCanPlayThrough={onVideoReady}
        onError={handleVideoError}
      >
        <source 
          src={isMobile ? ASTRO_CONFIG.videos.mobile : ASTRO_CONFIG.videos.desktop} 
          type={isMobile ? "video/webm" : "video/mp4"} 
        />
      </motion.video>

      {!isMobile && (
        <>
          <motion.div className={styles.desktopBwFrame} style={{ scale: desktopFrameScale, y: desktopFrameY }} />
          <motion.div className={styles.desktopColorFrame} style={{ opacity: desktopColorReveal, scale: desktopFrameScale, y: desktopFrameY }} />
          <motion.div
            className={styles.desktopNebulaFx}
            style={{
              opacity: desktopNebulaOpacity,
              x: desktopNebulaX,
              y: desktopNebulaY,
              scale: desktopNebulaScale,
              rotate: desktopNebulaRotate,
            }}
          />
          <motion.div
            className={styles.desktopRayFx}
            style={{
              opacity: desktopRayOpacity,
              x: desktopRayX,
              y: desktopRayY,
              scaleX: desktopRayScaleX,
              scaleY: desktopRayScaleY,
            }}
          />
          <motion.div className={styles.desktopSplitMask} style={{ opacity: desktopLowerMaskOpacity }} />
        </>
      )}
      
      <div className={styles.videoVignette} />
    </>
  );
}
