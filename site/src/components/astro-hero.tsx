"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValueEvent, useMotionValue } from "framer-motion";
import { editionData as localEditionData } from "@/content/edition";
import styles from "./astro-hero.module.css";

// Modular components
import OrbitalSystem from "./orbital-system";
import AdminAccessModal from "./admin-access-modal";
import CinemaBackground from "./cinema-background";

// Hooks & Services
import { useViewport } from "@/hooks/use-viewport";
import { AudioService } from "@/services/audio-service";
import { LeadService, ContactChannel } from "@/services/lead-service";
import { initStarAnimation } from "@/utils/star-animation";

// Constants
const VIDEO_SCRUB_START = 1.2;
const VIDEO_SCRUB_END_PADDING = 0.25;

function ChannelIcon({ channel }: { channel: ContactChannel }) {
  if (channel === "mail") return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.channelIcon}>
      <path d="M3 6h18v12H3z" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M3 7l9 7 9-7" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
  if (channel === "ig") return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.channelIcon}>
      <rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="3.7" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
    </svg>
  );
  if (channel === "fb") return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.channelIcon}>
      <path d="M13 21v-7h2.4l.4-3H13V9.2c0-.9.3-1.5 1.6-1.5h1.4V5.1c-.2 0-1-.1-2-.1-2 0-3.4 1.2-3.4 3.5V11H8.2v3h2.4v7h2.4z" fill="currentColor" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.channelIcon}>
      <path d="M12 3.2A8.8 8.8 0 0 0 4.6 17.8L3.5 22l4.3-1.1A8.8 8.8 0 1 0 12 3.2z" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M8.4 9.1c.1-.2.2-.2.4-.2h.8c.1 0 .3 0 .4.3l.6 1.5c.1.2.1.3 0 .5l-.5.7c-.1.2-.1.3 0 .5.3.5 1 .9 1.4 1.2.5.3.9.5 1.4.2l.7-.4c.2-.1.3-.1.5 0l1.4.7c.2.1.2.2.2.4v.8c0 .2-.1.3-.2.4-.3.3-.8.5-1.3.5-2.9 0-6-3-6-5.9 0-.5.2-1 .4-1.2z" fill="currentColor" />
    </svg>
  );
}

// Preloader component is kept here for now as it's tightly coupled to the loading state
function Preloader({ onDone, ready }: { onDone: () => void; ready: boolean }) {
  const ELEMENTS = ["/astro/elements/ELMENTO-1.png", "/astro/elements/ELEMENTO-2.png", "/astro/elements/ELEMENTO-3.png", "/astro/elements/ELEMENTO-4.png"];
  const SEQUENCE = [...ELEMENTS, localEditionData.logo];
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
  }, [ready, onDone, SEQUENCE.length]);

  return (
    <motion.div className={styles.preloader} exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }} transition={{ duration: 0.8 }}>
      <div className={styles.preloaderInner}>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }} className={styles.preloaderAsset}>
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              <img src={SEQUENCE[step]} alt="loading" style={{ objectFit: "contain", width: "100%", height: "100%" }} />
            </div>
          </motion.div>
        </AnimatePresence>
        <div className={styles.preloaderLine}>
          <motion.div className={styles.preloaderProgress} initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.4 }} />
        </div>
      </div>
    </motion.div>
  );
}

