"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { verifyAdminPassword, createAdminSession } from "@/lib/admin-auth";
import styles from "./astro-hero.module.css";

interface AdminAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminAccessModal({ isOpen, onClose, onSuccess }: AdminAccessModalProps) {
  const [adminPass, setAdminPass] = useState("");

  const handleAccess = async () => {
    if (await verifyAdminPassword(adminPass)) {
      createAdminSession();
      onSuccess();
      window.location.href = "/admin";
    } else {
      alert("ERROR: ACCESO DENEGADO");
      setAdminPass("");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.adminModalOverlay}>
          <motion.div
            className={styles.adminModal}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            <h3 className={styles.modalTitle}>COMANDO CENTRAL</h3>
            <p className={styles.modalDesc}>Identifíquese para ver métricas de misión</p>
            <input
              type="password"
              autoFocus
              className={styles.adminInput}
              placeholder="CLAVE DE ACCESO"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAccess();
              }}
            />
            <div className={styles.modalButtons}>
              <button className={styles.modalBtnCancel} onClick={onClose}>
                ABORTAR
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
