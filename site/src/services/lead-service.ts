import { insforge } from "@/lib/insforge";
import { notifyLeadRegistration } from "@/lib/notify";
import { isValidPhone } from "@/lib/phone";
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
  ): Promise<boolean> => {
    const contact = lead.contact.trim();
    const phone = lead.phone.trim();
    if (!contact || !isValidPhone(phone)) return false;

    try {
      const createdAt = new Date().toISOString();
      const newLead: NotifyLead = { ...lead, contact, phone, createdAt };

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
        metadata: { phone, contact, createdAt, source: "web-landing", ...metadata },
      });

      void notifyLeadRegistration({
        contact,
        phone,
        channel: lead.channel,
        metadata: { source: "web-landing", ...metadata },
      });

      return true;
    } catch (e) {
      console.error("Lead registration sync error:", e);
      return true;
    }
  },
};
