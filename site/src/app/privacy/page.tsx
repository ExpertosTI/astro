import type { Metadata } from "next";
import Link from "next/link";
import styles from "./legal.module.css";

export const metadata: Metadata = {
  title: "Política de Privacidad — ASTRO",
  description: "Cómo ASTRO y sus módulos tratan tus datos personales.",
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <p className={styles.brand}>ASTRO</p>
      <h1 className={styles.title}>Política de Privacidad</h1>
      <p className={styles.meta}>Última actualización: 25 de julio de 2026</p>

      <section className={styles.section}>
        <h2>1. Quiénes somos</h2>
        <p>
          ASTRO y sus módulos, incluido ASTRO Match, son operados por Renace Tech /
          ASTRO SDQ (“nosotros”). Contacto:{" "}
          <a href="mailto:info@renace.tech">info@renace.tech</a>. Sitio:{" "}
          <a href="https://astro.renace.tech">https://astro.renace.tech</a>.
        </p>
      </section>

      <section className={styles.section}>
        <h2>2. Qué datos recopilamos</h2>
        <ul>
          <li>Cuenta y perfil: nombre o alias, fotos, rol (tatuador/lienzo), ciudad, preferencias.</li>
          <li>Contenido de usuario: mensajes de chat, matches, actividad dentro de la app.</li>
          <li>Identificadores técnicos: tokens de notificaciones push, datos básicos del dispositivo.</li>
          <li>Uso: interacciones de swipe, filtros y pantallas visitadas para mejorar el servicio.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>3. Para qué los usamos</h2>
        <ul>
          <li>Crear y mostrar tu perfil a otros usuarios.</li>
          <li>Facilitar matches y mensajería entre tatuadores y lienzos.</li>
          <li>Enviar notificaciones relacionadas con la app (si las autorizas).</li>
          <li>Seguridad, moderación y prevención de abuso.</li>
          <li>Cumplir obligaciones legales cuando aplique.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>4. Con quién compartimos datos</h2>
        <p>
          No vendemos tus datos. Podemos usar proveedores de infraestructura (hosting, base de datos,
          notificaciones) que procesan datos solo para operar ASTRO. Otros usuarios ven la
          información de perfil que tú publicas.
        </p>
      </section>

      <section className={styles.section}>
        <h2>5. Conservación y seguridad</h2>
        <p>
          Conservamos la cuenta mientras esté activa. Puedes solicitar eliminación escribiendo a{" "}
          <a href="mailto:info@renace.tech">info@renace.tech</a>. Aplicamos medidas razonables de
          seguridad; ningún sistema es 100% infalible.
        </p>
      </section>

      <section className={styles.section}>
        <h2>6. Tus derechos</h2>
        <p>
          Puedes solicitar acceso, corrección o eliminación de tus datos personales contactándonos.
          También puedes dejar de usar la app y solicitar el cierre de cuenta.
        </p>
      </section>

      <section className={styles.section}>
        <h2>7. Menores</h2>
        <p>
          ASTRO está dirigida a personas mayores de 17 años. No recopilamos de forma consciente
          datos de menores de esa edad.
        </p>
      </section>

      <section className={styles.section}>
        <h2>8. Cambios</h2>
        <p>
          Podemos actualizar esta política. La fecha de “Última actualización” indica la versión
          vigente publicada en esta página.
        </p>
      </section>

      <p className={styles.footer}>
        <Link href="/support">Soporte</Link>
        {" · "}
        <Link href="/">Inicio</Link>
      </p>
    </main>
  );
}
