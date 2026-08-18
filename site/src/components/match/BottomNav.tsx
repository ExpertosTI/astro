"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMatch } from "@/components/match/MatchProvider";
import styles from "@/app/match/match.module.css";

const NAV = [
  { href: "/app/", label: "ASTRO", icon: "⌂", external: true },
  { href: "/match/discover/", label: "Swipe", icon: "◎" },
  { href: "/match/activity/", label: "Actividad", icon: "⚡" },
  { href: "/match/matches/", label: "Matches", icon: "✦" },
  { href: "/match/profile/", label: "Perfil", icon: "◉" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { matches, unreadCount, unreadMessagesCount } = useMatch();

  if (
    pathname === "/match" ||
    pathname === "/match/" ||
    pathname.startsWith("/match/onboarding") ||
    pathname.startsWith("/match/chat")
  ) {
    return null;
  }

  const pending = matches.filter((m) => m.status === "pending").length;
  const matchBadge = pending + unreadMessagesCount;

  return (
    <nav className={styles.matchBottomNav} aria-label="Navegación principal">
      {NAV.map((item) => {
        const external = "external" in item && item.external;
        const active = !external && pathname.startsWith(item.href);
        const badge =
          item.href === "/match/matches/" ? matchBadge :
          item.href === "/match/activity/" ? unreadCount + unreadMessagesCount : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
            style={{ position: "relative" }}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {item.label}
            {badge > 0 && <span className={styles.navBadge}>{badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
