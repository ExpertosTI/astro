"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./astro-hero.module.css";

// Modular Components
import Preloader from "./preloader";
import CinemaBackground from "./cinema-background";
import OrbitalSystem from "./orbital-system";
import NarrativeLayers from "./narrative-layers";
import ContactSystem from "./contact-system";
import AdminAccessModal from "./admin-access-modal";

// Hooks & Services
import { useViewport } from "@/hooks/use-viewport";
import { useAstroAnimations } from "@/hooks/use-astro-animations";
import { AudioService } from "@/services/audio-service";
import { initStarAnimation } from "@/utils/star-animation";

export default function AstroHero() {
  const { isMobile, viewport } = useViewport();
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animation Orchestrator
  const anim = useAstroAnimations(isMobile, videoReady, videoRef);

  useEffect(() => {
    if (canvasRef.current) {
      return initStarAnimation(canvasRef.current, isMobile);
    }
  }, [isMobile]);

  return (
    <>
      <AnimatePresence>
        {!preloaderDone && <Preloader onDone={() => setPreloaderDone(true)} ready={videoReady} />}
      </AnimatePresence>

      <main className={`${styles.page} ${preloaderDone ? styles.pageMounted : ""}`}>
        <section className={styles.heroShell}>
          <motion.div 
            className={styles.stage} 
            style={{ rotateX: anim.cameraRotateX, rotateY: anim.cameraRotateY, zIndex: 1 }}
          >
            <CinemaBackground 
              videoRef={videoRef}
              isMobile={isMobile}
              videoReady={videoReady}
              onVideoReady={() => setVideoReady(true)}
              mobileVideoScale={anim.mobileVideoScale}
              desktopColorReveal={anim.desktopColorReveal}
              desktopNebulaOpacity={anim.desktopNebulaOpacity}
              desktopNebulaX={anim.desktopNebulaX}
              desktopNebulaY={anim.desktopNebulaY}
              desktopNebulaScale={anim.desktopNebulaScale}
              desktopNebulaRotate={anim.desktopNebulaRotate}
              desktopRayOpacity={anim.desktopRayOpacity}
              desktopRayX={anim.desktopRayX}
              desktopRayY={anim.desktopRayY}
              desktopRayScaleX={anim.desktopRayScaleX}
              desktopRayScaleY={anim.desktopRayScaleY}
              desktopLowerMaskOpacity={anim.desktopLowerMaskOpacity}
              desktopFrameScale={anim.desktopFrameScale}
              desktopFrameY={anim.desktopFrameY}
            />

            <canvas ref={canvasRef} className={styles.spaceCanvas} />

            <div 
              className={styles.secretTrigger} 
              onDoubleClick={() => { setShowAdminModal(true); AudioService.play("glitch"); }} 
            />

            <OrbitalSystem 
              isMobile={isMobile}
              viewport={viewport}
              progress={anim.smoothStory}
              time={anim.time}
              mouseX={anim.mouseX}
              mouseY={anim.mouseY}
              playSound={AudioService.play}
            />

            <NarrativeLayers 
              isMobile={isMobile}
              isGlitchingOut={anim.isGlitchingOut}
              titleOpacity={anim.titleOpacity}
              titleY={anim.titleY}
              editionOpacity={anim.editionOpacity}
              storyOpacity={anim.storyOpacity}
              storyY={anim.storyY}
              coordsOpacity={anim.coordsOpacity}
              coordsSkew={anim.coordsSkew}
            />

            <ContactSystem 
              isMobile={isMobile}
              opacity={anim.contactOpacity}
              y={anim.contactY}
            />

            <div className={styles.grain} aria-hidden="true" />
            
            {/* HUD Overlay */}
            <div className={styles.hudOverlay} aria-hidden="true">
              <div className={`${styles.hudCorner} ${styles.topLeft}`} />
              <div className={`${styles.hudCorner} ${styles.topRight}`} />
              <div className={`${styles.hudCorner} ${styles.bottomLeft}`} />
              <div className={`${styles.hudCorner} ${styles.bottomRight}`} />
            </div>
          </motion.div>
        </section>
      </main>

      <AdminAccessModal 
        isOpen={showAdminModal} 
        onClose={() => setShowAdminModal(false)}
        onSuccess={() => setShowAdminModal(false)}
      />
    </>
  );
}
