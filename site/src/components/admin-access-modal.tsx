"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { verifyAdminPassword, createAdminSession } from "@/lib/admin-auth";
import { loginAdminApi } from "@/lib/admin-notify-api";
import styles from "./astro-hero.module.css";

interface AdminAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AdminAccessModal({ isOpen, onClose, onSuccess }: AdminAccessModalProps) {
  const [adminPass, setAdminPass] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAccess = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (!(await verifyAdminPassword(adminPass))) {
        setError("ACCESO DENEGADO");
        setAdminPass("");
        return;
      }
      const api = await loginAdminApi(adminPass);
      createAdminSession(api.ok ? String(api.data.token || "") : undefined);
      onSuccess?.();
      window.location.href = "/admin/";
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="astro-admin-title">
          <motion.div
            className={styles.adminModal}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            <h3 id="astro-admin-title" className={styles.modalTitle}>COMANDO CENTRAL</h3>
            <p className={styles.modalDesc}>Clave de comando para evoapi · Renace · leads</p>
            <input
              type="password"
              autoFocus
              className={styles.adminInput}
              placeholder="CLAVE DE ACCESO"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAccess();
                if (e.key === "Escape") onClose();
              }}
            />
            {error && <p className={styles.modalError}>{error}</p>}
            <div className={styles.modalButtons}>
              <button type="button" className={styles.modalBtnCancel} onClick={onClose}>
                ABORTAR
              </button>
              <button type="button" className={styles.modalBtnEnter} onClick={() => void handleAccess()} disabled={busy}>
                {busy ? "…" : "ENTRAR"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
