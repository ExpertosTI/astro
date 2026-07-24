"use client";

import { motion, AnimatePresence, MotionValue } from "framer-motion";
import { useState } from "react";
import { LeadService, ContactChannel } from "@/services/lead-service";
import { AudioService } from "@/services/audio-service";
import styles from "./astro-hero.module.css";

interface ContactSystemProps {
  opacity: MotionValue<number>;
  y: MotionValue<string>;
  isMobile: boolean;
}

function ChannelIcon({ channel }: { channel: ContactChannel }) {
  if (channel === "mail") return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.channelIcon}>
      <path d="M3 6h18v12H3z" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M3 7l9 7 9-7" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
  if (channel === "ig") return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.channelIcon}>
      <rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="3.7" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
    </svg>
  );
  if (channel === "fb") return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.channelIcon}>
      <path d="M13 21v-7h2.4l.4-3H13V9.2c0-.9.3-1.5 1.6-1.5h1.4V5.1c-.2 0-1-.1-2-.1-2 0-3.4 1.2-3.4 3.5V11H8.2v3h2.4v7h2.4z" fill="currentColor" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.channelIcon}>
      <path d="M12 3.2A8.8 8.8 0 0 0 4.6 17.8L3.5 22l4.3-1.1A8.8 8.8 0 1 0 12 3.2z" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M8.4 9.1c.1-.2.2-.2.4-.2h.8c.1 0 .3 0 .4.3l.6 1.5c.1.2.1.3 0 .5l-.5.7c-.1.2-.1.3 0 .5.3.5 1 .9 1.4 1.2.5.3.9.5 1.4.2l.7-.4c.2-.1.3-.1.5 0l1.4.7c.2.1.2.2.2.4v.8c0 .2-.1.3-.2.4-.3.3-.8.5-1.3.5-2.9 0-6-3-6-5.9 0-.5.2-1 .4-1.2z" fill="currentColor" />
    </svg>
  );
}

export default function ContactSystem({ opacity, y, isMobile }: ContactSystemProps) {
  const [channel, setChannel] = useState<ContactChannel>("ig");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);

  const contactPlaceholder = channel === "mail"
    ? "Tu email (Requerido)"
    : channel === "ig"
      ? "@tu_usuario_ig (Requerido)"
      : channel === "fb"
        ? "Enlace de tu Facebook (Requerido)"
        : "Tu nombre (Requerido)";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await LeadService.registerLead({ contact: contact.trim(), phone: phone.trim(), channel });
    if (result.ok) {
      setSent(true);
      AudioService.play("transition");
    }
  };

  return (
    <motion.div 
      className={`${styles.contactBlock} ${styles.notifyConsole} ${!isMobile ? styles.desktopGlitchReveal : ""}`} 
      style={{ opacity, y, zIndex: 60 }}
    >
      <div className={styles.notifyNoise} aria-hidden="true" />
      <AnimatePresence mode="wait">
        {!sent ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}>
            <p className={styles.contactTitle}>DEJA TU CONTACTO PARA AVISO DE APERTURA</p>
            <div className={styles.channelToggle}>
              {(["ig", "whatsapp", "mail", "fb"] as ContactChannel[]).map((ch) => (
                <button 
                  key={ch} 
                  className={`${styles.channelButton} ${channel === ch ? styles.channelButtonActive : ""}`}
                  onClick={() => { setChannel(ch); AudioService.play("click"); }}
                >
                  <ChannelIcon channel={ch} />
                  <span>{ch === "ig" ? "INSTAGRAM" : ch.toUpperCase()}</span>
                </button>
              ))}
            </div>
            <form className={styles.notifyForm} onSubmit={handleSubmit}>
              <div className={styles.notifyInputGroup}>
                <input
                  className={styles.notifyInput}
                  type={channel === "mail" ? "email" : "text"}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={contactPlaceholder}
                  required
                />
                <input
                  className={styles.notifyInput}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="WhatsApp 809/829/849…"
                  required
                />
              </div>
              <button className={styles.notifyButton} type="submit" onClick={() => AudioService.play("click")}>NOTIFICARME</button>
            </form>
          </motion.div>
        ) : (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} className={styles.successContainer}>
            <div className={styles.successIcon}>✓</div>
            <h3 className={styles.successTitle}>ACCESO CONCEDIDO</h3>
            <p className={styles.successText}>REGISTRO COMPLETADO. RECIBIRÁS UN AVISO PRONTO.</p>
            <div className={styles.successGlow} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
