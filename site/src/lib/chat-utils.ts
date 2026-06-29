import type { AppNotification, ChatMessage, NotificationType } from "@/types/match";

export const NOTIFICATION_META: Record<
  NotificationType,
  { icon: string; label: string }
> = {
  match: { icon: "✦", label: "Match" },
  message: { icon: "💬", label: "Mensaje" },
  superlike: { icon: "⭐", label: "Super Like" },
  pending: { icon: "♥", label: "Like" },
  view: { icon: "👁", label: "Visita" },
};

export const CHAT_EMOJIS = [
  "😀", "😍", "🔥", "⭐", "💯", "👋", "🙌", "💪",
  "🎨", "🖤", "✨", "📍", "📅", "✅", "❤️", "😎",
  "🤝", "💬", "👀", "🙏", "😊", "🥳", "💉", "🦋",
] as const;

const DAY_MS = 86_400_000;

export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "ahora";
  if (diff < 3_600_000) return `hace ${Math.floor(diff / 60_000)} min`;
  if (diff < DAY_MS) return `hace ${Math.floor(diff / 3_600_000)} h`;
  if (diff < DAY_MS * 2) return "ayer";
  return new Date(iso).toLocaleDateString("es-DO", { day: "numeric", month: "short" });
}

export function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startToday - startDate) / DAY_MS);

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  return date.toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "short" });
}

export function groupMessagesByDay(messages: ChatMessage[]): { day: string; messages: ChatMessage[] }[] {
  const groups: { day: string; messages: ChatMessage[] }[] = [];
  let currentDay = "";

  for (const msg of messages) {
    const day = formatDayLabel(msg.createdAt);
    if (day !== currentDay) {
      currentDay = day;
      groups.push({ day, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

export function groupNotificationsByDay(
  notifications: AppNotification[]
): { day: string; items: AppNotification[] }[] {
  const groups: { day: string; items: AppNotification[] }[] = [];
  let currentDay = "";

  for (const n of notifications) {
    const day = formatDayLabel(n.createdAt);
    if (day !== currentDay) {
      currentDay = day;
      groups.push({ day, items: [n] });
    } else {
      groups[groups.length - 1].items.push(n);
    }
  }
  return groups;
}

/** Renderiza texto con emojis ligeramente más grandes */
export function splitMessageSegments(text: string): { type: "text" | "emoji"; value: string }[] {
  const parts = text.split(/(\p{Extended_Pictographic}+)/gu);
  return parts
    .filter(Boolean)
    .map((value) => ({
      type: /\p{Extended_Pictographic}/u.test(value) ? "emoji" as const : "text" as const,
      value,
    }));
}

export function isTypingActive(updatedAt: string, maxAgeMs = 5000): boolean {
  return Date.now() - new Date(updatedAt).getTime() < maxAgeMs;
}
