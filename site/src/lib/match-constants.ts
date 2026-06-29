import type { BodyPart, DayOfWeek, TimeSlot } from "@/types/match";

export const BODY_PARTS: { id: BodyPart; label: string }[] = [
  { id: "brazo", label: "Brazo" },
  { id: "antebrazo", label: "Antebrazo" },
  { id: "hombro", label: "Hombro" },
  { id: "espalda", label: "Espalda" },
  { id: "pecho", label: "Pecho" },
  { id: "pierna", label: "Pierna" },
  { id: "muslo", label: "Muslo" },
  { id: "mano", label: "Mano" },
  { id: "cuello", label: "Cuello" },
  { id: "otro", label: "Otro" },
];

export const DAYS: { id: DayOfWeek; label: string }[] = [
  { id: "lun", label: "Lun" },
  { id: "mar", label: "Mar" },
  { id: "mie", label: "Mié" },
  { id: "jue", label: "Jue" },
  { id: "vie", label: "Vie" },
  { id: "sab", label: "Sáb" },
  { id: "dom", label: "Dom" },
];

export const TIME_SLOTS: { id: TimeSlot; label: string }[] = [
  { id: "manana", label: "Mañana" },
  { id: "tarde", label: "Tarde" },
  { id: "noche", label: "Noche" },
];

export const MATCH_STORAGE_KEY = "astro-match-app-v2";
export const MATCH_STORAGE_KEY_LEGACY = "astro-match-app-v1";

export const QUICK_REPLIES = [
  "¡Hola! Me encanta tu perfil 🎨",
  "¿Tienes disponibilidad este fin de semana?",
  "¿Qué estilo te interesa?",
  "¿Podemos coordinar por WhatsApp?",
  "¡Match! Hablemos del diseño",
] as const;
