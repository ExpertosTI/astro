"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useMotionValue } from "framer-motion";
import { useAstroAnimations } from "@/hooks/use-astro-animations";
import CinemaBackground from "./cinema-background";
import OrbitalSystem from "./orbital-system";
import NarrativeLayers from "./narrative-layers";
import ContactSystem from "./contact-system";
import Preloader from "./preloader";
import styles from "./astro-hero.module.css";

export default function AstroHero() {
  const [mounted, setMounted] = useState(false);
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [isMobile, setIsMobile] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  useEffect(() => {
    setMounted(true);
    
    // Forzar scroll al inicio para evitar solapamientos por restauración del navegador
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    const updateSize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      setIsMobile(window.innerWidth < 768);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth - 0.5);
      mouseY.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      window.removeEventListener("resize", updateSize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [mouseX, mouseY]);

  const {
    smoothStory, time,
    titleOpacity, titleY, editionOpacity,
    storyOpacity, storyY, coordsOpacity, coordsY, coordsSkew,
    contactOpacity, contactY,
    desktopColorReveal, desktopLowerMaskOpacity, desktopFrameScale, desktopFrameY, mobileVideoScale,
    desktopNebulaOpacity, desktopNebulaX, desktopNebulaY, desktopNebulaScale, desktopNebulaRotate,
    desktopRayOpacity, desktopRayX, desktopRayY, desktopRayScaleX, desktopRayScaleY,
    isGlitchingOut
  } = useAstroAnimations(isMobile, videoReady, videoRef);

  const playSound = (type: string) => {
    console.log("SFX:", type);
  };

  if (!mounted) return null;

  return (
    <main className={`${styles.page} ${preloaderDone ? styles.pageMounted : styles.locked}`}>
      {!preloaderDone && (
        <Preloader 
          onDone={() => setPreloaderDone(true)} 
          ready={videoReady} 
        />
      )}

      <section className={styles.heroShell}>
        <div className={styles.stage}>
          <CinemaBackground
            videoRef={videoRef}
            isMobile={isMobile}
            videoReady={videoReady}
            onVideoReady={() => setVideoReady(true)}
            mobileVideoScale={mobileVideoScale}
            desktopColorReveal={desktopColorReveal}
            desktopNebulaOpacity={desktopNebulaOpacity}
            desktopNebulaX={desktopNebulaX}
            desktopNebulaY={desktopNebulaY}
            desktopNebulaScale={desktopNebulaScale}
            desktopNebulaRotate={desktopNebulaRotate}
            desktopRayOpacity={desktopRayOpacity}
            desktopRayX={desktopRayX}
            desktopRayY={desktopRayY}
            desktopRayScaleX={desktopRayScaleX}
            desktopRayScaleY={desktopRayScaleY}
            desktopLowerMaskOpacity={desktopLowerMaskOpacity}
            desktopFrameScale={desktopFrameScale}
            desktopFrameY={desktopFrameY}
          />

          {/* Solo renderizamos si tenemos viewport para evitar anillos en el centro (0,0) */}
          {viewport.w > 0 && (
            <OrbitalSystem
              progress={smoothStory}
              time={time}
              mouseX={mouseX}
              mouseY={mouseY}
              playSound={playSound as any}
              isMobile={isMobile}
              viewport={viewport}
            />
          )}

          <NarrativeLayers
            titleOpacity={titleOpacity}
            titleY={titleY}
            editionOpacity={editionOpacity}
            storyOpacity={storyOpacity}
            storyY={storyY}
            coordsOpacity={coordsOpacity}
            coordsY={coordsY}
            coordsSkew={coordsSkew}
            isGlitchingOut={isGlitchingOut}
            isMobile={isMobile}
          />

          <ContactSystem
            opacity={contactOpacity}
            y={contactY}
            isMobile={isMobile}
          />

          <div className={styles.hudOverlay} aria-hidden="true">
            <div className={`${styles.hudCorner} ${styles.topLeft}`} />
            <div className={`${styles.hudCorner} ${styles.topRight}`} />
            <div className={`${styles.hudCorner} ${styles.bottomLeft}`} />
            <div className={`${styles.hudCorner} ${styles.bottomRight}`} />
          </div>

          <div className={styles.grain} />
        </div>
      </section>
    </main>
  );
}
