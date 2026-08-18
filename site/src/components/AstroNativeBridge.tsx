"use client";

import { useEffect } from "react";
import { initAstroNativeShell } from "@/lib/astro-native";

/** Hides splash + sets status bar on any native entry (hub, news, match, etc.). */
export function AstroNativeBridge() {
  useEffect(() => {
    void initAstroNativeShell();
  }, []);

  return null;
}
