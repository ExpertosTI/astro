"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import {
  motion, AnimatePresence,
  useScroll, useTransform, useSpring, MotionValue, useMotionValueEvent, useTime, useMotionValue, animate,
} from "framer-motion";
import { editionData as localEditionData } from "@/content/edition";
import { insforge, type InsforgeEdition } from "@/lib/insforge";
import styles from "./astro-hero.module.css";

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
const MOBILE_WEBM_SRC: string | null = null;
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

  // Secuencia lineal: elementos 1→2→3→4→logo
  // El último frame (logo) se queda visible hasta que el video esté listo.
  useEffect(() => {
    if (step < PRELOADER_LOGO_STEP) {
      const t = setTimeout(() => setStep((s) => s + 1), 520);
      return () => clearTimeout(t);
    }

    if (step === PRELOADER_LOGO_STEP && ready && !isExiting) {
      setIsExiting(true);
    }

    return undefined;
  }, [step, ready, isExiting]);

  useEffect(() => {
    if (!isExiting) return;
    const t = setTimeout(onDone, 950); // Un poco más de tiempo para que la animación de glitch termine
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

/* ────────────────────────────────────────────────────────
   RING: CSS puro para spin (60fps garantizado, sin conflicto con Framer)
──────────────────────────────────────────────────────── */
function CornerRing({
  src, size, rotZ, speed, originX, originY, fieldX, fieldY, driftX, driftY, swayX, swayY, phase, variant, progress, time, mouseX, mouseY,
}: {
  src: string; size: string; rotZ: number; speed: number;
  originX: number; originY: number; fieldX: number; fieldY: number; driftX: number; driftY: number;
  swayX: number; swayY: number; phase: number; variant: string; progress: MotionValue<number>;
  time: MotionValue<number>;
  mouseX: MotionValue<number>; mouseY: MotionValue<number>;
}) {
  const wrap = (value: number, limit: number) => {
    const span = limit * 2;
    return ((((value + limit) % span) + span) % span) - limit;
  };

  // Movimiento cinemático: deriva lineal con reentrada + Deriva orgánica multicapa
  const dx = useTransform([progress, time, mouseX], ([p, t, mx]) => {
    const driftAutoX = Math.sin((t as number) / 2800 + phase) * 35 + Math.sin((t as number) / 1400) * 12;
    const travelX = originX + driftX * (p as number) + phase * swayX * 0.7;
    const parallaxX = (mx as number) * (phase * 0.05); // Parallax sutil basado en fase (cada anillo reacciona distinto)
    return wrap(travelX, fieldX) + driftAutoX + parallaxX;
  });

  const dy = useTransform([progress, time, mouseY], ([p, t, my]) => {
    const driftAutoY = Math.cos((t as number) / 3200 + phase) * 35 + Math.cos((t as number) / 1600) * 12;
    const travelY = originY + driftY * (p as number) + phase * swayY * 0.6;
    const parallaxY = (my as number) * (phase * 0.05);
    return wrap(travelY, fieldY) + driftAutoY + parallaxY;
  });

  // Rotación idle adicional (Breathing Rotation)
  const idleRot = useTransform(time, (t) => Math.sin(t / 4000 + phase) * 4);

  // Profundidad 3D (Z-axis)
  const dz = useTransform(progress, [0, 1], [0, 450]);
  const scrollRot = useTransform(progress, (value) => rotZ + value * speed * 15);
  const totalRot = useTransform([scrollRot, idleRot], ([sr, ir]) => (sr as number) + (ir as number));

  // Normalizamos el progreso para efectos visuales (0-1) basado en el travel
  const visualProgress = useTransform(progress, (v) => Math.min(Math.max(v % 1.2, 0), 1));

  // Depth of Field (DoF)
  const ringBlur = useTransform(
    visualProgress,
    [0, 0.15, 0.45, 0.7, 0.88, 1],
    [10.0, 4.0, 0, 0, 3.5, 9.0],
    { clamp: true }
  );
  
  const ringFilter = useTransform(ringBlur, (value) => value > 0.05 ? `blur(${value.toFixed(1)}px)` : "none");

  // Breathing Scale: Sutil pulso orgánico que le da vida "parado"
  const breatheScale = useTransform(time, (t) => 1 + Math.sin(t / 2200 + phase) * 0.04);

  // Opacity y Scale base: El escalado ahora es más dinámico para acompañar el blur
  const ringOpacity = useTransform(visualProgress, [0, 0.1, 0.88, 1], [0, 0.95, 0.9, 0], { clamp: true });
  const baseScale = useTransform(visualProgress, [0, 0.5, 0.85, 1], [0.55, 1.2, 2.8, 5.2], { clamp: true });
  const finalScale = useTransform([baseScale, breatheScale], ([bs, brs]) => (bs as number) * (brs as number));
  
  // Z-Index dinámico
  const ringZIndex = useTransform(visualProgress, (value) => (value > 0.82 ? 110 : 40));

  return (
    <motion.div
      className={styles.orbitalRing}
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
      }}
    >
      <div className={`${styles.ringAura} ${styles[variant]}`} />
      <div className={`${styles.ringSpinner} ${styles[variant]} ${styles[`${variant}Asset`]}`} />
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────
   HERO PRINCIPAL
──────────────────────────────────────────────────────── */
export function AstroHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const lastScrubTimeRef = useRef(-1);
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [videoReady, setVideoReady]       = useState(false);
  const [introReady, setIntroReady]       = useState(false);
  const [assetsLoaded, setAssetsLoaded]   = useState(false);
  const [viewport, setViewport] = useState({ w: 1920, h: 1080 });
  const [isMobile, setIsMobile] = useState(false);
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

  // MotionValues para Parallax de Mouse (Interactive Idle)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Sistema de Sonido Optimizado (Instancias persistentes para evitar lag)
  const soundRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const playSound = (type: "glitch" | "type" | "click" | "transition") => {
    try {
      if (!soundRefs.current[type]) {
        const audio = new Audio();
        if (type === "glitch") audio.src = "https://assets.mixkit.co/sfx/preview/mixkit-glitch-digital-interference-2466.mp3";
        if (type === "type") audio.src = "https://assets.mixkit.co/sfx/preview/mixkit-single-key-press-in-a-laptop-2541.mp3";
        if (type === "click") audio.src = "https://assets.mixkit.co/sfx/preview/mixkit-modern-click-box-check-1120.mp3";
        if (type === "transition") audio.src = "https://assets.mixkit.co/sfx/preview/mixkit-robotic-mechanical-arm-2432.mp3";
        audio.volume = type === "glitch" ? 0.1 : 0.2;
        soundRefs.current[type] = audio;
      }
      const s = soundRefs.current[type];
      s.currentTime = 0;
      s.play().catch(() => {});
    } catch (e) { /* silent */ }
  };

  // Sincronización con Insforge para datos dinámicos
  useEffect(() => {
    async function syncData() {
      try {
        const remoteData = await insforge.getActiveEdition();
        if (remoteData) {
          setEditionData(prev => ({
            ...prev,
            ...remoteData,
            location: remoteData.location || prev.location,
            coordinates: remoteData.coordinates || prev.coordinates
          }));
        }
      } catch (e) {
        console.warn("Insforge sync fallback active");
      }
    }
    syncData();
  }, []);

  // Lista de assets críticos para la experiencia premium
  const CRITICAL_ASSETS = useMemo(() => [
    ...ELEMENTS,
    localEditionData.logo,
    "/astro/backgrounds/desktop-bw.jpg",
    "/astro/backgrounds/desktop-color.jpg",
    "/astro/rings/ring-1.png",
    "/astro/rings/ring-2.png",
    "/astro/rings/ring-3.png",
    "/astro/rings/ring-4.png",
  ], []);

  // Preloader de Assets
  useEffect(() => {
    let loadedCount = 0;
    const total = CRITICAL_ASSETS.length;

    CRITICAL_ASSETS.forEach(src => {
      const img = new window.Image();
      img.src = src;
      img.onload = () => {
        loadedCount++;
        if (loadedCount >= total) setAssetsLoaded(true);
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount >= total) setAssetsLoaded(true);
      };
    });
  }, [CRITICAL_ASSETS]);

  // Liberar intro cuando los assets y el video estén listos (Premium Sync)
  useEffect(() => {
    // Si no hay video en el DOM o estamos en móvil, priorizamos assets.
    // Pero en escritorio esperamos al video para evitar el pop-in.
    const isReady = assetsLoaded && (isMobile ? true : videoReady);
    
    if (isReady) {
      const t = setTimeout(() => setIntroReady(true), 800); 
      return () => clearTimeout(t);
    }
  }, [assetsLoaded, videoReady, isMobile]);

  useEffect(() => {
    const onResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      setIsMobile(window.innerWidth <= 768);
    };
    onResize();
    window.addEventListener("resize", onResize);

    const onMouseMove = (e: MouseEvent) => {
      // Normalizamos de -1 a 1 para un parallax balanceado
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
  }, [isMobile]);

  const { scrollYProgress } = useScroll();
  const storyProgress = useMotionValue(0);
  const interactionProgress = useMotionValue(0);
  
  const smoothStory = useSpring(storyProgress, { stiffness: 45, damping: 20, restDelta: 0.0001, mass: 0.8 });
  const smoothInteraction = useSpring(interactionProgress, { stiffness: 35, damping: 25, restDelta: 0.0001, mass: 1 });

  const handleIntroDone = () => {
    setPreloaderDone(true);
    // Secuencia automática: anima el storyProgress si el usuario no ha scrolleado
    if (scrollYProgress.get() < 0.01) {
      animate(storyProgress, 1, { duration: 11, ease: "linear" });
    }
  };

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    // La historia solo avanza, nunca retrocede (No-Reverse)
    if (v > storyProgress.get()) {
      storyProgress.set(v);
    }
    // La interacción siempre sigue el scroll para permitir "jugar"
    interactionProgress.set(v);
  });

  useMotionValueEvent(storyProgress, "change", (v) => {
    // Detectar cambios de fase para "Camera Glitch" y Sonidos (solo en avance)
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

  const ringsProgress = useTransform([smoothInteraction, time], ([v, t]) => {
    // Deriva autónoma independiente del scroll para la posición base (más lenta)
    const auto = (t as number) / 26000; 
    // Multiplicador de scroll para el "empuje" cinemático
    const scrollFactor = isMobile ? 2.5 : 2.8;
    // Si llegamos al final, aumentamos sutilmente la reactividad para que sea más divertido "jugar"
    const boost = (v as number) > 0.9 ? 1.2 : 1.0;
    return auto + (v as number) * scrollFactor * boost;
  });

  const swipeOpacity = useTransform(smoothStory, [0, 0.03, 0.2, 0.28], [0, 1, 1, 0]);
  const desktopColorReveal = useTransform(smoothStory, [0.06, 0.56], [0, 1]);
  const desktopLowerMaskOpacity = useTransform(smoothStory, [0, 0.28], [0.8, 0.14]);
  
  // Efectos de Nebulosa y Rayos: los dejamos interactivos para que el fondo se sienta vivo al scrollear hacia atrás
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

  // Efecto Cámara 3D (Cockpit tilt): Rotación sutil del escenario basada en el scroll (Interactiva)
  const cameraRotateX = useTransform(smoothInteraction, [0, 0.5, 1], [1.2, 0, -1.2]);
  const cameraRotateY = useTransform(smoothInteraction, [0, 0.5, 1], [-0.8, 0, 0.8]);

  // Título: Fase inicial (0% - 35%) - Story
  const titleOpacity = useTransform(smoothStory, [0.02, 0.12, 0.28, 0.38], [0, 1, 1, 0]);
  const titleY       = useTransform(smoothStory, [0.02, 0.12], isMobile ? [20, 0] : [0, 0]);

  // Edición: sincronizada con el título - Story
  const editionOpacity = useTransform(smoothStory, [0.05, 0.15, 0.30, 0.40], [0, 1, 1, 0]);

  // Coordenadas: Fase media (45% - 75%) - Story
  const coordsOpacity = useTransform(smoothStory, [0.45, 0.55, 0.75, 0.85], [0, 1, 1, 0]);
  const coordsY       = useTransform(smoothStory, [0.45, 0.55, 0.75, 0.85], isMobile ? [24, 0, 0, -24] : [0, 0, 0, 0]);
  const coordsSkew    = useTransform(smoothStory, [0.45, 0.55, 0.65], isMobile ? [6, 0, 0] : [4, 0, 0]);

  // Contacto: Fase final (88% - 100%) - Story
  const contactOpacity = useTransform(smoothStory, [0.88, 0.96], [0, 1]);
  const contactY       = useTransform(smoothStory, [0.88, 0.96], [32, 0]);

  const [isGlitchingOut, setIsGlitchingOut] = useState(false);

  useMotionValueEvent(smoothStory, "change", (v) => {
    // Glitch Out: Detectar cuando un bloque está por desaparecer
    const isEndingTitle = v > 0.30 && v < 0.40;
    const isEndingCoords = v > 0.78 && v < 0.88;
    setIsGlitchingOut(isEndingTitle || isEndingCoords);

    if (!typingStarted && v >= 0.48) {
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
  }, [typingStarted]);

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
    playSound("transition"); // Sonido de éxito
    setContactValue("");
    setContactValue2("");
  };

  // Rings desde esquinas responsive (evita posiciones rotas en móviles/tablets)
  const rings = useMemo(() => [
    {
      id: 1,
      src: "/astro/rings/ring-1.png",
      size: viewport.w < 768 ? "44vmin" : "42vmin",
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
      id: 2,
      src: "/astro/rings/ring-2.png",
      size: viewport.w < 768 ? "42vmin" : "40vmin",
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
      id: 3,
      src: "/astro/rings/ring-3.png",
      size: viewport.w < 768 ? "40vmin" : "38vmin",
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
      id: 4,
      src: "/astro/rings/ring-4.png",
      size: viewport.w < 768 ? "46vmin" : "44vmin",
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
  ], [viewport.h, viewport.w]);

  // Momentum: Slow zoom en móvil cuando storyProgress es alto
  const mobileVideoScale = useTransform(storyProgress, [0.8, 1], [1.18, 1.25]);

  // Video scrubbing: sincroniza currentTime con storyProgress (solo Desktop para evitar freeze en móvil)
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

  // En móvil, el video simplemente corre
  useEffect(() => {
    if (isMobile && videoReady) {
      const video = videoRef.current;
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    }
  }, [isMobile, videoReady]);

  // Canvas: micro-estrellas parpadeantes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    type Star = { x: number; y: number; r: number; a: number; da: number };
    const stars: Star[] = [];
    let rafId = 0;
    const starCount = isMobile ? 110 : 180;
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
    function animate() {
      if (!ctx || !canvas) return;
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
      rafId = requestAnimationFrame(animate);
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

      <main className={`${styles.page} ${preloaderDone ? styles.pageMounted : ""}`}>
        <section className={styles.heroShell}>
          <motion.div
            className={styles.stage}
            style={{
              rotateX: cameraRotateX,
              rotateY: cameraRotateY,
            }}
          >
            {isGlitching && <div className={styles.glitchOverlay} style={{ pointerEvents: "none" }} />}

            {/* VIDEO como fondo completo — scrubbing por scroll */}
            <div className={`${styles.bgFallback} ${videoReady ? styles.bgFallbackHidden : ""}`} />
            <motion.video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              preload="auto"
              poster={isMobile ? "/astro/backgrounds/mobile-color.jpg" : "/astro/backgrounds/desktop-color.jpg"}
              className={styles.bgVideo}
              style={{ scale: isMobile ? mobileVideoScale : 1 }}
              onLoadedMetadata={() => setVideoReady(true)}
              onLoadedData={() => setVideoReady(true)}
              onCanPlay={() => setVideoReady(true)}
              onCanPlayThrough={() => setVideoReady(true)}
              onError={() => setVideoReady(true)} // Fallback para no bloquear si falla el video
            >
              {MOBILE_WEBM_SRC && <source src={MOBILE_WEBM_SRC} type="video/webm" />}
              <source src="/astro/backgrounds/video.mp4" type="video/mp4" />
            </motion.video>

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

            {/* Estrellas canvas */}
            <canvas ref={canvasRef} className={styles.spaceCanvas} />

            {/* 4 Rings: dispersos en el espacio 3D */}
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
                variant={r.variant}
                progress={ringsProgress}
                time={time}
                mouseX={mouseX}
                mouseY={mouseY}
              />
            ))}

            <motion.div className={styles.swipeCue} style={{ opacity: swipeOpacity }}>
              <span className={styles.swipeArrows}>⌄⌄⌄</span>
            </motion.div>

            {/* Título + Edición */}
            <motion.div
              className={`${styles.titleBlock} ${(isGlitching || isGlitchingOut) ? styles.dirtyTransmission : ""} ${!isMobile && !isGlitchingOut ? styles.desktopGlitchReveal : ""}`}
              style={{ opacity: titleOpacity, y: titleY, zIndex: 55 }}
            >
              <h2 className={styles.mainTitle}>ASTRO SDQ</h2>
              <motion.p
                className={styles.edition}
                style={{ opacity: editionOpacity }}
              >
                5TA EDICIÓN
              </motion.p>
            </motion.div>

            {/* Coordenadas */}
            <motion.div
              className={`${styles.coordBlock} ${styles.terminalFrame} ${(isTyping || isGlitching || isGlitchingOut) ? styles.dirtyTransmission : ""} ${!isMobile && !isTyping && !isGlitchingOut ? styles.desktopGlitchReveal : ""}`}
              style={{ opacity: coordsOpacity, y: coordsY, skewY: coordsSkew, zIndex: 50 }}
            >
              <div className={styles.terminalGlow} aria-hidden="true" />
              <div className={styles.signalBar} />
              <p className={styles.location}>{typedLocation || " "}</p>
              <p className={styles.coordinates}>{editionData.coordinates}</p>
            </motion.div>

            {/* Contacto */}
            <motion.div
              className={`${styles.contactBlock} ${styles.notifyConsole} ${!isMobile ? styles.desktopGlitchReveal : ""}`}
              style={{ opacity: contactOpacity, y: contactY, zIndex: 60 }}
            >
              <div className={styles.notifyNoise} aria-hidden="true" />
              
              <AnimatePresence mode="wait">
                {!notifySent ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                  >
                    <p className={styles.contactTitle}>DEJA TU CONTACTO PARA AVISO DE APERTURA</p>
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
                          <span>{channel === "ig" ? "INSTAGRAM" : channel === "whatsapp" ? "WHATSAPP" : channel.toUpperCase()}</span>
                        </button>
                      ))}
                    </div>

                    <form className={styles.notifyForm} onSubmit={handleNotifySubmit}>
                      <div className={styles.notifyInputGroup}>
                        <input
                          className={styles.notifyInput}
                          type={contactChannel === "mail" ? "email" : "text"}
                          value={contactValue}
                          placeholder={contactPlaceholder}
                          onChange={(e) => { setContactValue(e.target.value); }}
                          required
                        />
                        <input
                          className={`${styles.notifyInput} ${styles.notifyInput2}`}
                          type="text"
                          value={contactValue2}
                          placeholder={contact2Placeholder}
                          onChange={(e) => { setContactValue2(e.target.value); }}
                          required
                        />
                      </div>
                      <button className={styles.notifyButton} type="submit" onClick={() => playSound("click")}>NOTIFICARME</button>
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
                    <h3 className={styles.successTitle}>ACCESO CONCEDIDO</h3>
                    <p className={styles.successText}>{notifyMessage}</p>
                    <div className={styles.successGlow} />
                  </motion.div>
                )}
              </AnimatePresence>
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