export default function AstroHero() {
  const { isMobile, viewport } = useViewport();
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  
  const [contactChannel, setContactChannel] = useState<ContactChannel>("ig");
  const [contactValue, setContactValue] = useState("");
  const [contactValue2, setContactValue2] = useState("");
  const [notifySent, setNotifySent] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");

  const [showAdminModal, setShowAdminModal] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { scrollYProgress } = useScroll();
  const smoothStory = useSpring(scrollYProgress, { stiffness: 45, damping: 20, restDelta: 0.001 });
  
  const time = useMotionValue(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothInteraction = useSpring(useTransform(time, [0, 100], [0, 100]), { stiffness: 40, damping: 25 });

  useEffect(() => {
    if (canvasRef.current) {
      return initStarAnimation(canvasRef.current, isMobile);
    }
  }, [isMobile]);

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await LeadService.registerLead({ 
      value: contactValue, 
      value2: contactValue2, 
      channel: contactChannel 
    });
    if (success) {
      setNotifySent(true);
      setNotifyMessage("REGISTRO COMPLETADO. RECIBIRÁS UN AVISO PRONTO.");
      AudioService.play("transition");
    }
  };

  const titleOpacity = useTransform(smoothStory, [0.02, 0.10], [0, 1]);
  const titleY = useTransform(smoothStory, [0.85, 0.95], ["22vh", "8vh"]); 
  const storyOpacity = useTransform(smoothStory, [0.35, 0.45], [0, 1]);
  const storyY = useTransform(smoothStory, [0.85, 0.95], ["48vh", "32vh"]); 
  const contactOpacity = useTransform(smoothStory, [0.90, 0.98], [0, 1]);
  const contactY = useTransform(smoothStory, [0.90, 1], ["75vh", "65vh"]);

  const desktopColorReveal = useTransform(smoothStory, [0.06, 0.56], [0, 1]);
  const desktopLowerMaskOpacity = useTransform(smoothStory, [0, 0.28], [0.8, 0.14]);
  const desktopFrameScale = useTransform(smoothStory, [0, 1], [1.02, 1.08]);
  const desktopFrameY = useTransform(smoothStory, [0, 1], [-8, 12]);
  
  const desktopNebulaOpacity = useTransform(smoothInteraction, [0.1, 0.26, 0.48, 0.76, 1], [0, 0.26, 0.7, 0.95, 0.78]);
  const desktopNebulaX = useTransform(smoothInteraction, [0, 1], [-22, 28]);
  const desktopNebulaY = useTransform(smoothInteraction, [0, 1], [24, -16]);
  const desktopNebulaScale = useTransform(smoothInteraction, [0, 1], [0.92, 1.24]);
  const desktopNebulaRotate = useTransform(smoothInteraction, [0, 1], [-7, 9]);

  const desktopRayOpacity = useTransform(smoothInteraction, [0.16, 0.36, 0.58, 0.84, 1], [0, 0.52, 0.18, 0.82, 0.36]);
  const desktopRayX = useTransform(smoothInteraction, [0, 1], [-42, 54]);
  const desktopRayY = useTransform(smoothInteraction, [0, 1], [18, -22]);
  const desktopRayScaleX = useTransform(smoothInteraction, [0, 1], [0.96, 1.12]);
  const desktopRayScaleY = useTransform(smoothInteraction, [0, 1], [0.98, 1.06]);

  const cameraRotateX = useTransform(smoothInteraction, [0, 0.5, 1], [1.2, 0, -1.2]);
  const cameraRotateY = useTransform(smoothInteraction, [0, 0.5, 1], [-0.8, 0, 0.8]);
  const mobileVideoScale = useTransform(smoothStory, [0.8, 1], [1.18, 1.25]);

  const editionOpacity = useTransform(smoothStory, [0.05, 0.15, 0.30, 0.40], [0, 1, 1, 0]);
  const coordsOpacity = useTransform(smoothStory, [0.45, 0.55, 0.75, 0.85], [0, 1, 1, 0]);
  const coordsSkew    = useTransform(smoothStory, [0.45, 0.55, 0.65], isMobile ? [6, 0, 0] : [4, 0, 0]);

  useMotionValueEvent(smoothStory, "change", (v) => {
    if (!isMobile) {
      const video = videoRef.current;
      if (video && videoReady) {
        const usableDuration = Math.max(video.duration - VIDEO_SCRUB_START - VIDEO_SCRUB_END_PADDING, 0.01);
        video.currentTime = VIDEO_SCRUB_START + (v * usableDuration);
      }
    }
  });

  return (
    <>
      <AnimatePresence>
        {!preloaderDone && (
          <Preloader onDone={() => setPreloaderDone(true)} ready={videoReady} />
        )}
      </AnimatePresence>

      <main className={`${styles.page} ${preloaderDone ? styles.pageMounted : ""}`}>
        <section className={styles.heroShell}>
          <motion.div className={styles.stage} style={{ rotateX: cameraRotateX, rotateY: cameraRotateY, zIndex: 1 }}>
            
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

            <canvas ref={canvasRef} className={styles.spaceCanvas} />

            <div className={styles.secretTrigger} onDoubleClick={() => { setShowAdminModal(true); AudioService.play("glitch"); }} />

            <OrbitalSystem 
              isMobile={isMobile}
              viewport={viewport}
              progress={smoothStory}
              time={time}
              mouseX={mouseX}
              mouseY={mouseY}
              playSound={AudioService.play}
            />

            <motion.div className={styles.titleBlock} style={{ opacity: titleOpacity, y: titleY, zIndex: 55 }}>
              <h2 className={styles.mainTitle}>ASTRO SDQ</h2>
              <motion.p className={styles.edition} style={{ opacity: editionOpacity }}>5TA EDICIÓN</motion.p>
            </motion.div>

            <motion.div className={`${styles.coordBlock} ${styles.terminalFrame}`} style={{ opacity: coordsOpacity, y: storyY, skewY: coordsSkew, zIndex: 50 }}>
              <div className={styles.terminalGlow} />
              <p className={styles.location}>{localEditionData.location}</p>
              <p className={styles.coordinates}>{localEditionData.coordinates}</p>
            </motion.div>

            <motion.div className={`${styles.contactBlock} ${styles.notifyConsole}`} style={{ opacity: contactOpacity, y: contactY, zIndex: 60 }}>
              <AnimatePresence mode="wait">
                {!notifySent ? (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}>
                    <p className={styles.contactTitle}>DEJA TU CONTACTO PARA AVISO DE APERTURA</p>
                    <div className={styles.channelToggle}>
                      {(["ig", "whatsapp", "mail", "fb"] as ContactChannel[]).map((ch) => (
                        <button 
                          key={ch} 
                          className={`${styles.channelButton} ${contactChannel === ch ? styles.channelButtonActive : ""}`}
                          onClick={() => { setContactChannel(ch); AudioService.play("click"); }}
                        >
                          <ChannelIcon channel={ch} />
                          <span>{ch === "ig" ? "INSTAGRAM" : ch.toUpperCase()}</span>
                        </button>
                      ))}
                    </div>
                    <form className={styles.notifyForm} onSubmit={handleNotifySubmit}>
                      <div className={styles.notifyInputGroup}>
                        <input className={styles.notifyInput} value={contactValue} onChange={e => setContactValue(e.target.value)} placeholder="NOMBRE / IG / USER" required />
                        <input className={styles.notifyInput} value={contactValue2} onChange={e => setContactValue2(e.target.value)} placeholder="WHATSAPP / EMAIL" required />
                      </div>
                      <button className={styles.notifyButton} type="submit" onClick={() => AudioService.play("click")}>NOTIFICARME</button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} className={styles.successContainer}>
                    <h3 className={styles.successTitle}>ACCESO CONCEDIDO</h3>
                    <p className={styles.successText}>{notifyMessage}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <div className={styles.grain} />
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
