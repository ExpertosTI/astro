import Image from "next/image";
import { editionData } from "@/content/edition";
import styles from "@/app/match/match.module.css";

type Props = {
  subtitle?: string;
  compact?: boolean;
};

export function MatchBrand({ subtitle, compact = false }: Props) {
  return (
    <header className={`${styles.brandHeader} ${compact ? styles.brandHeaderCompact : ""}`}>
      <div className={styles.brandRow}>
        <div className={styles.brandLogoWrap}>
          <Image
            src={editionData.logo}
            alt="ASTRO"
            width={compact ? 36 : 48}
            height={compact ? 36 : 48}
            className={styles.brandLogo}
            priority
          />
          <div className={styles.brandGlow} aria-hidden />
        </div>
        <div className={styles.brandText}>
          <p className={styles.brandAstro}>ASTRO</p>
          <p className={styles.brandMatch}>MATCH</p>
        </div>
      </div>
      {subtitle && !compact && <p className={styles.brandSubtitle}>{subtitle}</p>}
    </header>
  );
}
