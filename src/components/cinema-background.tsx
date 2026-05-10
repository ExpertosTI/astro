"use client";

import { motion, MotionValue } from "framer-motion";
import { RefObject } from "react";
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

const DESKTOP_VIDEO_SRC = "https://insforge-assets.s3.us-east-1.amazonaws.com/astro/backgrounds/VIDEO-FONDO-A-COLOR-WEB-GRANDE.mp4";
const MOBILE_WEBM_SRC = "/astro/backgrounds/mobile-bg.webm";

export default function CinemaBackground({
  videoRef, isMobile, videoReady, onVideoReady,
  mobileVideoScale, desktopColorReveal,
  desktopNebulaOpacity, desktopNebulaX, desktopNebulaY, desktopNebulaScale, desktopNebulaRotate,
  desktopRayOpacity, desktopRayX, desktopRayY, desktopRayScaleX, desktopRayScaleY,
  desktopLowerMaskOpacity, desktopFrameScale, desktopFrameY
}: CinemaBackgroundProps) {
  return (
    <>
      <div className={`${styles.bgFallback} ${videoReady ? styles.bgFallbackHidden : ""}`} />
      
      <motion.video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        preload="auto"
        poster={isMobile ? "/astro/backgrounds/mobile-color.jpg" : "/astro/backgrounds/IMAGEN-FONDO-A-COLOR-WEB-GRANDE.jpg"}
        className={styles.bgVideo}
        style={{ scale: isMobile ? (mobileVideoScale as any) : 1 }}
        onLoadedMetadata={onVideoReady}
        onLoadedData={onVideoReady}
        onCanPlay={onVideoReady}
        onCanPlayThrough={onVideoReady}
        onError={onVideoReady}
      >
        {isMobile ? (
          <source src={MOBILE_WEBM_SRC} type="video/webm" />
        ) : (
          <source src={DESKTOP_VIDEO_SRC} type="video/mp4" />
        )}
      </motion.video>

      {!isMobile && (
        <>
          <motion.div
            className={styles.desktopBwFrame}
            style={{ scale: desktopFrameScale, y: desktopFrameY }}
          />
          <motion.div
            className={styles.desktopColorFrame}
            style={{ opacity: desktopColorReveal, scale: desktopFrameScale, y: desktopFrameY }}
          />
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
