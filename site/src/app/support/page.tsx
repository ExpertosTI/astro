import type { Metadata } from "next";
import Link from "next/link";
import styles from "../privacy/legal.module.css";

export const metadata: Metadata = {
  title: "Soporte — ASTRO",
  description: "Ayuda y contacto para ASTRO y sus módulos.",
};

export default function SupportPage() {
  return (
    <main className={styles.page}>
      <p className={styles.brand}>ASTRO</p>
      <h1 className={styles.title}>Soporte</h1>
      <p className={styles.meta}>Estamos para ayudarte con la app y tu cuenta.</p>

      <section className={styles.section}>
        <h2>Contacto</h2>
        <ul>
          <li>
            Email: <a href="mailto:info@renace.tech">info@renace.tech</a>
          </li>
          <li>
            Alternativo: <a href="mailto:astrosdq@gmail.com">astrosdq@gmail.com</a>
          </li>
          <li>
            Web: <a href="https://astro.renace.tech">https://astro.renace.tech</a>
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Temas frecuentes</h2>
        <ul>
          <li>Problemas para iniciar sesión o completar el perfil</li>
          <li>Matches, chat o notificaciones push</li>
          <li>Reportar un usuario o contenido inapropiado</li>
          <li>Solicitar eliminación de cuenta y datos</li>
        </ul>
        <p>Responde el correo con tu alias de la app y una descripción breve del problema.</p>
      </section>

      <p className={styles.footer}>
        <Link href="/privacy">Política de Privacidad</Link>
        {" · "}
        <Link href="/match">Abrir Match</Link>
      </p>
    </main>
  );
}
