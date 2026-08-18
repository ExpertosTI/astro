import type { Metadata } from "next";
import Link from "next/link";
import { AstroDock } from "@/components/AstroDock";
import { editionData } from "@/content/edition";
import styles from "./evento.module.css";

export const metadata: Metadata = {
  title: `${editionData.title} — Evento`,
  description: `${editionData.dates} · ${editionData.venue}`,
};

export default function EventPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/app/" aria-label="Volver a ASTRO">
          ←
        </Link>
        <div>
          <p>ASTRO SDQ</p>
          <h1>Evento 2027</h1>
        </div>
      </header>

      <section className={styles.hero}>
        <p className={styles.kicker}>5TA EDICIÓN</p>
        <h2>{editionData.datesShort}</h2>
        <p className={styles.venue}>{editionData.venue}</p>
        <p className={styles.coords}>{editionData.coordinates}</p>
      </section>

      <section className={styles.card}>
        <p className={styles.label}>La experiencia</p>
        <p className={styles.body}>{editionData.paragraph1}</p>
        <p className={styles.bodyStrong}>{editionData.paragraph2}</p>
      </section>

      <section className={styles.stands} aria-labelledby="stands-title">
        <p className={styles.label} id="stands-title">
          Stands
        </p>
        <article className={styles.stand}>
          <div>
            <h3>{editionData.stands.regular.label}</h3>
            <p>{editionData.stands.regular.detail}</p>
          </div>
          <strong>{editionData.stands.regular.price}</strong>
        </article>
        <article className={styles.stand}>
          <div>
            <h3>{editionData.stands.doble.label}</h3>
            <p>{editionData.stands.doble.detail}</p>
          </div>
          <strong>{editionData.stands.doble.price}</strong>
        </article>
      </section>

      <div className={styles.actions}>
        <Link href="/match/" className={styles.primary}>
          Abrir ASTRO Match
        </Link>
        <Link href="/" className={styles.secondary}>
          Ver sitio completo
        </Link>
      </div>

      <AstroDock />
    </main>
  );
}
