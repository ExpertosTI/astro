"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMatch } from "@/components/match/MatchProvider";
import { fileToDataUrl } from "@/lib/match-store";
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

const STEPS = ["Rol", "Perfil", "Disponibilidad", "Fotos"];

export default function OnboardingPage() {
  const router = useRouter();
  const { register, saveProfile, state } = useMatch();

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
  const [error, setError] = useState("");

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

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAvatarUrl(await fileToDataUrl(file));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir foto");
    }
  };

  const handleBodyPhoto = async (part: BodyPart, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await fileToDataUrl(file);
      setBodyPartPhotos((prev) => [...prev.filter((p) => p.part !== part), { part, url }]);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir foto");
    }
  };

  const handlePortfolio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await fileToDataUrl(file);
      setPortfolioUrls((prev) => [...prev, url].slice(0, 6));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir foto");
    }
  };

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
    if (step === 2 && role === "lienzo" && !bodyParts.length) {
      setError("Selecciona al menos una zona del cuerpo");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const finish = () => {
    const data = {
      displayName: displayName.trim(),
      bio: bio.trim(),
      city: city.trim(),
      avatarUrl,
      bodyParts,
      bodyPartPhotos,
      availability,
      portfolioUrls,
    };

    if (!state.session && role) {
      register(role, data);
    } else {
      saveProfile(data);
    }
    router.push("/match/discover/");
  };

  return (
    <>
      <div className={styles.onboardingHero}>
        <p className={styles.matchTag}>ASTRO MATCH</p>
        <h1 className={styles.onboardingTitle}>TU LIENZO<br />TE ESPERA</h1>
        <p className={styles.onboardingSub}>
          Regístrate como tatuador o voluntario. Swipe, match y chat.
        </p>
      </div>

      <div className={styles.stepDots}>
        {STEPS.map((_, i) => (
          <span key={i} className={`${styles.stepDot} ${i === step ? styles.stepDotActive : ""}`} />
        ))}
      </div>

      {step === 0 && (
        <>
          <p className={styles.formLabel} style={{ textAlign: "center" }}>¿Cómo participas?</p>
          <div className={styles.roleGrid}>
            <button
              type="button"
              className={`${styles.roleCard} ${role === "tatuador" ? styles.roleCardSelected : ""}`}
              onClick={() => setRole("tatuador")}
            >
              <div className={styles.roleEmoji}>🖋️</div>
              <div className={styles.roleLabel}>TATUADOR</div>
              <p className={styles.roleDesc}>Busca lienzos, haz match y coordina sesiones</p>
            </button>
            <button
              type="button"
              className={`${styles.roleCard} ${role === "lienzo" ? styles.roleCardSelected : ""}`}
              onClick={() => setRole("lienzo")}
            >
              <div className={styles.roleEmoji}>🎨</div>
              <div className={styles.roleLabel}>LIENZO</div>
              <p className={styles.roleDesc}>Ofrece zonas del cuerpo y tu disponibilidad</p>
            </button>
          </div>
        </>
      )}

      {step === 1 && (
        <>
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
                  ? "Tu estilo, experiencia, estudio..."
                  : "Qué buscas, estilos que te gustan..."
              }
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Foto de perfil</label>
            <label className={styles.photoAdd}>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                "+"
              )}
              <input type="file" accept="image/*" hidden onChange={handleAvatar} />
            </label>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          {role === "lienzo" && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Zonas disponibles</label>
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
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Disponibilidad semanal</label>
            {DAYS.map((day) => (
              <div key={day.id} className={styles.availabilityRow}>
                <span className={styles.dayLabel}>{day.label}</span>
                <div className={styles.chipGrid}>
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      className={`${styles.chip} ${isSlotActive(day.id, slot.id) ? styles.chipActive : ""}`}
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
          {role === "lienzo" ? (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Fotos de zonas del cuerpo</label>
              <div className={styles.photoGrid}>
                {bodyParts.map((part) => {
                  const photo = bodyPartPhotos.find((p) => p.part === part);
                  const label = BODY_PARTS.find((b) => b.id === part)?.label ?? part;
                  return (
                    <label key={part} className={styles.photoThumb} title={label}>
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo.url} alt={label} />
                      ) : (
                        <span className={styles.photoAdd}>+</span>
                      )}
                      <input type="file" accept="image/*" hidden onChange={(e) => handleBodyPhoto(part, e)} />
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Portfolio (hasta 6 fotos)</label>
              <div className={styles.photoGrid}>
                {portfolioUrls.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <div key={i} className={styles.photoThumb}><img src={url} alt={`Portfolio ${i + 1}`} /></div>
                ))}
                {portfolioUrls.length < 6 && (
                  <label className={styles.photoAdd}>
                    +
                    <input type="file" accept="image/*" hidden onChange={handlePortfolio} />
                  </label>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {error && <p style={{ color: "#ff6d6d", fontSize: "0.75rem", marginBottom: "0.75rem" }}>{error}</p>}

      {step < STEPS.length - 1 ? (
        <button type="button" className={styles.primaryBtn} onClick={next}>
          Continuar
        </button>
      ) : (
        <button type="button" className={styles.primaryBtn} onClick={finish}>
          Entrar a Match
        </button>
      )}

      {step > 0 && (
        <button
          type="button"
          className={styles.ghostBtn}
          style={{ marginTop: "0.5rem" }}
          onClick={() => setStep((s) => s - 1)}
        >
          Atrás
        </button>
      )}
    </>
  );
}
