"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import {
  motion, AnimatePresence,
  useScroll, useTransform, useSpring, MotionValue, useMotionValueEvent, useTime, useMotionValue, animate,
} from "framer-motion";
import { editionData as localEditionData } from "@/content/edition";
import { ASTRO_CONFIG } from "@/config/astro-config";
import { verifyAdminPassword, createAdminSession } from "@/lib/admin-auth";
import { LeadService, type ContactChannel } from "@/services/lead-service";
import Link from "next/link";
import styles from "./astro-hero.module.css";

/* ────────────────────────────────────────────────────────
   PRELOADER: loop hasta que ready (video cargado) + 1 ciclo completo
──────────────────────────────────────────────────────── */
const ELEMENTS = ASTRO_CONFIG.assets.preloader;
const PRELOADER_SEQUENCE = [...ELEMENTS, localEditionData.logo];
const PRELOADER_LOGO_STEP = PRELOADER_SEQUENCE.length - 1;
const VIDEO_SCRUB_START = ASTRO_CONFIG.videos.scrubStart;
const VIDEO_SCRUB_END_PADDING = ASTRO_CONFIG.videos.scrubEndPadding;
const MOBILE_WEBM_SRC = ASTRO_CONFIG.videos.mobile;
const DESKTOP_VIDEO_SRC = ASTRO_CONFIG.videos.desktop;

function ChannelIcon({ channel }: { channel: ContactChannel }) {
  if (channel === "mail") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.channelIcon}>
        <path d="M3 6h18v12H3z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 7l9 7 9-7" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (channel === "ig") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.channelIcon}>
        <rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.7" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (channel === "fb") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.channelIcon}>
        <path d="M13 21v-7h2.4l.4-3H13V9.2c0-.9.3-1.5 1.6-1.5h1.4V5.1c-.2 0-1-.1-2-.1-2 0-3.4 1.2-3.4 3.5V11H8.2v3h2.4v7h2.4z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.channelIcon}>
      <path d="M12 3.2A8.8 8.8 0 0 0 4.6 17.8L3.5 22l4.3-1.1A8.8 8.8 0 1 0 12 3.2z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.4 9.1c.1-.2.2-.2.4-.2h.8c.1 0 .3 0 .4.3l.6 1.5c.1.2.1.3 0 .5l-.5.7c-.1.2-.1.3 0 .5.3.5 1 .9 1.4 1.2.5.3.9.5 1.4.2l.7-.4c.2-.1.3-.1.5 0l1.4.7c.2.1.2.2.2.4v.8c0 .2-.1.3-.2.4-.3.3-.8.5-1.3.5-2.9 0-6-3-6-5.9 0-.5.2-1 .4-1.2z" fill="currentColor" />
    </svg>
  );
}

