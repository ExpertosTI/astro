import type { Metadata } from "next";
import { MatchProvider } from "@/components/match/MatchProvider";
import { BottomNav } from "@/components/match/BottomNav";
import styles from "./match.module.css";

export const metadata: Metadata = {
  title: "ASTRO Match — Conecta Tatuadores y Lienzos",
  description: "Encuentra tu lienzo perfecto o conecta con artistas en ASTRO SDQ.",
};

export default function MatchLayout({ children }: { children: React.ReactNode }) {
  return (
    <MatchProvider>
      <div className={styles.matchApp}>
        <div className={styles.matchShell}>{children}</div>
        <BottomNav />
      </div>
    </MatchProvider>
  );
}
