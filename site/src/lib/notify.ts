import type { ContactChannel } from "@/services/lead-service";
import { normalizePhoneDigits } from "@/lib/phone";

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

export type LeadNotifyResult = {
  ok: boolean;
  client: boolean;
  clientMail: boolean;
  admin: boolean;
  mail: boolean;
  error?: string;
};

/** WhatsApp vía Evolution: confirmación al número del contacto + alerta admin. */
export async function notifyLeadRegistration(
  payload: LeadNotifyPayload,
): Promise<LeadNotifyResult> {
  const phone = normalizePhoneDigits(payload.phone);
  try {
    const res = await fetch("/api/notify/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        notifyPayload({
          ...payload,
          phone,
        }),
      ),
      keepalive: true,
      signal: AbortSignal.timeout(28_000),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      console.warn("[astro] notify lead:", res.status, data);
      return {
        ok: false,
        client: false,
        clientMail: false,
        admin: false,
        mail: false,
        error: String(data.error || `http_${res.status}`),
      };
    }
    return {
      ok: true,
      client: Boolean(data.client),
      clientMail: Boolean(data.clientMail),
      admin: Boolean(data.admin),
      mail: Boolean(data.mail),
      error: data.clientError ? String(data.clientError) : undefined,
    };
  } catch (err) {
    console.warn("[astro] notify lead network:", err);
    return {
      ok: false,
      client: false,
      clientMail: false,
      admin: false,
      mail: false,
      error: "network_error",
    };
  }
}
