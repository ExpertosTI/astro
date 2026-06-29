import type { Metadata } from "next";
import { MatchProvider } from "@/components/match/MatchProvider";
import { BottomNav } from "@/components/match/BottomNav";
import { MatchAmbient } from "@/components/match/MatchAmbient";
import { SyncStatus } from "@/components/match/SyncStatus";
import { MatchPageTransition } from "@/components/match/MatchPageTransition";
import { MatchAppExtras } from "@/components/match/MatchAppExtras";
import styles from "./match.module.css";

export const metadata: Metadata = {
  title: "ASTRO Match — Conecta Tatuadores y Lienzos",
  description: "Encuentra tu lienzo perfecto o conecta con artistas en ASTRO SDQ.",
  manifest: "/match-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ASTRO Match",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function MatchLayout({ children }: { children: React.ReactNode }) {
  return (
    <MatchProvider>
      <MatchAppExtras>
        <div className={styles.matchApp}>
          <MatchAmbient />
          <SyncStatus />
          <MatchPageTransition>
            <div className={styles.matchShell}>{children}</div>
          </MatchPageTransition>
          <BottomNav />
        </div>
      </MatchAppExtras>
    </MatchProvider>
  );
}
