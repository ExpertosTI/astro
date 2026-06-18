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
    const t = setTimeout(() => {
      setMounted(true);
      // Si es escritorio, marcamos como "videoReady" inmediatamente ya que no cargamos video
      if (typeof window !== "undefined" && window.innerWidth >= 768) {
        onVideoReady();
      }
    }, 0);
    return () => clearTimeout(t);
  }, [onVideoReady]);

  if (!mounted) return null;

  const poster = isMobile ? ASTRO_CONFIG.assets.mobilePoster : ASTRO_CONFIG.assets.fallbackPoster;

  return (
    <>
      {/* Capa Base */}
      <div 
        className={styles.bgFallback} 
        style={{ 
          backgroundImage: `url(${poster})`,
          opacity: 1,
          zIndex: 1
        }}
      />
      
      {/* El video SOLO se carga en Móvil */}
      {isMobile && (
        <motion.video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          loop
          preload="auto"
          poster={poster}
          className={styles.bgVideo}
          style={{ 
            scale: mobileVideoScale,
            opacity: videoReady ? 1 : 0,
            zIndex: 2
          }}
          onLoadedMetadata={onVideoReady}
          onLoadedData={onVideoReady}
          onCanPlay={onVideoReady}
          onCanPlayThrough={onVideoReady}
          onError={onVideoReady}
        >
          <source src={ASTRO_CONFIG.videos.mobile} type="video/webm" />
        </motion.video>
      )}

      {!isMobile && (
        <>
          {/* En Escritorio usamos solo los frames de alta resolución con scroll FX */}
          <motion.div 
            className={styles.desktopBwFrame} 
            style={{ 
              scale: desktopFrameScale, 
              y: desktopFrameY,
              zIndex: 3,
              opacity: 1
            }} 
          />
          <motion.div 
            className={styles.desktopColorFrame} 
            style={{ 
              opacity: desktopColorReveal, 
              scale: desktopFrameScale, 
              y: desktopFrameY,
              zIndex: 4
            }} 
          />
          <motion.div
            className={styles.desktopNebulaFx}
            style={{
              opacity: desktopNebulaOpacity,
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
              opacity: desktopRayOpacity,
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
