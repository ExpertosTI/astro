"use client";

import { BODY_PARTS } from "@/lib/match-constants";
import type { DiscoverFilters } from "@/types/match";
import styles from "@/app/match/match.module.css";

type Props = {
  filters: DiscoverFilters;
  cities: string[];
  open: boolean;
  onChange: (filters: DiscoverFilters) => void;
  onClose: () => void;
};

export function FilterPanel({ filters, cities, open, onChange, onClose }: Props) {
  if (!open) return null;

  return (
    <div className={styles.filterPanel}>
      <div className={styles.filterHeader}>
        <span className={styles.filterTitle}>Filtros</span>
        <button type="button" className={styles.filterClose} onClick={onClose}>
          ✕
        </button>
      </div>

      <label className={styles.formLabel}>Ciudad</label>
      <select
        className={styles.formInput}
        value={filters.city}
        onChange={(e) => onChange({ ...filters, city: e.target.value })}
      >
        <option value="">Todas</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>

      <label className={styles.formLabel} style={{ marginTop: "0.75rem" }}>
        Zona del cuerpo
      </label>
      <div className={styles.chipGrid}>
        <button
          type="button"
          className={`${styles.chip} ${!filters.bodyPart ? styles.chipActive : ""}`}
          onClick={() => onChange({ ...filters, bodyPart: "" })}
        >
          Todas
        </button>
        {BODY_PARTS.map((part) => (
          <button
            key={part.id}
            type="button"
            className={`${styles.chip} ${filters.bodyPart === part.id ? styles.chipActive : ""}`}
            onClick={() => onChange({ ...filters, bodyPart: part.id })}
          >
            {part.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={styles.primaryBtn}
        style={{ marginTop: "1rem" }}
        onClick={onClose}
      >
        Aplicar
      </button>
    </div>
  );
}
