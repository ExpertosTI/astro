"use client";

import { MatchNativeBridge } from "@/components/match/MatchNativeBridge";
import { InstallPrompt } from "@/components/match/InstallPrompt";
import { useMatch } from "@/components/match/MatchProvider";
import type { ReactNode } from "react";

export function MatchAppExtras({ children }: { children: ReactNode }) {
  const { state } = useMatch();
  return (
    <>
      <MatchNativeBridge userId={state.session?.userId} />
      <InstallPrompt />
      {children}
    </>
  );
}
