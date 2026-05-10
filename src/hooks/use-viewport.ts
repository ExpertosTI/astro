"use client";

import { useState, useEffect } from "react";

export function useViewport() {
  const [isMobile, setIsMobile] = useState(false);
  const [viewport, setViewport] = useState({ w: 1280, h: 800 });

  useEffect(() => {
    const updateSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return { isMobile, viewport };
}
