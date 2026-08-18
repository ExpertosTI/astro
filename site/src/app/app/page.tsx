import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AstroDock } from "@/components/AstroDock";
import { astroNews } from "@/content/news";
import { editionData } from "@/content/edition";
import styles from "./app.module.css";

export const metadata: Metadata = {
  title: "ASTRO — Match, noticias y comunidad",
  description: "Todo el universo ASTRO SDQ en una sola app.",
};

export default function AstroAppHome() {
  return (
    <main className={styles.app}>
      <div className={styles.glow} aria-hidden />

      <header className={styles.header}>
        <div className={styles.identity}>
          <Image
            src={editionData.logo}
            alt=""
            width={54}
            height={54}
            className={styles.logo}
            priority
          />
          <div>
            <p className={styles.wordmark}>ASTRO</p>
            <p className={styles.location}>Santo Domingo</p>
          </div>
        </div>
        <span className={styles.edition}>5TA EDICIÓN · 2027</span>
      </header>

      <section className={styles.intro}>
        <p className={styles.kicker}>Tu universo creativo</p>
        <h1>ASTRO vive aquí.</h1>
        <p>
          Conecta con la comunidad, descubre lo nuevo y prepárate para la próxima
          edición.
        </p>
      </section>

      <Link href="/match/" className={styles.matchCard}>
        <span className={styles.matchSignal}>MÓDULO PRINCIPAL</span>
        <div className={styles.matchCopy}>
          <p className={styles.matchName}>
            ASTRO <strong>MATCH</strong>
          </p>
          <h2>Encuentra tu próxima conexión.</h2>
          <p>Descubre perfiles · Haz match · Coordina sesiones</p>
        </div>
        <span className={styles.enter}>ENTRAR <span aria-hidden>→</span></span>
      </Link>

      <section className={styles.modules} aria-labelledby="modules-title">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>EXPLORA</p>
            <h2 id="modules-title">Todo ASTRO</h2>
          </div>
        </div>

        <div className={styles.moduleGrid}>
          <Link href="/news/" className={styles.moduleCard}>
            <span className={styles.moduleIcon} aria-hidden>◫</span>
            <div>
              <h3>Noticias</h3>
              <p>Actualizaciones, artistas y comunidad.</p>
            </div>
            <span className={styles.moduleArrow} aria-hidden>↗</span>
          </Link>

          <Link href="/evento/" className={styles.moduleCard}>
            <span className={styles.moduleIcon} aria-hidden>◎</span>
            <div>
              <h3>Evento 2027</h3>
              <p>{editionData.datesShort}</p>
            </div>
            <span className={styles.moduleArrow} aria-hidden>↗</span>
          </Link>
        </div>
      </section>

      <section className={styles.news} aria-labelledby="news-title">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>AL DÍA</p>
            <h2 id="news-title">Últimas noticias</h2>
          </div>
          <Link href="/news/">Ver todas</Link>
        </div>

        <div className={styles.newsList}>
          {astroNews.slice(0, 2).map((item) => (
            <article key={item.id} className={styles.newsItem}>
              <p>{item.eyebrow}</p>
              <h3>{item.title}</h3>
              <span>{item.summary}</span>
            </article>
          ))}
        </div>
      </section>

      <AstroDock />
    </main>
  );
}
