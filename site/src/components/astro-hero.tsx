"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import {
  motion, AnimatePresence,
  useScroll, useTransform, useSpring, MotionValue, useMotionValueEvent, useTime, useMotionValue, animate,
} from "framer-motion";
import { editionData as localEditionData } from "@/content/edition";
import { ASTRO_CONFIG } from "@/config/astro-config";
import { LeadService, type StandType, type StandExtra } from "@/services/lead-service";
import Link from "next/link";
import AdminAccessModal from "@/components/admin-access-modal";
import {
  getSocialClientIds,
  signInWithApple,
  signInWithGoogle,
  type SocialProvider,
} from "@/lib/social-auth";
import styles from "./astro-hero.module.css";

function FieldIcon({ name }: { name: "user" | "mail" | "phone" | "ig" | "flag" }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true as const };
  if (name === "user") {
    return (
      <svg {...common}>
        <path d="M20 21a8 8 0 0 0-16 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (name === "mail") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "phone") {
    return (
      <svg {...common}>
        <path d="M8.5 4.5h3l1.2 3.2-1.8 1.1a12 12 0 0 0 4.3 4.3l1.1-1.8 3.2 1.2v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.7 2 2 0 0 1 6.5 4.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "ig") {
    return (
      <svg {...common}>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 5.5h10.5v13H4z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M14.5 5.5h5.5l-2 3.5 2 3.5h-5.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

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

const PRELOADER_STEP_MS = 380;
const PRELOADER_EXIT_MS = 420;
const STORY_DURATION_S = 4.2;

function Preloader({ onDone, ready }: { onDone: () => void; ready: boolean }) {
  const [step, setStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (step < PRELOADER_LOGO_STEP) {
      const t = setTimeout(() => setStep((s) => s + 1), PRELOADER_STEP_MS);
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
    const t = setTimeout(onDone, PRELOADER_EXIT_MS);
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
      transition={{ duration: isExiting ? 0.4 : 0.2, ease: "easeInOut" }}
      exit={{ opacity: 0, transition: { duration: 0.2, ease: "easeInOut" } }}
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [nationality, setNationality] = useState("");
  const [stand, setStand] = useState<StandType>("regular");
  const [standExtra, setStandExtra] = useState<StandExtra>("");
  const [notifySent, setNotifySent] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [typingStarted, setTypingStarted] = useState(false);
  const [typedLocation, setTypedLocation] = useState("");
  const [editionData] = useState(localEditionData);
  const [isGlitching, setIsGlitching] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const [collectedCount, setCollectedCount] = useState(0);
  const [missionTime, setMissionTime] = useState("00:00");
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [fxActive, setFxActive] = useState(true);
  const [authProvider, setAuthProvider] = useState<SocialProvider | null>(null);
  const [authBusy, setAuthBusy] = useState<SocialProvider | null>(null);
  const [authHint, setAuthHint] = useState("");
  const [showStandDetails, setShowStandDetails] = useState(false);
  const socialIds = useMemo(() => getSocialClientIds(), []);
  const adminGestureRef = useRef({ taps: 0, timer: 0 as ReturnType<typeof setTimeout> | number, pressAt: 0 });

  const openAdminModal = () => {
    setAdminModalOpen(true);
  };

  const onAdminBrandDown = () => {
    adminGestureRef.current.pressAt = Date.now();
  };

  const onAdminBrandUp = () => {
    const held = Date.now() - adminGestureRef.current.pressAt;
    // Long-press (~1.2s) — funciona en móvil sin teclado
    if (held >= 1200) {
      adminGestureRef.current.taps = 0;
      openAdminModal();
      return;
    }
    // 5 toques rápidos en el título / edición
    adminGestureRef.current.taps += 1;
    clearTimeout(adminGestureRef.current.timer as ReturnType<typeof setTimeout>);
    if (adminGestureRef.current.taps >= 5) {
      adminGestureRef.current.taps = 0;
      openAdminModal();
      return;
    }
    adminGestureRef.current.timer = setTimeout(() => {
      adminGestureRef.current.taps = 0;
    }, 2200);
  };

  const handleRingCollect = () => {
    setCollectedCount((prev) => {
      const next = prev + 1;
      if (next === 8) {
        playSound("transition");
        setAdminModalOpen(true);
      }
      return next;
    });
  };

  useEffect(() => {
    const ACTIVATION = "sdq";
    const BUFFER_MS = 1800;
    let typeBuf = "";
    let lastKey = 0;

    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      return el.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key.length !== 1) return;
      const now = Date.now();
      if (now - lastKey > BUFFER_MS) typeBuf = "";
      lastKey = now;
      typeBuf = (typeBuf + e.key.toLowerCase()).slice(-ACTIVATION.length);
      if (typeBuf === ACTIVATION) {
        typeBuf = "";
        setAdminModalOpen(true);
      }
    };

    const onHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === "#sdq" || hash === "#admin") setAdminModalOpen(true);
    };

    onHash();
    window.addEventListener("hashchange", onHash);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

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
  const storyControlsRef = useRef<{ stop: () => void } | null>(null);
  
  const smoothStory = useSpring(storyProgress, { stiffness: 45, damping: 20, restDelta: 0.0001, mass: 0.8 });
  const smoothInteraction = useSpring(interactionProgress, { stiffness: 35, damping: 25, restDelta: 0.0001, mass: 1 });

  const skipToForm = () => {
    storyControlsRef.current?.stop();
    storyProgress.set(1);
    setIntroFinished(true);
    setFxActive(false);
    setTypingStarted(true);
    setTypedLocation(editionData.location);
  };

  const handleIntroDone = () => {
    setPreloaderDone(true);
    setTimeout(() => {
      storyControlsRef.current = animate(storyProgress, 1, {
        duration: STORY_DURATION_S,
        ease: "linear",
        onComplete: () => {
          setIntroFinished(true);
          setFxActive(false);
        },
      });
    }, 60);
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

  const swipeOpacity = useTransform(smoothStory, [0, 0.03, 0.12, 0.2], [0, 1, 1, 0]);
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

  // Capas Mutuamente Exclusivas (Timeline de Narrativa — comprimida)
  const titleOpacity = useTransform(smoothStory, [0.01, 0.08, 0.22, 0.30], [0, 1, 1, 0]);
  const titleDisplay = useTransform(titleOpacity, (v) => v > 0.01 ? "flex" : "none");
  const titleY       = useTransform(smoothStory, [0.01, 0.08, 0.22, 0.30], [20, 0, 0, -40]);
  const editionOpacity = useTransform(smoothStory, [0.04, 0.10, 0.22, 0.30], [0, 1, 1, 0]);

  const storyOpacity = useTransform(smoothStory, [0.28, 0.36, 0.50, 0.58], [0, 1, 1, 0]);
  const storyY       = useTransform(smoothStory, [0.28, 0.36, 0.50, 0.58], [40, 0, 0, -40]);
  const storyDisplay = useTransform(storyOpacity, (v) => v > 0.01 ? "flex" : "none");
  
  const coordsOpacity = useTransform(smoothStory, [0.56, 0.64, 0.74, 0.82], [0, 1, 1, 0]);
  const coordsY       = useTransform(smoothStory, [0.56, 0.64, 0.74, 0.82], [40, 0, 0, -40]);
  const coordsSkew    = useTransform(smoothStory, [0.56, 0.64], [5, 0]);
  
  const contactOpacity = useTransform(smoothStory, [0.78, 0.88], [0, 1]);
  const contactY       = useTransform(smoothStory, [0.78, 0.92], [20, 0]);

  const [isGlitchingOut, setIsGlitchingOut] = useState(false);

  useMotionValueEvent(smoothStory, "change", (v) => {
    const isGlitchingBlock =
      (v > 0.01 && v < 0.07) ||
      (v > 0.26 && v < 0.32) ||
      (v > 0.54 && v < 0.60) ||
      (v > 0.76 && v < 0.82);

    setIsGlitchingOut(isGlitchingBlock);

    if (v >= 0.88 && !introFinished) {
      setIntroFinished(true);
      setFxActive(false);
    }

    if (!typingStarted && v >= 0.58) {
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
    }, 32);

    return () => {
      clearTimeout(t);
      window.clearInterval(timer);
    };
  }, [typingStarted, editionData.location]);

  const applySocialProfile = (profile: {
    provider: SocialProvider;
    email: string;
    firstName: string;
    lastName: string;
  }) => {
    if (profile.firstName) setFirstName(profile.firstName);
    if (profile.lastName) setLastName(profile.lastName);
    if (profile.email) setEmail(profile.email);
    setAuthProvider(profile.provider);
    setAuthHint(
      profile.provider === "google"
        ? "Conectado con Google — completa WhatsApp y stand para notificarte."
        : "Conectado con Apple — completa WhatsApp y stand para notificarte.",
    );
    playSound("transition");
  };

  const handleSocialAuth = async (provider: SocialProvider) => {
    if (authBusy || submitting) return;
    setAuthBusy(provider);
    setAuthHint("");
    playSound("click");
    try {
      const profile = provider === "google"
        ? await signInWithGoogle()
        : await signInWithApple();
      applySocialProfile(profile);
    } catch (err) {
      const code = err instanceof Error ? err.message : "AUTH_FAILED";
      if (code === "GOOGLE_NOT_CONFIGURED" || code === "APPLE_NOT_CONFIGURED") {
        setAuthHint(
          provider === "google"
            ? "Google aún no está activado en este entorno. Completa el formulario abajo."
            : "Apple aún no está activado en este entorno. Completa el formulario abajo.",
        );
      } else if (code === "GOOGLE_CANCELLED") {
        setAuthHint("Inicio con Google cancelado.");
      } else {
        setAuthHint(
          provider === "google"
            ? "No se pudo conectar con Google. Puedes registrarte manualmente."
            : "No se pudo conectar con Apple. Puedes registrarte manualmente.",
        );
      }
    } finally {
      setAuthBusy(null);
    }
  };

  const handleNotifySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setNotifyMessage("");

    try {
      const result = await LeadService.registerArtist({
        firstName,
        lastName,
        email,
        phone,
        instagram,
        nationality,
        stand,
        standExtra,
      }, {
        viewport: `${viewport.w}x${viewport.h}`,
        authProvider: authProvider || "manual",
      });

      if (!result.ok) {
        setNotifyMessage("REVISA NOMBRE, EMAIL Y WHATSAPP E INTENTA DE NUEVO.");
        return;
      }

      setNotifyMessage(result.notified
        ? "REGISTRO CONFIRMADO. REVISA TU WHATSAPP — TE LLEGÓ LA CONFIRMACIÓN."
        : "REGISTRO GUARDADO. SI NO LLEGA EL WHATSAPP, REVISA EL NÚMERO."
      );
      setNotifySent(true);
      playSound("transition");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setInstagram("");
      setNationality("");
      setStand("regular");
      setStandExtra("");
      setAuthProvider(null);
      setAuthHint("");
    } catch (err) {
      console.warn("[astro] register submit:", err);
      setNotifyMessage("NO SE PUDO ENVIAR. REINTENTA EN UN MOMENTO.");
    } finally {
      setSubmitting(false);
    }
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
    if (!canvas || !fxActive) {
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }
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
    function animateStars(now: number) {
      if (!ctx || !canvas) return;
      rafId = requestAnimationFrame(animateStars);
      
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
    rafId = requestAnimationFrame(animateStars);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [isMobile, fxActive]);

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

      <AdminAccessModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
      />

      <main className={`${styles.page} ${preloaderDone ? styles.pageMounted : ""} ${!introFinished ? styles.locked : ""} ${introFinished ? styles.formMode : ""}`}>
        <section className={styles.heroShell}>
          <motion.div
            className={styles.stage}
            style={{
              rotateX: fxActive ? cameraRotateX : 0,
              rotateY: fxActive ? cameraRotateY : 0,
            }}
          >
            {fxActive && isGlitching && <div className={styles.glitchOverlay} style={{ pointerEvents: "none" }} />}
            
            {/* Outline Interface - "Elementos" trace */}
            <div className={styles.interfaceField} aria-hidden="true" />

            {/* Scanline CRT FX */}
            {fxActive && <div className={styles.scanline} style={{ opacity: 0.08 }} />}

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

            {!isMobile && fxActive && (
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

            {!isMobile && fxActive && (
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
            {/* Acceso admin móvil: zona inferior-izquierda (mantener ~1.2s) */}
            <button
              type="button"
              className={styles.mobileAdminPad}
              aria-label="Acceso comando"
              onPointerDown={onAdminBrandDown}
              onPointerUp={onAdminBrandUp}
              onPointerCancel={() => { adminGestureRef.current.pressAt = 0; }}
            />

            <div 
              className={styles.secretTrigger} 
              onDoubleClick={() => {
                openAdminModal();
              }}
            />

            {fxActive && rings.map((r) => (
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

            {introFinished && fxActive && (
              <motion.div className={styles.swipeCue} style={{ opacity: swipeOpacity }}>
                <span className={styles.swipeArrows}>⌄⌄⌄</span>
              </motion.div>
            )}

            {!introFinished && (
            <motion.div
              className={`${styles.titleBlock} ${(isGlitching || isGlitchingOut) ? styles.dirtyTransmission : ""} ${!isMobile && !isGlitchingOut ? styles.desktopGlitchReveal : ""}`}
              style={{ opacity: titleOpacity, y: titleY, display: titleDisplay, zIndex: 55 }}
              onPointerDown={onAdminBrandDown}
              onPointerUp={onAdminBrandUp}
              onPointerCancel={() => { adminGestureRef.current.pressAt = 0; }}
            >

              <h2 className={styles.mainTitle}>ASTRO SDQ</h2>
              <motion.p
                className={styles.edition}
                style={{ opacity: editionOpacity }}
              >
                {ASTRO_CONFIG.project.edition}
              </motion.p>
            </motion.div>
            )}

            {!introFinished && (
            <motion.div
              className={`${styles.storyBlock} ${(isGlitching || isGlitchingOut) ? styles.dirtyTransmission : ""} ${!isMobile && !isGlitchingOut ? styles.desktopGlitchReveal : ""}`}
              style={{ opacity: storyOpacity, y: storyY, display: storyDisplay, zIndex: 52 }}
            >
              <p className={styles.storyParagraph}>{editionData.paragraph1}</p>
              <p className={styles.storyHighlight}>{editionData.paragraph2}</p>
            </motion.div>
            )}

            {!introFinished && (
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
            )}

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
                      <Link href="/match/" className={styles.matchCta} onClick={() => playSound("click")}>
                        <span className={styles.matchCtaGlow} aria-hidden="true" />
                        <span className={styles.matchCtaLabel}>ASTRO MATCH</span>
                        <span className={styles.matchCtaSub}>Encuentra tu lienzo · Conecta con artistas</span>
                      </Link>

                      <p
                        className={styles.contactTitle}
                        onPointerDown={onAdminBrandDown}
                        onPointerUp={onAdminBrandUp}
                      >
                        REGISTRO ASTRO SDQ {editionData.year}
                      </p>
                      <p className={styles.contactInvite}>
                        {editionData.datesShort} · {editionData.venue}
                      </p>

                      <div className={styles.socialAuth}>
                        <p className={styles.socialAuthLabel}>Inicia sesión o regístrate para notificarte</p>
                        <div className={styles.socialAuthRow}>
                          <button
                            type="button"
                            className={`${styles.socialBtn} ${styles.socialGoogle} ${authProvider === "google" ? styles.socialBtnActive : ""}`}
                            disabled={!!authBusy || submitting}
                            onClick={() => handleSocialAuth("google")}
                            aria-label="Continuar con Google"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>{authBusy === "google" ? "Conectando…" : authProvider === "google" ? "Google ✓" : "Google"}</span>
                          </button>
                          <button
                            type="button"
                            className={`${styles.socialBtn} ${styles.socialApple} ${authProvider === "apple" ? styles.socialBtnActive : ""}`}
                            disabled={!!authBusy || submitting}
                            onClick={() => handleSocialAuth("apple")}
                            aria-label="Continuar con Apple"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                              <path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.7 0-1.9-.8-3.1-.8-1.6 0-3.1 1-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.1 1.7 2.4 3 2.4 1.2 0 1.6-.8 3.1-.8s1.8.8 3.1.8 2.1-1.2 2.8-2.3c.9-1.2 1.2-2.4 1.2-2.5-.1 0-2.3-.9-2.5-3.4zM14.2 5.9c.7-.8 1.1-1.9 1-3-.9.1-2 .6-2.7 1.4-.6.7-1.2 1.9-1 3 1 .1 2-.5 2.7-1.4z" />
                            </svg>
                            <span>{authBusy === "apple" ? "Conectando…" : authProvider === "apple" ? "Apple ✓" : "Apple"}</span>
                          </button>
                        </div>
                        {(authHint || (!socialIds.google && !socialIds.apple && !authProvider)) && (
                          <p className={styles.socialAuthHint}>
                            {authHint || "Usa Google o Apple para autocompletar, o llena el formulario abajo."}
                          </p>
                        )}
                      </div>

                      <form className={styles.notifyForm} onSubmit={handleNotifySubmit}>
                        <div className={styles.notifyInputGroup}>
                          <label className={styles.fieldShell}>
                            <span className={styles.fieldIcon}><FieldIcon name="user" /></span>
                            <input className={styles.notifyInput} type="text" value={firstName} placeholder="Nombre *" required autoComplete="given-name" onChange={(e) => setFirstName(e.target.value)} />
                          </label>
                          <label className={`${styles.fieldShell} ${styles.notifyInput2}`}>
                            <span className={styles.fieldIcon}><FieldIcon name="user" /></span>
                            <input className={styles.notifyInput} type="text" value={lastName} placeholder="Apellido" autoComplete="family-name" onChange={(e) => setLastName(e.target.value)} />
                          </label>
                        </div>
                        <div className={styles.notifyInputGroup}>
                          <label className={styles.fieldShell}>
                            <span className={styles.fieldIcon}><FieldIcon name="mail" /></span>
                            <input className={styles.notifyInput} type="email" value={email} placeholder="Email *" required autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
                          </label>
                          <label className={`${styles.fieldShell} ${styles.notifyInput2}`}>
                            <span className={styles.fieldIcon}><FieldIcon name="phone" /></span>
                            <input className={styles.notifyInput} type="tel" inputMode="tel" autoComplete="tel" value={phone} placeholder="WhatsApp *" required onChange={(e) => setPhone(e.target.value)} />
                          </label>
                        </div>
                        <div className={styles.notifyInputGroup}>
                          <label className={styles.fieldShell}>
                            <span className={styles.fieldIcon}><FieldIcon name="ig" /></span>
                            <input className={styles.notifyInput} type="text" value={instagram} placeholder="@Instagram" autoComplete="username" onChange={(e) => setInstagram(e.target.value)} />
                          </label>
                          <label className={`${styles.fieldShell} ${styles.notifyInput2}`}>
                            <span className={styles.fieldIcon}><FieldIcon name="flag" /></span>
                            <input className={styles.notifyInput} type="text" value={nationality} placeholder="Nacionalidad" onChange={(e) => setNationality(e.target.value)} />
                          </label>
                        </div>

                        <fieldset className={styles.standFieldset}>
                          <legend className={styles.standLegend}>Stand *</legend>
                          <div className={styles.standOptions}>
                            {(["regular", "doble"] as StandType[]).map((opt) => (
                              <label
                                key={opt}
                                className={`${styles.standOption} ${stand === opt ? styles.standOptionActive : ""}`}
                              >
                                <input
                                  type="radio"
                                  name="stand"
                                  value={opt}
                                  checked={stand === opt}
                                  onChange={() => { setStand(opt); playSound("click"); }}
                                />
                                <span className={styles.standCheck} aria-hidden="true" />
                                <span className={styles.standLabel}>{editionData.stands[opt].label}</span>
                                <span className={styles.standPrice}>{editionData.stands[opt].price}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>

                        <fieldset className={`${styles.standFieldset} ${styles.standFieldsetExtra}`}>
                          <legend className={styles.standLegend}>Stand extra</legend>
                          <div className={styles.standOptions}>
                            <label className={`${styles.standOption} ${styles.standOptionCompact} ${standExtra === "" ? styles.standOptionActive : ""}`}>
                              <input type="radio" name="standExtra" value="" checked={standExtra === ""} onChange={() => { setStandExtra(""); playSound("click"); }} />
                              <span className={styles.standCheck} aria-hidden="true" />
                              <span className={styles.standLabel}>Ninguno</span>
                            </label>
                            <label className={`${styles.standOption} ${styles.standOptionCompact} ${standExtra === "regular" ? styles.standOptionActive : ""}`}>
                              <input type="radio" name="standExtra" value="regular" checked={standExtra === "regular"} onChange={() => { setStandExtra("regular"); playSound("click"); }} />
                              <span className={styles.standCheck} aria-hidden="true" />
                              <span className={styles.standLabel}>+ Premium</span>
                            </label>
                            <label className={`${styles.standOption} ${styles.standOptionCompact} ${standExtra === "doble" ? styles.standOptionActive : ""}`}>
                              <input type="radio" name="standExtra" value="doble" checked={standExtra === "doble"} onChange={() => { setStandExtra("doble"); playSound("click"); }} />
                              <span className={styles.standCheck} aria-hidden="true" />
                              <span className={styles.standLabel}>+ Doble</span>
                            </label>
                          </div>
                        </fieldset>

                        <button
                          type="button"
                          className={styles.standDetailsToggle}
                          onClick={() => { setShowStandDetails((v) => !v); playSound("click"); }}
                          aria-expanded={showStandDetails}
                        >
                          {showStandDetails ? "Ocultar detalle de stands" : "Ver qué incluye cada stand"}
                        </button>
                        {showStandDetails && (
                          <div className={styles.standDetails}>
                            <p><strong>Premium · {editionData.stands.regular.price}</strong> — {editionData.stands.regular.detail}</p>
                            <p><strong>Doble · {editionData.stands.doble.price}</strong> — {editionData.stands.doble.detail}</p>
                          </div>
                        )}

                        <button className={styles.notifyButton} type="submit" disabled={submitting} onClick={() => playSound("click")}>
                          {submitting ? "ENVIANDO…" : "ENVIAR REGISTRO"}
                        </button>
                        {!notifySent && notifyMessage && (
                          <p className={styles.formError} role="alert">{notifyMessage}</p>
                        )}
                      </form>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      className={styles.successContainer}
                    >
                      <div className={styles.successIcon}>✓</div>
                      <h3 className={styles.successTitle}>REGISTRO RECIBIDO</h3>
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

            {preloaderDone && !introFinished && (
              <button
                type="button"
                className={styles.skipIntro}
                onClick={() => {
                  playSound("click");
                  skipToForm();
                }}
              >
                IR AL FORMULARIO →
              </button>
            )}

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
