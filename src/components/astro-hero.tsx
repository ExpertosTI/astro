"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import {
  motion, AnimatePresence,
  useScroll, useTransform, useSpring, MotionValue, useMotionValueEvent, useTime, useMotionValue, animate,
} from "framer-motion";
import { editionData as localEditionData } from "@/content/edition";
import { insforge } from "@/lib/insforge";
import styles from "./astro-hero.module.css";

// Modular components
import OrbitalSystem from "./orbital-system";
import AdminAccessModal from "./admin-access-modal";
import CinemaBackground from "./cinema-background";

/* ────────────────────────────────────────────────────────
   PRELOADER: loop hasta que ready (video cargado) + 1 ciclo completo
──────────────────────────────────────────────────────── */
const ELEMENTS = [
  "/astro/elements/ELMENTO-1.png",
  "/astro/elements/ELEMENTO-2.png",
  "/astro/elements/ELEMENTO-3.png",
  "/astro/elements/ELEMENTO-4.png",
];

const PRELOADER_SEQUENCE = [...ELEMENTS, localEditionData.logo];
const PRELOADER_LOGO_STEP = PRELOADER_SEQUENCE.length - 1;
const VIDEO_SCRUB_START = 1.2;
const VIDEO_SCRUB_END_PADDING = 0.25;
const MOBILE_WEBM_SRC: string = "/astro/backgrounds/video.webm";
const DESKTOP_VIDEO_SRC: string = "/astro/backgrounds/video-optimized.mp4";
const NOTIFY_STORAGE_KEY = "astro-notify-leads";
const MAX_NOTIFY_LEADS = 100;

type ContactChannel = "mail" | "ig" | "fb" | "whatsapp";
type NotifyLead = { value: string; channel: ContactChannel; createdAt: string };

function readNotifyLeads(storage: Storage): NotifyLead[] {
  try {
    const raw = storage.getItem(NOTIFY_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is NotifyLead => (
        typeof item === "object"
        && item !== null
        && typeof item.value === "string"
        && typeof item.channel === "string"
        && typeof item.createdAt === "string"
      ))
      .slice(-MAX_NOTIFY_LEADS);
  } catch {
    return [];
  }
}

