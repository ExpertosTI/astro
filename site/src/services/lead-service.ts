import { insforge } from "@/lib/insforge";
import { notifyLeadRegistration } from "@/lib/notify";
import { isValidPhone, normalizePhoneDigits } from "@/lib/phone";
import { ASTRO_CONFIG } from "@/config/astro-config";

export type ContactChannel = "mail" | "ig" | "fb" | "whatsapp";
export type NotifyLead = {
  contact: string;
  phone: string;
  channel: ContactChannel;
  createdAt: string;
};

export const LeadService = {
  getLeads: (): NotifyLead[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(ASTRO_CONFIG.storage.leadsKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown[];
      return parsed
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const contact = String(row.contact ?? row.value ?? "").trim();
          const phone = String(row.phone ?? row.value2 ?? "").trim();
          const channel = row.channel as ContactChannel;
          const createdAt = String(row.createdAt ?? "");
          if (!contact || !phone || !channel || !createdAt) return null;
          return { contact, phone, channel, createdAt };
        })
        .filter((item): item is NotifyLead => item !== null);
    } catch {
      return [];
    }
  },

  registerLead: async (
    lead: Omit<NotifyLead, "createdAt">,
    metadata?: Record<string, unknown>,
  ): Promise<{ ok: boolean; notified: boolean }> => {
    const contact = lead.contact.trim();
    const phone = lead.phone.trim();
    if (!contact || !isValidPhone(phone)) return { ok: false, notified: false };

    try {
      const createdAt = new Date().toISOString();
      const normalizedPhone = normalizePhoneDigits(phone) || phone;
      const newLead: NotifyLead = { ...lead, contact, phone: normalizedPhone, createdAt };

      const currentLeads = LeadService.getLeads();
      currentLeads.push(newLead);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          ASTRO_CONFIG.storage.leadsKey,
          JSON.stringify(currentLeads.slice(-ASTRO_CONFIG.storage.maxLeads)),
        );
      }

      await insforge.saveLead({
        contact_value: `${lead.channel}:${contact}`,
        channel: lead.channel,
        project_id: ASTRO_CONFIG.project.id,
        metadata: { phone: normalizedPhone, contact, createdAt, source: "web-landing", ...metadata },
      });

      const notify = await notifyLeadRegistration({
        contact,
        phone: normalizedPhone,
        channel: lead.channel,
        metadata: { source: "web-landing", ...metadata },
      });

      if (!notify.client) {
        console.warn("[astro] lead saved but WhatsApp to contact failed:", notify.error);
      }

      return { ok: true, notified: notify.client };
    } catch (e) {
      console.error("Lead registration sync error:", e);
      return { ok: true, notified: false };
    }
  },
};
