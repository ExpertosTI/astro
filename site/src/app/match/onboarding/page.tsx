"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useMatch } from "@/components/match/MatchProvider";
import { MatchBrand } from "@/components/match/MatchBrand";
import { StepPanel } from "@/components/match/StepPanel";
import { ImageUploader } from "@/components/match/ImageUploader";
import { BODY_PARTS, DAYS, TIME_SLOTS } from "@/lib/match-constants";
import type {
  AvailabilitySlot,
  BodyPart,
  BodyPartPhoto,
  DayOfWeek,
  TimeSlot,
  UserRole,
} from "@/types/match";
import styles from "../match.module.css";

const STEPS = [
  { id: "rol", label: "Rol" },
  { id: "perfil", label: "Perfil" },
  { id: "tiempo", label: "Tiempo" },
  { id: "fotos", label: "Fotos" },
] as const;

function RoleIcon({ role }: { role: "tatuador" | "lienzo" }) {
  if (role === "tatuador") {
    return (
      <svg viewBox="0 0 48 48" className={styles.roleSvg} aria-hidden>
        <path d="M10 38V14l14-6 14 6v24l-14 6-14-6z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M24 8v32M10 14l14 6 14-6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="24" cy="24" r="3" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className={styles.roleSvg} aria-hidden>
      <ellipse cx="24" cy="30" rx="12" ry="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="24" cy="16" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M18 38c2 4 10 4 12 0" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { register, saveProfile, state, syncStatus } = useMatch();

  const [step, setStep] = useState(0);
  const [role, setRole] = useState<UserRole | null>(state.session?.profile.role ?? null);
  const [displayName, setDisplayName] = useState(state.session?.profile.displayName ?? "");
  const [bio, setBio] = useState(state.session?.profile.bio ?? "");
  const [city, setCity] = useState(state.session?.profile.city ?? "Santo Domingo");
  const [avatarUrl, setAvatarUrl] = useState(state.session?.profile.avatarUrl ?? "");
  const [bodyParts, setBodyParts] = useState<BodyPart[]>(state.session?.profile.bodyParts ?? []);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(
    state.session?.profile.availability ?? []
  );
  const [bodyPartPhotos, setBodyPartPhotos] = useState<BodyPartPhoto[]>(
    state.session?.profile.bodyPartPhotos ?? []
  );
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>(
    state.session?.profile.portfolioUrls ?? []
  );
  const [willingToPay, setWillingToPay] = useState(state.session?.profile.willingToPay ?? false);
  const [budgetMin, setBudgetMin] = useState(
    state.session?.profile.budgetMin != null ? String(state.session.profile.budgetMin) : "",
  );
  const [budgetMax, setBudgetMax] = useState(
    state.session?.profile.budgetMax != null ? String(state.session.profile.budgetMax) : "",
  );
  const [sessionMinRate, setSessionMinRate] = useState(
    state.session?.profile.sessionMinRate != null ? String(state.session.profile.sessionMinRate) : "",
  );
  const [rateOpenToDiscuss, setRateOpenToDiscuss] = useState(
    state.session?.profile.rateOpenToDiscuss ?? false,
  );
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);

  const toggleBodyPart = (part: BodyPart) => {
    setBodyParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  };

  const toggleSlot = (day: DayOfWeek, slot: TimeSlot) => {
    setAvailability((prev) => {
      const existing = prev.find((a) => a.day === day);
      if (!existing) return [...prev, { day, slots: [slot] }];
      const has = existing.slots.includes(slot);
      const slots = has
        ? existing.slots.filter((s) => s !== slot)
        : [...existing.slots, slot];
      if (!slots.length) return prev.filter((a) => a.day !== day);
      return prev.map((a) => (a.day === day ? { ...a, slots } : a));
    });
  };

  const isSlotActive = (day: DayOfWeek, slot: TimeSlot) =>
    availability.find((a) => a.day === day)?.slots.includes(slot) ?? false;

  const next = () => {
    setError("");
    if (step === 0 && !role) {
      setError("Elige tu rol para continuar");
      return;
    }
    if (step === 1 && !displayName.trim()) {
      setError("Tu nombre es requerido");
      return;
    }
    if (step === 1 && role === "lienzo" && willingToPay) {
      const min = Number(budgetMin);
      const max = Number(budgetMax);
      if ((!budgetMin && !budgetMax) || (budgetMin && !Number.isFinite(min)) || (budgetMax && !Number.isFinite(max))) {
        setError("Indica el monto o rango que puedes pagar (USD)");
        return;
      }
      if (budgetMin && budgetMax && min > max) {
        setError("El mínimo no puede ser mayor que el máximo");
        return;
      }
    }
    if (step === 1 && role === "tatuador") {
      if (!rateOpenToDiscuss) {
        const min = Number(sessionMinRate);
        if (!sessionMinRate || !Number.isFinite(min) || min <= 0) {
          setError("Indica tu mínimo o elige abierto a discusión en DM");
          return;
        }
      }
    }
    if (step === 2 && role === "lienzo" && !bodyParts.length) {
      setError("Selecciona al menos una zona del cuerpo");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const finish = async () => {
    const parseMoney = (raw: string) => {
      const n = Number(raw);
      return raw.trim() && Number.isFinite(n) && n >= 0 ? n : null;
    };
    const data = {
      displayName: displayName.trim(),
      bio: bio.trim(),
      city: city.trim(),
      avatarUrl,
      bodyParts,
      bodyPartPhotos,
      availability,
      portfolioUrls,
      willingToPay: role === "lienzo" ? willingToPay : false,
      budgetMin: role === "lienzo" && willingToPay ? parseMoney(budgetMin) : null,
      budgetMax: role === "lienzo" && willingToPay ? parseMoney(budgetMax) : null,
      sessionMinRate: role === "tatuador" && !rateOpenToDiscuss ? parseMoney(sessionMinRate) : null,
      rateOpenToDiscuss: role === "tatuador" ? rateOpenToDiscuss : false,
    };

    setError("");
    setSyncing(true);
    try {
      if (!state.session && role) {
        await register(role, data);
      } else {
        await saveProfile(data);
      }
      router.push("/match/discover/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo publicar. Verifica conexión o ejecuta match-schema.sql en el servidor."
      );
    } finally {
      setSyncing(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className={styles.onboardingFlow}>
      <MatchBrand subtitle="Tu lienzo te espera · Swipe · Match · Chat" />

      <div className={styles.stepProgressWrap}>
        <div className={styles.stepProgressTrack}>
          <motion.div
            className={styles.stepProgressFill}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <div className={styles.stepLabels}>
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`${styles.stepLabel} ${i <= step ? styles.stepLabelActive : ""}`}
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.onboardingCard}>
        <StepPanel stepKey={step}>
          {step === 0 && (
            <>
              <h2 className={styles.cardTitle}>¿Cómo participas?</h2>
              <p className={styles.cardHint}>Elige tu rol en la convención ASTRO SDQ</p>
              <div className={styles.roleGrid}>
                {(["tatuador", "lienzo"] as const).map((r) => (
                  <motion.button
                    key={r}
                    type="button"
                    className={`${styles.roleCard} ${role === r ? styles.roleCardSelected : ""}`}
                    onClick={() => setRole(r)}
                    whileTap={{ scale: 0.97 }}
                  >
                    <RoleIcon role={r} />
                    <div className={styles.roleLabel}>{r === "tatuador" ? "Tatuador" : "Lienzo"}</div>
                    <p className={styles.roleDesc}>
                      {r === "tatuador"
                        ? "Busca lienzos y coordina sesiones"
                        : "Ofrece zonas y tu disponibilidad"}
                    </p>
                  </motion.button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className={styles.cardTitle}>Tu perfil</h2>
              <div className={styles.profileUploadRow}>
                <ImageUploader
                  variant="avatar"
                  value={avatarUrl}
                  onChange={setAvatarUrl}
                  onError={setError}
                  label="Foto de perfil"
                />
                <div className={styles.profileUploadMeta}>
                  <p className={styles.cardHint}>Foto visible en tu card de match</p>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nombre / Alias</label>
                <input
                  className={styles.formInput}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tu nombre artístico"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Ciudad</label>
                <input
                  className={styles.formInput}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Santo Domingo"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Bio</label>
                <textarea
                  className={styles.formTextarea}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={
                    role === "tatuador"
                      ? "Estilo, experiencia, estudio..."
                      : "Qué buscas, estilos que te gustan..."
                  }
                />
              </div>

              {role === "lienzo" && (
                <div className={styles.payBlock}>
                  <label className={styles.formLabel}>Disposición a pagar</label>
                  <div className={styles.chipGrid}>
                    <button
                      type="button"
                      className={`${styles.chip} ${willingToPay ? styles.chipActive : ""}`}
                      onClick={() => setWillingToPay(true)}
                    >
                      Sí, tengo presupuesto
                    </button>
                    <button
                      type="button"
                      className={`${styles.chip} ${!willingToPay ? styles.chipActive : ""}`}
                      onClick={() => {
                        setWillingToPay(false);
                        setBudgetMin("");
                        setBudgetMax("");
                      }}
                    >
                      Aún no / por definir
                    </button>
                  </div>
                  {willingToPay && (
                    <div className={styles.payRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Mínimo USD</label>
                        <input
                          className={styles.formInput}
                          type="number"
                          min={0}
                          inputMode="decimal"
                          value={budgetMin}
                          onChange={(e) => setBudgetMin(e.target.value)}
                          placeholder="80"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Máximo USD</label>
                        <input
                          className={styles.formInput}
                          type="number"
                          min={0}
                          inputMode="decimal"
                          value={budgetMax}
                          onChange={(e) => setBudgetMax(e.target.value)}
                          placeholder="200"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {role === "tatuador" && (
                <div className={styles.payBlock}>
                  <label className={styles.formLabel}>Tarifa</label>
                  <div className={styles.chipGrid}>
                    <button
                      type="button"
                      className={`${styles.chip} ${!rateOpenToDiscuss ? styles.chipActive : ""}`}
                      onClick={() => setRateOpenToDiscuss(false)}
                    >
                      Mínimo a recibir
                    </button>
                    <button
                      type="button"
                      className={`${styles.chip} ${rateOpenToDiscuss ? styles.chipActive : ""}`}
                      onClick={() => {
                        setRateOpenToDiscuss(true);
                        setSessionMinRate("");
                      }}
                    >
                      Abierto a discusión en DM
                    </button>
                  </div>
                  {!rateOpenToDiscuss && (
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Mínimo USD</label>
                      <input
                        className={styles.formInput}
                        type="number"
                        min={0}
                        inputMode="decimal"
                        value={sessionMinRate}
                        onChange={(e) => setSessionMinRate(e.target.value)}
                        placeholder="100"
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h2 className={styles.cardTitle}>Disponibilidad</h2>
              {role === "lienzo" && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Zonas del cuerpo</label>
                  <div className={styles.chipGrid}>
                    {BODY_PARTS.map((part) => (
                      <button
                        key={part.id}
                        type="button"
                        className={`${styles.chip} ${bodyParts.includes(part.id) ? styles.chipActive : ""}`}
                        onClick={() => toggleBodyPart(part.id)}
                      >
                        {part.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className={styles.availabilityGrid}>
                {DAYS.map((day) => (
                  <div key={day.id} className={styles.availabilityCard}>
                    <span className={styles.dayLabel}>{day.label}</span>
                    <div className={styles.slotRow}>
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          className={`${styles.slotChip} ${isSlotActive(day.id, slot.id) ? styles.slotChipActive : ""}`}
                          onClick={() => toggleSlot(day.id, slot.id)}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className={styles.cardTitle}>
                {role === "lienzo" ? "Fotos de zonas" : "Portfolio"}
              </h2>
              <p className={styles.cardHint}>
                Cualquier formato · comprimimos automáticamente
              </p>
              {role === "lienzo" ? (
                <div className={styles.photoGrid}>
                  {bodyParts.map((part) => {
                    const photo = bodyPartPhotos.find((p) => p.part === part);
                    const label = BODY_PARTS.find((b) => b.id === part)?.label ?? part;
                    return (
                      <div key={part} className={styles.photoSlot}>
                        <ImageUploader
                          variant="thumb"
                          value={photo?.url}
                          onChange={(url) =>
                            setBodyPartPhotos((prev) => [
                              ...prev.filter((p) => p.part !== part),
                              { part, url },
                            ])
                          }
                          onError={setError}
                          label={label}
                        />
                        <span className={styles.photoSlotLabel}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.photoGrid}>
                  {portfolioUrls.map((url, i) => (
                    <div key={i} className={styles.photoThumb}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Work ${i + 1}`} />
                    </div>
                  ))}
                  {portfolioUrls.length < 6 && (
                    <ImageUploader
                      variant="grid"
                      onChange={(url) => setPortfolioUrls((prev) => [...prev, url].slice(0, 6))}
                      onError={setError}
                      label="Agregar al portfolio"
                    />
                  )}
                </div>
              )}
            </>
          )}
        </StepPanel>
      </div>

      {error && <p className={styles.formError}>{error}</p>}

      {syncStatus === "offline" && !error && (
        <p className={styles.syncHint}>
          Sin servidor en vivo — los perfiles solo se ven en este dispositivo hasta conectar la API.
        </p>
      )}

      <div className={styles.onboardingActions}>
        {step < STEPS.length - 1 ? (
          <button type="button" className={styles.primaryBtn} onClick={next}>
            Continuar
          </button>
        ) : (
        <button type="button" className={styles.primaryBtn} onClick={finish} disabled={syncing}>
          {syncing ? "Publicando en la red…" : "Entrar a Match"}
        </button>
        )}
        {step > 0 && (
          <button type="button" className={styles.ghostBtn} onClick={() => setStep((s) => s - 1)}>
            Atrás
          </button>
        )}
      </div>
    </div>
  );
}
