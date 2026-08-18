"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./astro-dock.module.css";

const ITEMS = [
  { href: "/app/", label: "Inicio", icon: "⌂", match: (p: string) => p === "/app" || p === "/app/" },
  {
    href: "/match/",
    label: "Match",
    icon: "◎",
    match: (p: string) => p.startsWith("/match"),
  },
  {
    href: "/news/",
    label: "Noticias",
    icon: "◫",
    match: (p: string) => p.startsWith("/news"),
  },
  {
    href: "/evento/",
    label: "Evento",
    icon: "✦",
    match: (p: string) => p.startsWith("/evento"),
  },
] as const;

export function AstroDock() {
  const pathname = usePathname() || "";

  return (
    <nav className={styles.dock} aria-label="Navegación ASTRO">
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? styles.active : undefined}
            aria-current={active ? "page" : undefined}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
