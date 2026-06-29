import type { BadgeId } from "@/types/match";
import { getBadge } from "@/lib/badges";
import styles from "@/app/match/match.module.css";

export function BadgeRow({ badges }: { badges: BadgeId[] }) {
  if (!badges.length) return null;
  return (
    <div className={styles.badgeRow}>
      {badges.slice(0, 4).map((id) => {
        const badge = getBadge(id);
        return (
          <span key={id} className={styles.badge} title={badge.description}>
            {badge.emoji} {badge.label}
          </span>
        );
      })}
    </div>
  );
}