function Preloader({ onDone, ready }: { onDone: () => void; ready: boolean }) {
  const [step, setStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (step < PRELOADER_LOGO_STEP) {
      const t = setTimeout(() => setStep((s) => s + 1), 850);
      return () => clearTimeout(t);
    }

    if (step === PRELOADER_LOGO_STEP && ready && !isExiting) {
      const t = setTimeout(() => setIsExiting(true), 0);
      return () => clearTimeout(t);
    }

    return undefined;
  }, [step, ready, isExiting]);

  useEffect(() => {
    if (!isExiting) return;
    const t = setTimeout(onDone, 950);
    return () => clearTimeout(t);
  }, [isExiting, onDone]);

  return (
    <motion.div
      className={styles.preloader}
      initial={{ opacity: 1 }}
      animate={isExiting
        ? {
            opacity: [1, 1, 0.4, 1, 0],
            x: [0, -6, 8, -4, 0],
            filter: ["brightness(1) blur(0px)", "brightness(1.5) blur(2px)", "contrast(1.4) blur(0px)", "brightness(1.2) blur(4px)", "brightness(0) blur(10px)"],
          }
        : { opacity: 1, x: 0, filter: "brightness(1) blur(0px)" }}
      transition={{ duration: isExiting ? 0.9 : 0.2, ease: "easeInOut" }}
      exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } }}
    >
      <div className={`${styles.missionHud} ${isExiting ? styles.missionHudActive : ""}`}>
        <p className={styles.missionText}>MISSION CONTROL // ASTRO SDQ LINKED</p>
      </div>
      <div className={styles.preloaderInner}>
        {PRELOADER_SEQUENCE.map((src, i) => (
          <motion.div
            key={src}
            className={styles.preloaderElement}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={i === step ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.88 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image
              src={src}
              alt={i === PRELOADER_LOGO_STEP ? "logo astro" : `elemento ${i + 1}`}
              fill
              priority={i >= PRELOADER_LOGO_STEP - 1 || i === 0}
              className={i === PRELOADER_LOGO_STEP ? styles.preloaderLogoImg : styles.preloaderImg}
              style={{ objectFit: "contain" }}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function CornerRing({
  src, size, rotZ, speed, originX, originY, fieldX, fieldY, driftX, driftY, swayX, swayY, phase, progress, time, mouseX, mouseY, playSound, onCollect,
}: {
  src: string; size: string; rotZ: number; speed: number;
  originX: number; originY: number; fieldX: number; fieldY: number; driftX: number; driftY: number;
  swayX: number; swayY: number; phase: number; progress: MotionValue<number>;
  time: MotionValue<number>;
  mouseX: MotionValue<number>; mouseY: MotionValue<number>;
  playSound: (type: "glitch" | "type" | "click" | "transition") => void;
  onCollect: () => void;
}) {
  const [isBursting, setIsBursting] = useState(false);
  const [isCollected, setIsCollected] = useState(false);

  const handleRingClick = () => {
    if (isBursting || isCollected) return;
    setIsBursting(true);
    playSound("glitch");
    // Al "tomar" el anillo, primero explota y luego desaparece permanentemente
    setTimeout(() => {
      setIsBursting(false);
      setIsCollected(true);
      onCollect();
    }, 600);
  };
  const wrap = (value: number, limit: number) => {
    const span = limit * 2;
    return ((((value + limit) % span) + span) % span) - limit;
  };

  const dx = useTransform([progress, time, mouseX], ([p, t, mx]) => {
    const driftAutoX = Math.sin((t as number) / 2800 + phase) * 35 + Math.sin((t as number) / 1400) * 12;
    const travelX = originX + driftX * (p as number) + phase * swayX * 0.7;
    const mouseReaction = (mx as number) !== 0 ? (mx as number) * 65 * (Math.sin(phase) + 1.2) : 0;
    return wrap(travelX, fieldX) + driftAutoX + mouseReaction;
  });

  const dy = useTransform([progress, time, mouseY], ([p, t, my]) => {
    const driftAutoY = Math.cos((t as number) / 3200 + phase) * 35 + Math.cos((t as number) / 1600) * 12;
    const travelY = originY + driftY * (p as number) + phase * swayY * 0.6;
    const mouseReaction = (my as number) !== 0 ? (my as number) * 65 * (Math.cos(phase) + 1.2) : 0;
    return wrap(travelY, fieldY) + driftAutoY + mouseReaction;
  });

  const idleRot = useTransform(time, (t) => Math.sin(t / 4000 + phase) * 4);
  const dz = useTransform(progress, [0, 1], [0, 450]);
  const scrollRot = useTransform(progress, (value) => rotZ + value * speed * 3.5);
  const totalRot = useTransform([scrollRot, idleRot], ([sr, ir]) => (sr as number) + (ir as number));

  const visualProgress = useTransform(progress, (v) => Math.min(Math.max(v % 1.2, 0), 1));

  const ringBlur = useTransform(
    visualProgress,
    [0, 0.2, 0.5, 0.8, 1],
    [8.0, 0, 0, 10.0, 25.0],
    { clamp: true }
  );
  
  const ringFilter = useTransform(ringBlur, (value) => value > 0.05 ? `blur(${value.toFixed(1)}px) brightness(${1 - value/20})` : "none");
  const breatheScale = useTransform(time, (t) => 1 + Math.sin(t / 2200 + phase) * 0.04);
  const ringOpacity = useTransform(visualProgress, [0, 0.15, 0.85, 1], [0, 0.28, 0.28, 0], { clamp: true });
  
  // Efecto Orbital: escala pulsante y deriva errática (reducido para sutileza)
  const orbitalScale = useTransform([visualProgress, time], ([vp, t]) => {
    const pulse = Math.sin((t as number) / 4000 + phase) * 0.04;
    const distanceFactor = 0.82 + Math.sin((vp as number) * Math.PI + phase) * 0.18;
    return distanceFactor + pulse;
  });

  const finalScale = useTransform([orbitalScale, breatheScale], ([os, brs]) => (os as number) * (brs as number));
  const ringZIndex = useTransform(visualProgress, (value) => (value > 0.5 ? 120 : 40));
  
  const displayOpacity = useTransform(ringOpacity, (v) => isCollected ? 0 : v);

  return (
    <motion.div
      className={`${styles.orbitalRing} ${isBursting ? styles.ringBurstActive : ""}`}
      whileHover={{ scale: 1.1, filter: "brightness(1.5) contrast(1.2)" }}
      style={{
        width: size,
        height: size,
        x: dx,
        y: dy,
        z: dz,
        rotate: totalRot,
        scale: finalScale,
        opacity: displayOpacity,
        filter: ringFilter,
        zIndex: ringZIndex,
        pointerEvents: "none",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img 
        src={src} 
        className={styles.ringImage} 
        alt="Orbital Ring"
        onClick={handleRingClick}
        style={{
          cursor: "pointer",
          pointerEvents: isCollected ? "none" : "auto",
        }}
      />
      {isBursting && (
        <>
          <div className={styles.ringBurstEffect} />
          <motion.div 
            className={styles.ringGhost} 
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        </>
      )}
    </motion.div>
  );
}

export default function AstroHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [videoReady, setVideoReady]       = useState(false);
  const [preloaderAssetsLoaded, setPreloaderAssetsLoaded] = useState(false);
  const [introReady, setIntroReady]       = useState(false);
  const [viewport, setViewport] = useState({ w: 1920, h: 1080 });
  const [isMobile, setIsMobile] = useState(true); // Mobile first para evitar carga pesada
  const [contactChannel, setContactChannel] = useState<ContactChannel>("ig");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [notifySent, setNotifySent] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [typingStarted, setTypingStarted] = useState(false);
  const [typedLocation, setTypedLocation] = useState("");
  const [editionData] = useState(localEditionData);
  const [isGlitching, setIsGlitching] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const [collectedCount, setCollectedCount] = useState(0);
  const [showRedirecting, setShowRedirecting] = useState(false);
  const [missionTime, setMissionTime] = useState("00:00");

  const handleRingCollect = () => {
    setCollectedCount((prev) => {
      const next = prev + 1;
      if (next === 8) {
        playSound("transition");
        setShowRedirecting(true);
        setTimeout(() => {
          window.location.href = "/admin";
        }, 3200);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!preloaderDone) return;
    const start = Date.now();
    const interval = setInterval(() => {
      const diff = Date.now() - start;
      const secs = Math.floor(diff / 1000) % 60;
      const mins = Math.floor(diff / 60000);
      setMissionTime(
        `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [preloaderDone]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const soundRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const playSound = (type: "glitch" | "type" | "click" | "transition") => {
    if (typeof window === "undefined") return;
    try {
      if (!soundRefs.current[type]) {
        const audio = new Audio();
        // Solo usamos rutas locales para evitar errores de consola por Mixkit
        audio.src = `/astro/sfx/${type}.mp3`;
        audio.volume = type === "glitch" ? 0.15 : 0.25;
        audio.preload = "auto";
        soundRefs.current[type] = audio;
      }
      const s = soundRefs.current[type];
      s.currentTime = 0;
      const playPromise = s.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Fallback silencioso si el navegador aún bloquea
        });
      }
    } catch { /* silent */ }
  };

  // Desbloqueo de video y audio global tras primer interacción
  useEffect(() => {
    const unlock = () => {
      if (videoRef.current && isMobile) {
        videoRef.current.loop = false;
        videoRef.current.play().catch(() => {});
      }
      playSound("click");
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("click", unlock);
    window.addEventListener("touchstart", unlock);
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, [isMobile]);

  // Carga e inicialización imperativa del video para evitar reseteos en renders secundarios
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const targetSrc = isMobile ? MOBILE_WEBM_SRC : DESKTOP_VIDEO_SRC;
      const currentSrc = video.src || "";
      if (!currentSrc.endsWith(targetSrc)) {
        video.src = targetSrc;
        video.loop = false;
        video.load();
      }
    }
  }, [isMobile]);
  const PRELOADER_ASSETS = useMemo(() => [
    ...ELEMENTS,
    localEditionData.logo,
  ], []);

  const SECONDARY_ASSETS = useMemo(() => [
    "/astro/backgrounds/desktop-bw.jpg",
    "/astro/backgrounds/desktop-color.jpg",
    "/astro/backgrounds/mobile-bw.jpg",
    "/astro/backgrounds/mobile-color.jpg",
    "/astro/rings/ring-1.png",
    "/astro/rings/ring-2.png",
    "/astro/rings/ring-3.png",
    "/astro/rings/ring-4.png",
  ], []);

  useEffect(() => {
    let loadedCount = 0;
    const total = PRELOADER_ASSETS.length;

    PRELOADER_ASSETS.forEach(src => {
      const img = new window.Image();
      img.src = src;
      img.onload = () => {
        loadedCount++;
        if (loadedCount >= total) setPreloaderAssetsLoaded(true);
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount >= total) setPreloaderAssetsLoaded(true);
      };
    });

    // Load secondary assets in background without blocking preloader
    SECONDARY_ASSETS.forEach(src => {
      const img = new window.Image();
      img.src = src;
    });
  }, [PRELOADER_ASSETS, SECONDARY_ASSETS]);

  useEffect(() => {
    // Si el video tarda más de 3 segundos, cargamos de todos modos
    const videoFallback = setTimeout(() => {
      if (!isMobile && !videoReady) setVideoReady(true);
    }, 3000);

    const isReady = preloaderAssetsLoaded && (isMobile ? true : videoReady);
    
    if (isReady) {
      clearTimeout(videoFallback);
      const t = setTimeout(() => setIntroReady(true), 200); 
      return () => clearTimeout(t);
    }
    return () => clearTimeout(videoFallback);
  }, [preloaderAssetsLoaded, videoReady, isMobile]);

  useEffect(() => {
    const onResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      setIsMobile(window.innerWidth <= 768);
    };
    onResize();
    window.addEventListener("resize", onResize);

    const onMouseMove = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth) * 2 - 1);
      mouseY.set((e.clientY / window.innerHeight) * 2 - 1);
    };

    if (!isMobile) {
      window.addEventListener("mousemove", onMouseMove);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [isMobile, mouseX, mouseY]);

  const { scrollYProgress } = useScroll();
  const storyProgress = useMotionValue(0);
  const interactionProgress = useMotionValue(0);
  
  const smoothStory = useSpring(storyProgress, { stiffness: 45, damping: 20, restDelta: 0.0001, mass: 0.8 });
  const smoothInteraction = useSpring(interactionProgress, { stiffness: 35, damping: 25, restDelta: 0.0001, mass: 1 });

  const handleIntroDone = () => {
    setPreloaderDone(true);
    // Iniciamos la animación con un pequeño delay para asegurar el montaje
    setTimeout(() => {
      animate(storyProgress, 1, { 
        duration: 10.5, 
        ease: "linear",
        onComplete: () => {
          setIntroFinished(true);
        }
      });
    }, 100);
  };

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    interactionProgress.set(v);
  });

  useMotionValueEvent(storyProgress, "change", (v) => {
    const prev = storyProgress.getPrevious() || 0;
    const thresholds = [0.4, 0.8];
    thresholds.forEach(t => {
      if (prev < t && v >= t) {
        setIsGlitching(true);
        playSound("transition");
        setTimeout(() => setIsGlitching(false), 120);
      }
    });
  });
  const time = useTime();

  const ringsProgress = useTransform([smoothInteraction, smoothStory, time], ([v, , t]) => {
    const auto = (t as number) / 26000; 
    const scrollFactor = isMobile ? 2.5 : 2.8;
    const boost = (v as number) > 0.9 ? 1.2 : 1.0;
    
    // El scroll solo afecta cuando la historia ha terminado (introFinished === true)
    const scrollActivation = introFinished ? 1 : 0;
    const effectiveScroll = (v as number) * scrollActivation;
    
    return auto + effectiveScroll * scrollFactor * boost;
  });

  const swipeOpacity = useTransform(smoothStory, [0, 0.03, 0.2, 0.28], [0, 1, 1, 0]);
  const desktopColorReveal = useTransform(smoothStory, [0.06, 0.56], [0, 1]);
  const desktopLowerMaskOpacity = useTransform(smoothStory, [0, 0.28], [0.8, 0.14]);
  
  const desktopNebulaOpacity = useTransform(smoothInteraction, [0.1, 0.26, 0.48, 0.76, 1], [0, 0.26, 0.7, 0.95, 0.78]);
  const desktopRayOpacity = useTransform(smoothInteraction, [0.16, 0.36, 0.58, 0.84, 1], [0, 0.52, 0.18, 0.82, 0.36]);
  
  const desktopNebulaX = useTransform(smoothInteraction, [0, 1], [-22, 28]);
  const desktopNebulaY = useTransform(smoothInteraction, [0, 1], [24, -16]);
  const desktopNebulaScale = useTransform(smoothInteraction, [0, 1], [0.92, 1.24]);
  const desktopNebulaRotate = useTransform(smoothInteraction, [0, 1], [-7, 9]);
  const desktopRayX = useTransform(smoothInteraction, [0, 1], [-42, 54]);
  const desktopRayY = useTransform(smoothInteraction, [0, 1], [18, -22]);
  const desktopRayScaleX = useTransform(smoothInteraction, [0, 1], [0.96, 1.12]);
  const desktopRayScaleY = useTransform(smoothInteraction, [0, 1], [0.98, 1.06]);
  
  const desktopFrameScale = useTransform(smoothStory, [0, 1], [1.02, 1.08]);
  const desktopFrameY = useTransform(smoothStory, [0, 1], [-8, 12]);
  const cameraRotateX = useTransform(smoothInteraction, [0, 0.5, 1], [1.2, 0, -1.2]);
  const cameraRotateY = useTransform(smoothInteraction, [0, 0.5, 1], [-0.8, 0, 0.8]);

  // Capas Mutuamente Exclusivas (Timeline de Narrativa)
  const titleOpacity = useTransform(smoothStory, [0.01, 0.1, 0.45, 0.55], [0, 1, 1, 0]);
  const titleDisplay = useTransform(titleOpacity, (v) => v > 0.01 ? "flex" : "none");
  const titleY       = useTransform(smoothStory, [0.01, 0.12, 0.45, 0.55], [20, 0, 0, -40]);
  const editionOpacity = useTransform(smoothStory, [0.05, 0.12, 0.45, 0.55], [0, 1, 1, 0]);
  
  const coordsOpacity = useTransform(smoothStory, [0.58, 0.68, 0.85, 0.92], [0, 1, 1, 0]);
  const coordsY       = useTransform(smoothStory, [0.58, 0.68, 0.85, 0.92], [40, 0, 0, -40]);
  const coordsSkew    = useTransform(smoothStory, [0.58, 0.68], [5, 0]);
  
  const contactOpacity = useTransform(smoothStory, [0.94, 0.99], [0, 1]);
  const contactY       = useTransform(smoothStory, [0.94, 1.0], [20, 0]);

  const [isGlitchingOut, setIsGlitchingOut] = useState(false);

  useMotionValueEvent(smoothStory, "change", (v) => {
    // Los glitches se activan en las transiciones de entrada/salida de cada bloque
    const isGlitchingBlock = 
      (v > 0.01 && v < 0.08) || // Title entry
      (v > 0.48 && v < 0.55) || // Title exit
      (v > 0.58 && v < 0.65) || // Coords entry
      (v > 0.88 && v < 0.94);   // Contact entry

    setIsGlitchingOut(isGlitchingBlock);

    if (v >= 0.98 && !introFinished) {
      setIntroFinished(true);
    }

    if (!typingStarted && v >= 0.65) {
      setTypingStarted(true);
    }
  });

  useEffect(() => {
    if (!typingStarted) {
      return;
    }

    const fullText = editionData.location;
    let index = 0;
    const t = setTimeout(() => {
      setIsTyping(true);
    }, 0);
    const timer = window.setInterval(() => {
      index += 1;
      setTypedLocation(fullText.slice(0, index));
      if (index % 2 === 0) playSound("type");
      if (index >= fullText.length) {
        window.clearInterval(timer);
        setIsTyping(false);
      }
    }, 55);

    return () => {
      clearTimeout(t);
      window.clearInterval(timer);
    };
  }, [typingStarted, editionData.location]);

  const contactPlaceholder = useMemo(() => {
    if (contactChannel === "mail") return "Tu email (Requerido)";
    if (contactChannel === "ig") return "@tu_usuario_ig (Requerido)";
    if (contactChannel === "fb") return "Enlace de tu Facebook (Requerido)";
    return "Tu nombre (Requerido)";
  }, [contactChannel]);

  const handleNotifySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const contactValue = contact.trim();
    const phoneValue = phone.trim();
    if (!contactValue || !phoneValue) return;

    const ok = await LeadService.registerLead({
      contact: contactValue,
      phone: phoneValue,
      channel: contactChannel,
    }, { viewport: `${viewport.w}x${viewport.h}` });

    setNotifyMessage(ok
      ? "MISIÓN CONFIRMADA. TE AVISAREMOS AL INSTANTE."
      : "VERIFICA TU WHATSAPP E INTENTA DE NUEVO."
    );
    if (!ok) return;

    setNotifySent(true);
    playSound("transition");
    setContact("");
    setPhone("");
  };

  const rings = useMemo(() => [
    // --- TOP-LEFT CORNER (Pair 1) ---
    {
      id: 1,
      src: "/astro/rings/ring-1.png",
      size: viewport.w < 768 ? "26vmin" : "24vmin",
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
      id: 5,
      src: "/astro/rings/ring-1.png",
      size: viewport.w < 768 ? "18vmin" : "16vmin",
      rotZ: -30,
      speed: -25,
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
    // --- TOP-RIGHT CORNER (Pair 2) ---
    {
      id: 2,
      src: "/astro/rings/ring-2.png",
      size: viewport.w < 768 ? "24vmin" : "22vmin",
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
      id: 6,
      src: "/astro/rings/ring-2.png",
      size: viewport.w < 768 ? "16vmin" : "14vmin",
      rotZ: 40,
      speed: 20,
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
    // --- BOTTOM-LEFT CORNER (Pair 3) ---
    {
      id: 3,
      src: "/astro/rings/ring-3.png",
      size: viewport.w < 768 ? "22vmin" : "20vmin",
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
      id: 7,
      src: "/astro/rings/ring-3.png",
      size: viewport.w < 768 ? "14vmin" : "12vmin",
      rotZ: -20,
      speed: -30,
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
    // --- BOTTOM-RIGHT CORNER (Pair 4) ---
    {
      id: 4,
      src: "/astro/rings/ring-4.png",
      size: viewport.w < 768 ? "28vmin" : "26vmin",
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
    {
      id: 8,
      src: "/astro/rings/ring-4.png",
      size: viewport.w < 768 ? "20vmin" : "18vmin",
      rotZ: 25,
      speed: 16,
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
  ], [viewport.h, viewport.w]);

  const mobileVideoScale = useTransform(storyProgress, [0.8, 1], [1.18, 1.25]);

  useMotionValueEvent(storyProgress, "change", (v) => {
    if (isMobile) return;
    const video = videoRef.current;
    if (!video || !videoReady || !isFinite(video.duration) || video.duration === 0 || video.readyState < 1) return;
    const usableDuration = Math.max(video.duration - VIDEO_SCRUB_START - VIDEO_SCRUB_END_PADDING, 0.01);
    const targetTime = VIDEO_SCRUB_START + (v * usableDuration);
    if (Math.abs(video.currentTime - targetTime) > 0.04) {
      video.currentTime = targetTime;
    }
  });

  useEffect(() => {
    if (isMobile && videoReady) {
      const video = videoRef.current;
      if (video) {
        video.loop = false;
        if (video.paused) {
          video.play().catch(() => {});
        }
      }
    }
  }, [isMobile, videoReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    type Star = { x: number; y: number; r: number; a: number; da: number };
    const stars: Star[] = [];
    let rafId = 0;
    const starCount = isMobile ? 60 : 180;
    const targetFps = isMobile ? 24 : 60;
    const frameInterval = 1000 / targetFps;
    let lastFrameTime = 0;
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        r:  0.3 + Math.random() * 0.7,
        a:  Math.random(),
        da: (Math.random() - 0.5) * 0.004,
      });
    }
    function animate(now: number) {
      if (!ctx || !canvas) return;
      rafId = requestAnimationFrame(animate);
      
      // Throttle frame rate on mobile
      if (now - lastFrameTime < frameInterval) return;
      lastFrameTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.a += s.da;
        if (s.a <= 0.04 || s.a >= 0.85) s.da *= -1;
        s.a = Math.max(0.04, Math.min(0.85, s.a));
        ctx.globalAlpha = s.a * 0.55;
        ctx.fillStyle = "#fff5e0";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    rafId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [isMobile]);

  return (
    <>
      <AnimatePresence>
        {!preloaderDone && (
          <Preloader
            key="preloader"
            onDone={handleIntroDone}
            ready={introReady}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRedirecting && (
          <motion.div
            className={styles.redirectOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className={styles.redirectCard}>
              <div className={styles.glitchTitle}>MISIÓN COMPLETADA</div>
              <p className={styles.redirectSubtext}>SISTEMA DE ÓRBITA 100% ESTABILIZADO</p>
              <div className={styles.progressBarContainer}>
                <motion.div 
                  className={styles.progressBarFill}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.8, ease: "easeInOut" }}
                />
              </div>
              <p className={styles.redirectStatusText}>ESTABLECIENDO ENLACE CON LA CONSOLA DE CONTROL...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={`${styles.page} ${preloaderDone ? styles.pageMounted : ""} ${!introFinished ? styles.locked : ""}`}>
        <section className={styles.heroShell}>
          <motion.div
            className={styles.stage}
            style={{
              rotateX: cameraRotateX,
              rotateY: cameraRotateY,
            }}
          >
            {isGlitching && <div className={styles.glitchOverlay} style={{ pointerEvents: "none" }} />}
            
            {/* Outline Interface - "Elementos" trace */}
            <div className={styles.interfaceField} aria-hidden="true" />

            {/* Scanline CRT FX */}
            <div className={styles.scanline} style={{ opacity: 0.08 }} />

            {/* Camera feed overlay */}
            <div className={styles.camStatus}>
              <div className={styles.camLabel}>
                <span className={styles.recDot} />
                <span>MISSION CONTROL // SYSTEM STATUS</span>
              </div>
              <div className={styles.camCoord}>
                {`LAT 18.4861° N // LON 69.9312° W // T-ELAPSED: ${missionTime} // ORBIT STABILITY: ${Math.round((collectedCount / 8) * 100)}%`}
              </div>
            </div>

            {/* HUD Sidebar right */}
            <div className={styles.hudSidebar}>
              <div className={styles.hudIcon} title="Orbital Stability">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </div>
              <div className={styles.hudIcon} title="Stability progress indicator">
                <span style={{ fontSize: "11px", fontWeight: "bold", fontFamily: "var(--font-display), monospace", color: "#ff822d" }}>
                  {collectedCount}/8
                </span>
              </div>
            </div>

            <div className={`${styles.bgFallback} ${videoReady ? styles.bgFallbackHidden : ""}`} />
             <motion.video
              ref={videoRef}
              muted
              playsInline
              loop={false}
              poster={isMobile ? ASTRO_CONFIG.assets.mobilePoster : ASTRO_CONFIG.assets.fallbackPoster}
              className={styles.bgVideo}
              style={{ scale: isMobile ? mobileVideoScale : 1 }}
              onLoadedMetadata={() => setVideoReady(true)}
              onLoadedData={() => setVideoReady(true)}
              onCanPlay={() => setVideoReady(true)}
              onCanPlayThrough={() => setVideoReady(true)}
              onError={() => setVideoReady(true)}
            />

            {!isMobile && (
              <motion.div
                className={styles.desktopBwFrame}
                style={{ scale: desktopFrameScale, y: desktopFrameY }}
              />
            )}

            {!isMobile && (
              <motion.div
                className={styles.desktopColorFrame}
                style={{ opacity: desktopColorReveal, scale: desktopFrameScale, y: desktopFrameY }}
              />
            )}

            {!isMobile && (
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
            )}

            {!isMobile && (
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
            )}

            {!isMobile && (
              <motion.div className={styles.desktopSplitMask} style={{ opacity: desktopLowerMaskOpacity }} />
            )}

            <div className={styles.videoVignette} />

            <canvas ref={canvasRef} className={styles.spaceCanvas} />

            {/* Zona secreta: Casco del Astronauta */}
            <div 
              className={styles.secretTrigger} 
              onDoubleClick={async () => {
                const pass = prompt("ACCESO RESTRINGIDO. INGRESE CLAVE DE COMANDO:");
                if (pass && await verifyAdminPassword(pass)) {
                  createAdminSession();
                  window.location.href = "/admin";
                } else if (pass !== null) {
                  alert("ACCESO DENEGADO.");
                }
              }}
            />

            {rings.map((r) => (
                <CornerRing
                key={r.id}
                src={r.src}
                size={r.size}
                rotZ={r.rotZ}
                speed={r.speed}
                originX={r.originX}
                originY={r.originY}
                fieldX={r.fieldX}
                fieldY={r.fieldY}
                driftX={r.driftX}
                driftY={r.driftY}
                swayX={r.swayX}
                swayY={r.swayY}
                phase={r.phase}
                progress={ringsProgress}
                time={time}
                mouseX={mouseX}
                mouseY={mouseY}
                playSound={playSound}
                onCollect={handleRingCollect}
              />
            ))}

            {introFinished && (
              <motion.div className={styles.swipeCue} style={{ opacity: swipeOpacity }}>
                <span className={styles.swipeArrows}>⌄⌄⌄</span>
              </motion.div>
            )}

            <motion.div
              className={`${styles.titleBlock} ${(isGlitching || isGlitchingOut) ? styles.dirtyTransmission : ""} ${!isMobile && !isGlitchingOut ? styles.desktopGlitchReveal : ""}`}
              style={{ opacity: titleOpacity, y: titleY, display: titleDisplay, zIndex: 55 }}
            >

              <h2 className={styles.mainTitle}>ASTRO SDQ</h2>
              <motion.p
                className={styles.edition}
                style={{ opacity: editionOpacity }}
              >
                {ASTRO_CONFIG.project.edition}
              </motion.p>
            </motion.div>



            <motion.div
              className={`${styles.coordBlock} ${!isMobile && !isTyping && !isGlitchingOut ? styles.desktopGlitchReveal : ""}`}
              style={{ opacity: coordsOpacity, y: coordsY, skewY: coordsSkew, zIndex: 50 }}
            >
              <div className={`${styles.terminalFrame} ${(isTyping || isGlitching || isGlitchingOut) ? styles.dirtyTransmission : ""}`}>
                <div className={styles.terminalGlow} aria-hidden="true" />
                <div className={styles.signalBar} />
                <p className={styles.location}>{typedLocation || " "}</p>
                <p className={styles.coordinates}>{editionData.coordinates}</p>
              </div>
            </motion.div>

            <motion.div
              className={`${styles.contactBlock} ${!isMobile ? styles.desktopGlitchReveal : ""}`}
              style={{ opacity: contactOpacity, y: contactY, zIndex: 60 }}
            >
              <div className={styles.notifyConsole}>
                <div className={styles.notifyNoise} aria-hidden="true" />
                
                <AnimatePresence mode="wait">
                  {!notifySent ? (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                    >
                      <p className={styles.contactTitle}>SISTEMA DE NOTIFICACIÓN</p>
                      <div className={styles.channelToggle} role="group" aria-label="Canal de contacto">
                        {(["ig", "whatsapp", "mail", "fb"] as ContactChannel[]).map((channel) => (
                          <button
                            key={channel}
                            type="button"
                            className={`${styles.channelButton} ${contactChannel === channel ? styles.channelButtonActive : ""}`}
                            onClick={() => {
                              setContactChannel(channel);
                              playSound("click");
                            }}
                          >
                            <ChannelIcon channel={channel} />
                            <span>{channel === "ig" ? "INSTAGRAM" : channel.toUpperCase()}</span>
                          </button>
                        ))}
                      </div>

                      <form className={styles.notifyForm} onSubmit={handleNotifySubmit}>
                        <div className={styles.notifyInputGroup}>
                          <input
                            className={styles.notifyInput}
                            type={contactChannel === "mail" ? "email" : "text"}
                            value={contact}
                            placeholder={contactPlaceholder}
                            onChange={(e) => { setContact(e.target.value); }}
                            required
                          />
                          <input
                            className={`${styles.notifyInput} ${styles.notifyInput2}`}
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={phone}
                            placeholder="Tu WhatsApp (Requerido)"
                            onChange={(e) => { setPhone(e.target.value); }}
                            required
                          />
                        </div>
                        <button className={styles.notifyButton} type="submit" onClick={() => playSound("click")}>NOTIFICARME</button>
                      </form>
                      <Link href="/match/" className={styles.matchCta} onClick={() => playSound("click")}>
                        <span className={styles.matchCtaLabel}>ASTRO MATCH</span>
                        <span className={styles.matchCtaSub}>Encuentra tu lienzo · Conecta con artistas</span>
                      </Link>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      className={styles.successContainer}
                    >
                      <div className={styles.successIcon}>✓</div>
                      <h3 className={styles.successTitle}>ACCESO CONCEDIDO</h3>
                      <motion.p 
                        className={styles.successText}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8 }}
                        style={{ margin: "0 auto" }}
                      >
                        {notifyMessage}
                      </motion.p>
                      <div className={styles.successGlow} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* HUD corners */}
            <div className={styles.hudOverlay} aria-hidden="true">
              <div className={`${styles.hudCorner} ${styles.topLeft}`} />
              <div className={`${styles.hudCorner} ${styles.topRight}`} />
              <div className={`${styles.hudCorner} ${styles.bottomLeft}`} />
              <div className={`${styles.hudCorner} ${styles.bottomRight}`} />
            </div>

            <div className={styles.grain} />
          </motion.div>
        </section>
      </main>
    </>
  );
}
