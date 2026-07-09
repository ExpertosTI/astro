import type { ContactChannel } from "@/services/lead-service";

const NOTIFY_SECRET = process.env.NEXT_PUBLIC_NOTIFY_SECRET || "";

function notifyPayload(data: Record<string, unknown>) {
  return NOTIFY_SECRET ? { ...data, secret: NOTIFY_SECRET } : data;
}

export type LeadNotifyPayload = {
  contact: string;
  phone: string;
  channel: ContactChannel;
  metadata?: Record<string, unknown>;
};

/** WhatsApp vía Evolution: confirmación al usuario + alerta al admin. */
export async function notifyLeadRegistration(payload: LeadNotifyPayload): Promise<void> {
  try {
    const res = await fetch("/api/notify/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notifyPayload(payload)),
      keepalive: true,
    });
    if (!res.ok) {
      console.warn("[astro] notify lead:", res.status, await res.text().catch(() => ""));
    }
  } catch {
    /* no bloquear al usuario si falla */
  }
}