function persistNotifyLead(storage: Storage, lead: NotifyLead) {
  const leads = readNotifyLeads(storage);
  leads.push(lead);
  storage.setItem(NOTIFY_STORAGE_KEY, JSON.stringify(leads.slice(-MAX_NOTIFY_LEADS)));
}

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
      const t = setTimeout(() => setStep((s) => s + 1), 450);
      return () => clearTimeout(t);
    }

    if (step === PRELOADER_LOGO_STEP && ready && !isExiting) {
      setIsExiting(true);
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
        <p className={styles.missionText}>SYSTEM: OK // NEBULA: ACTIVE // ASTRO SDQ LINKED</p>
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
  src, size, rotZ, speed, originX, originY, fieldX, fieldY, driftX, driftY, swayX, swayY, phase, variant, progress, time, mouseX, mouseY, playSound,
}: {
  src: string; size: string; rotZ: number; speed: number;
  originX: number; originY: number; fieldX: number; fieldY: number; driftX: number; driftY: number;
  swayX: number; swayY: number; phase: number; variant: string; progress: MotionValue<number>;
  time: MotionValue<number>;
  mouseX: MotionValue<number>; mouseY: MotionValue<number>;
  playSound: (type: "glitch" | "type" | "click" | "transition") => void;
  onBurst?: () => void;
}) {
  const [isBursting, setIsBursting] = useState(false);

  const handleRingClick = () => {
    if (isBursting) return;
    setIsBursting(true);
    playSound("glitch");
    // Al hacer click, notificamos al padre para que duplique el anillo
    if ((window as any).onRingClick) (window as any).onRingClick();
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

  const idleRot = useTransform(time, (t) => Math.sin(t / 4000 + phase) * 4);
  const dz = useTransform(progress, [0, 1], [0, 450]);
  const scrollRot = useTransform(progress, (value) => rotZ + value * speed * 15);
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
  const ringOpacity = useTransform(visualProgress, [0, 0.15, 0.7, 1], [0, 0.95, 0.9, 0], { clamp: true });
  // Los anillos ahora se alejan (se hacen pequeños) y desaparecen con blur
  const baseScale = useTransform(visualProgress, [0, 0.3, 0.9, 1], [1.2, 0.8, 0.3, 0], { clamp: true });
  const finalScale = useTransform([baseScale, breatheScale], ([bs, brs]) => (bs as number) * (brs as number));
  const ringZIndex = useTransform(visualProgress, (value) => (value > 0.65 ? 120 : 40));

  return (
    <motion.div
      className={`${styles.orbitalRing} ${isBursting ? styles.ringBurstActive : ""}`}
      onClick={handleRingClick}
      whileHover={{ scale: 1.1, filter: "brightness(1.5) contrast(1.2)" }}
      style={{
        width: size,
        height: size,
        x: dx,
        y: dy,
        z: dz,
        rotate: totalRot,
        scale: finalScale,
        opacity: ringOpacity,
        filter: ringFilter,
        zIndex: ringZIndex,
        cursor: "pointer",
        pointerEvents: "auto",
      }}
    >
      <img 
        src={src} 
        className={styles.ringImage} 
        alt="Orbital Ring"
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

export function AstroHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [videoReady, setVideoReady]       = useState(false);
  const [preloaderAssetsLoaded, setPreloaderAssetsLoaded] = useState(false);
  const [introReady, setIntroReady]       = useState(false);
  const storyAnimationRef = useRef<any>(null);
  const [viewport, setViewport] = useState({ w: 1920, h: 1080 });
  const [isMobile, setIsMobile] = useState(true); // Mobile first para evitar carga pesada
  const [contactChannel, setContactChannel] = useState<ContactChannel>("ig");
  const [contactValue, setContactValue] = useState("");
  const [contactValue2, setContactValue2] = useState("");
  const [notifySent, setNotifySent] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [typingStarted, setTypingStarted] = useState(false);
  const [typedLocation, setTypedLocation] = useState("");
  const [editionData, setEditionData] = useState(localEditionData);
  const [isGlitching, setIsGlitching] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

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
    } catch (e) { /* silent */ }
  };

  // Desbloqueo de video y audio global tras primer interacción
  useEffect(() => {
    const unlock = () => {
      if (videoRef.current) videoRef.current.play().catch(() => {});
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
  }, []);
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
        ease: "linear"
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

  const ringsProgress = useTransform([smoothInteraction, smoothStory, time], ([v, s, t]) => {
    const auto = (t as number) / 26000; 
    const scrollFactor = isMobile ? 2.5 : 2.8;
    const boost = (v as number) > 0.9 ? 1.2 : 1.0;
    
    // El scroll solo afecta cuando la historia ha terminado (s >= 1)
    // Usamos un multiplicador suave para evitar saltos si el usuario ya scrolleó
    const scrollActivation = Math.max(0, Math.min(1, ((s as number) - 0.88) / 0.12));
    const effectiveScroll = (v as number) * scrollActivation;
    
    return auto + effectiveScroll * scrollFactor * boost;
  });

  const swipeOpacity = useTransform(smoothStory, [0, 0.03, 0.2, 0.28], [0, 1, 1, 0]);
  const desktopColorReveal = useTransform(smoothStory, [0.06, 0.56], [0, 1]);
  const desktopLowerMaskOpacity = useTransform(smoothStory, [0, 0.28], [0.8, 0.14]);
  
  // Opacidades fijas con desplazamiento para evitar choque en escritorio (Uso de vh para control absoluto)
  const titleOpacity = useTransform(smoothStory, [0.02, 0.10], [0, 1]);
  const titleY = useTransform(smoothStory, [0.85, 0.95], ["22vh", "8vh"]); 
  const storyOpacity = useTransform(smoothStory, [0.35, 0.45], [0, 1]);
  const storyY = useTransform(smoothStory, [0.85, 0.95], ["48vh", "32vh"]); 
  const contactOpacity = useTransform(smoothStory, [0.90, 0.98], [0, 1]);
  const contactY = useTransform(smoothStory, [0.90, 1], ["75vh", "65vh"]);
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
  const mobileVideoScale = useTransform(smoothStory, [0.8, 1], [1.18, 1.25]);

  const editionOpacity = useTransform(smoothStory, [0.05, 0.15, 0.30, 0.40], [0, 1, 1, 0]);
  const coordsOpacity = useTransform(smoothStory, [0.45, 0.55, 0.75, 0.85], [0, 1, 1, 0]);
  const coordsSkew    = useTransform(smoothStory, [0.45, 0.55, 0.65], isMobile ? [6, 0, 0] : [4, 0, 0]);

  const [isGlitchingOut, setIsGlitchingOut] = useState(false);

  useMotionValueEvent(smoothStory, "change", (v) => {
    // Los glitches solo ocurren durante la transición inicial, no al scrollear después
    const isEndingTitle = v > 0.08 && v < 0.12;
    const isEndingCoords = v > 0.40 && v < 0.50;
    setIsGlitchingOut(isEndingTitle || isEndingCoords);

    if (!typingStarted && v >= 0.42) {
      setTypingStarted(true);
    }
  });

  useEffect(() => {
    if (!typingStarted) {
      setTypedLocation("");
      return;
    }

    const fullText = editionData.location;
    let index = 0;
    setIsTyping(true);
    const timer = window.setInterval(() => {
      index += 1;
      setTypedLocation(fullText.slice(0, index));
      if (index % 2 === 0) playSound("type");
      if (index >= fullText.length) {
        window.clearInterval(timer);
        setIsTyping(false);
      }
    }, 55);

    return () => window.clearInterval(timer);
  }, [typingStarted, editionData.location]);

  const contactPlaceholder = useMemo(() => {
    if (contactChannel === "mail") return "tu@email.com";
    if (contactChannel === "ig") return "@tu_usuario";
    if (contactChannel === "fb") return "perfil de facebook";
    return "+1 809 555 0000";
  }, [contactChannel]);

  const contact2Placeholder = useMemo(() => {
    if (contactChannel === "ig") return "tu@email.com o +1 809...";
    return "@tu_usuario_ig";
  }, [contactChannel]);

  const handleNotifySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value  = contactValue.trim();
    const value2 = contactValue2.trim();
    if (!value || !value2) return;

    const payload: NotifyLead = { value, channel: contactChannel, createdAt: new Date().toISOString() };
    const payload2: NotifyLead = { value: value2, channel: contactChannel === "ig" ? "mail" : "ig", createdAt: new Date().toISOString() };

    try {
      persistNotifyLead(window.localStorage, payload);
      persistNotifyLead(window.localStorage, payload2);
    } catch (e) { console.warn("LocalStorage persist failed", e); }

    const success = await insforge.saveLead({
      contact_value: `${contactChannel}:${value} | extra:${value2}`,
      channel: contactChannel,
      project_id: "astro-sdq",
      metadata: { source: "web-landing", viewport: `${viewport.w}x${viewport.h}`, contact2: value2 }
    });

    setNotifyMessage(success
      ? "MISIÓN CONFIRMADA. TE AVISAREMOS AL INSTANTE."
      : "SISTEMA DE RESPALDO ACTIVO. REGISTRO COMPLETADO."
    );
    setNotifySent(true);
    playSound("transition");
    setContactValue("");
    setContactValue2("");
  };

  const [dynamicRings, setDynamicRings] = useState<any[]>([]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPass, setAdminPass] = useState("");

  const handleAddRing = () => {
    const newId = Date.now();
    const newRing = {
      id: newId,
      src: `/astro/rings/ring-${(newId % 4) + 1}.png`,
      size: isMobile ? "32vmin" : "30vmin",
      rotZ: Math.random() * 360,
      speed: 0.8 + Math.random() * 1.5,
      originX: -100 + Math.random() * 200,
      originY: -100 + Math.random() * 200,
      fieldX: 180,
      fieldY: 180,
      driftX: -25 + Math.random() * 50,
      driftY: -25 + Math.random() * 50,
      swayX: 15 + Math.random() * 35,
      swayY: 15 + Math.random() * 35,
      phase: Math.random() * Math.PI * 2,
      variant: ["ring1", "ring2", "ring3", "ring4"][newId % 4],
    };
    setDynamicRings(prev => [...prev, newRing]);
    playSound("transition");
  };
  useMotionValueEvent(smoothStory, "change", (v) => {
    if (!isMobile) {
      const video = videoRef.current;
      if (video && videoReady) {
        const usableDuration = Math.max(video.duration - VIDEO_SCRUB_START - VIDEO_SCRUB_END_PADDING, 0.01);
        video.currentTime = VIDEO_SCRUB_START + (v * usableDuration);
      }
    }
  });

  useEffect(() => {
    if (preloaderDone) setIntroReady(true);
  }, [preloaderDone]);

  return (
    <>
      <AnimatePresence>
        {!preloaderDone && (
          <Preloader onDone={handleIntroDone} ready={videoReady} />
        )}
      </AnimatePresence>

      <main className={`${styles.page} ${preloaderDone ? styles.pageMounted : ""}`}>
        <section className={styles.heroShell}>
          <motion.div className={styles.stage}>
            
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

            <div 
              className={styles.secretTrigger} 
              onDoubleClick={() => {
                setShowAdminModal(true);
                playSound("glitch");
              }}
            />

            <OrbitalSystem 
              isMobile={isMobile}
              viewport={viewport}
              progress={smoothStory}
              time={time}
              mouseX={mouseX}
              mouseY={mouseY}
              playSound={playSound}
            />

            <motion.div className={styles.titleBlock} style={{ opacity: titleOpacity, y: titleY, zIndex: 55 }}>
              <h2 className={styles.mainTitle}>ASTRO SDQ</h2>
              <motion.p className={styles.edition} style={{ opacity: titleOpacity }}>5TA EDICIÓN</motion.p>
            </motion.div>

            <motion.div className={`${styles.coordBlock} ${styles.terminalFrame}`} style={{ opacity: storyOpacity, y: storyY, zIndex: 50 }}>
              <div className={styles.terminalGlow} />
              <p className={styles.location}>{editionData.location}</p>
              <p className={styles.coordinates}>{editionData.coordinates}</p>
            </motion.div>

            <motion.div className={`${styles.contactBlock} ${styles.notifyConsole}`} style={{ opacity: contactOpacity, y: contactY, zIndex: 60 }}>
              <AnimatePresence mode="wait">
                {!notifySent ? (
                  <motion.div key="form" exit={{ opacity: 0 }}>
                    <p className={styles.contactTitle}>DEJA TU CONTACTO PARA AVISO DE APERTURA</p>
                    <div className={styles.channelToggle}>
                      {(["ig", "whatsapp", "mail", "fb"] as ContactChannel[]).map((ch) => (
                        <button 
                          key={ch} 
                          className={`${styles.channelButton} ${contactChannel === ch ? styles.channelButtonActive : ""}`}
                          onClick={() => { setContactChannel(ch); playSound("click"); }}
                        >
                          <ChannelIcon channel={ch} />
                          <span>{ch.toUpperCase()}</span>
                        </button>
                      ))}
                    </div>
                    <form className={styles.notifyForm} onSubmit={handleNotifySubmit}>
                      <div className={styles.notifyInputGroup}>
                        <input className={styles.notifyInput} value={contactValue} onChange={e => setContactValue(e.target.value)} placeholder="NOMBRE / IG / USER" required />
                        <input className={styles.notifyInput} value={contactValue2} onChange={e => setContactValue2(e.target.value)} placeholder="WHATSAPP / EMAIL" required />
                      </div>
                      <button className={styles.notifyButton} type="submit">NOTIFICARME</button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div key="success" className={styles.successContainer}>
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
    </>
  );
}
