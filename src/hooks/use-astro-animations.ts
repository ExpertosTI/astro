"use client";

import { useScroll, useSpring, useTransform, useMotionValue, useMotionValueEvent } from "framer-motion";
import { useState } from "react";

export function useAstroAnimations(isMobile: boolean, videoReady: boolean, videoRef: React.RefObject<HTMLVideoElement | null>) {
  const { scrollYProgress } = useScroll();
  const smoothStory = useSpring(scrollYProgress, { stiffness: 45, damping: 20, restDelta: 0.001 });
  
  const time = useMotionValue(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothInteraction = useSpring(useTransform(time, [0, 100], [0, 100]), { stiffness: 40, damping: 25 });

  // Narrative Transforms (Responsive)
  const titleOpacity = useTransform(smoothStory, [0.02, 0.10], [0, 1]);
  const titleY = useTransform(smoothStory, [0, 0.1, 0.85, 0.95], isMobile ? ["15vh", "10vh", "10vh", "5vh"] : ["25vh", "22vh", "22vh", "8vh"]); 
  
  const editionOpacity = useTransform(smoothStory, [0.05, 0.15, 0.30, 0.40], [0, 1, 1, 0]);
  
  const storyOpacity = useTransform(smoothStory, [0.35, 0.45], [0, 1]);
  const storyY = useTransform(smoothStory, [0.3, 0.45, 0.85, 0.95], isMobile ? ["45vh", "40vh", "40vh", "35vh"] : ["52vh", "48vh", "48vh", "32vh"]); 
  
  const coordsOpacity = useTransform(smoothStory, [0.45, 0.55, 0.75, 0.85], [0, 1, 1, 0]);
  const coordsSkew = useTransform(smoothStory, [0.45, 0.55, 0.65], isMobile ? [6, 0, 0] : [4, 0, 0]);
  
  const contactOpacity = useTransform(smoothStory, [0.90, 0.98], [0, 1]);
  const contactY = useTransform(smoothStory, [0.85, 1], isMobile ? ["70vh", "60vh"] : ["75vh", "65vh"]);

  // Cinema FX
  const desktopColorReveal = useTransform(smoothStory, [0.06, 0.56], [0, 1]);
  const desktopLowerMaskOpacity = useTransform(smoothStory, [0, 0.28], [0.8, 0.14]);
  const desktopFrameScale = useTransform(smoothStory, [0, 1], [1.02, 1.08]);
  const desktopFrameY = useTransform(smoothStory, [0, 1], [-8, 12]);
  const mobileVideoScale = useTransform(smoothStory, [0.8, 1], [1.18, 1.25]);

  // Interaction FX
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

  // States for persistence
  const [hasRevealedTitle, setHasRevealedTitle] = useState(false);
  const [hasRevealedCoords, setHasRevealedCoords] = useState(false);
  const [isGlitchingOut, setIsGlitchingOut] = useState(false);

  useMotionValueEvent(smoothStory, "change", (v) => {
    // Marcamos como revelado una vez se pasa el umbral
    if (v > 0.15) setHasRevealedTitle(true);
    if (v > 0.55) setHasRevealedCoords(true);

    // Los glitches solo ocurren durante la transición activa si NO se han revelado permanentemente
    const titleGlitch = !hasRevealedTitle && v > 0.08 && v < 0.12;
    const coordsGlitch = !hasRevealedCoords && v > 0.40 && v < 0.50;
    setIsGlitchingOut(titleGlitch || coordsGlitch);

    // Scrubbing de video
    if (!isMobile && videoRef.current && videoReady) {
      const VIDEO_SCRUB_START = 1.2;
      const VIDEO_SCRUB_END_PADDING = 0.25;
      const video = videoRef.current;
      const usableDuration = Math.max(video.duration - VIDEO_SCRUB_START - VIDEO_SCRUB_END_PADDING, 0.01);
      video.currentTime = VIDEO_SCRUB_START + (v * usableDuration);
    }
  });

  return {
    smoothStory, time, mouseX, mouseY,
    titleOpacity, titleY, editionOpacity,
    storyOpacity, storyY, coordsOpacity, coordsSkew,
    contactOpacity, contactY,
    desktopColorReveal, desktopLowerMaskOpacity, desktopFrameScale, desktopFrameY, mobileVideoScale,
    desktopNebulaOpacity, desktopNebulaX, desktopNebulaY, desktopNebulaScale, desktopNebulaRotate,
    desktopRayOpacity, desktopRayX, desktopRayY, desktopRayScaleX, desktopRayScaleY,
    cameraRotateX, cameraRotateY,
    isGlitchingOut
  };
}
