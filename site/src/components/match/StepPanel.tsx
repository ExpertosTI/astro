"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import styles from "@/app/match/match.module.css";

type Props = {
  stepKey: string | number;
  children: ReactNode;
};

export function StepPanel({ stepKey, children }: Props) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        className={styles.stepPanel}
        initial={{ opacity: 0, x: 28, filter: "blur(6px)" }}
        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, x: -28, filter: "blur(6px)" }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
