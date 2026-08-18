import type { Metadata } from "next";
import Link from "next/link";
import { AstroDock } from "@/components/AstroDock";
import { astroNews } from "@/content/news";
import styles from "./news.module.css";

export const metadata: Metadata = {
  title: "Noticias — ASTRO",
  description: "Actualizaciones oficiales de ASTRO SDQ y su comunidad.",
};

export default function NewsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/app/" aria-label="Volver a ASTRO">←</Link>
        <div>
          <p>ASTRO SDQ</p>
          <h1>Noticias</h1>
        </div>
      </header>

      <section className={styles.lead}>
        <p>SEÑAL ABIERTA</p>
        <h2>Lo que está pasando en el universo ASTRO.</h2>
      </section>

      <section className={styles.feed} aria-label="Noticias ASTRO">
        {astroNews.map((item, index) => (
          <article key={item.id} id={item.id} className={styles.card}>
            <div className={styles.number}>{String(index + 1).padStart(2, "0")}</div>
            <div>
              <p className={styles.eyebrow}>{item.eyebrow}</p>
              <h2>{item.title}</h2>
              <p className={styles.summary}>{item.summary}</p>
              <p className={styles.detail}>{item.detail}</p>
            </div>
          </article>
        ))}
      </section>

      <AstroDock />
    </main>
  );
}
