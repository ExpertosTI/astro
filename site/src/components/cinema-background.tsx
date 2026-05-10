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
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleVideoError = () => {
    console.error("Video load error: Enforcing high-fidelity fallback.");
    setHasError(true);
    onVideoReady(); // Permite que el preloader termine
  };

  if (!mounted) return null;

  const poster = isMobile ? ASTRO_CONFIG.assets.mobilePoster : ASTRO_CONFIG.assets.fallbackPoster;

  return (
    <>
      {/* Base sólida: El poster siempre está aquí debajo */}
      <div 
        className={styles.bgFallback} 
        style={{ 
          backgroundImage: `url(${poster})`,
          opacity: 1, // Siempre visible como base
          zIndex: 1
        }}
      />
      
      {!hasError && (
        <motion.video
          key={isMobile ? "mobile" : "desktop"}
          ref={videoRef}
          muted
          playsInline
          autoPlay
          loop={isMobile}
          preload="auto"
          poster={poster}
          className={styles.bgVideo}
          style={{ 
            scale: isMobile ? (mobileVideoScale as any) : 1,
            opacity: videoReady ? 1 : 0,
            zIndex: 2
          }}
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
      )}

      {!isMobile && (
        <>
          {/* Capas de efectos: Solo se ven si el video está listo o si hay error (como fallback) */}
          <motion.div 
            className={styles.desktopBwFrame} 
            style={{ 
              scale: desktopFrameScale, 
              y: desktopFrameY,
              zIndex: 3,
              opacity: (videoReady || hasError) ? 1 : 0
            }} 
          />
          <motion.div 
            className={styles.desktopColorFrame} 
            style={{ 
              opacity: hasError ? 1 : desktopColorReveal, 
              scale: desktopFrameScale, 
              y: desktopFrameY,
              zIndex: 4
            }} 
          />
          <motion.div
            className={styles.desktopNebulaFx}
            style={{
              opacity: hasError ? 0.6 : desktopNebulaOpacity,
              x: desktopNebulaX,
              y: desktopNebulaY,
              scale: desktopNebulaScale,
              rotate: desktopNebulaRotate,
              zIndex: 7
            }}
          />
          <motion.div
            className={styles.desktopRayFx}
            style={{
              opacity: hasError ? 0.4 : desktopRayOpacity,
              x: desktopRayX,
              y: desktopRayY,
              scaleX: desktopRayScaleX,
              scaleY: desktopRayScaleY,
              zIndex: 8
            }}
          />
          <motion.div 
            className={styles.desktopSplitMask} 
            style={{ opacity: desktopLowerMaskOpacity, zIndex: 6 }} 
          />
        </>
      )}
      
      <div className={styles.videoVignette} style={{ zIndex: 5 }} />
    </>
  );
}
