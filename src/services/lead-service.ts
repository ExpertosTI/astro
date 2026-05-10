import { insforge } from "@/lib/insforge";
import { ASTRO_CONFIG } from "@/config/astro-config";

export type ContactChannel = "mail" | "ig" | "fb" | "whatsapp";
export type NotifyLead = { 
  value: string; 
  value2: string; 
  channel: ContactChannel; 
  createdAt: string;
};

export const LeadService = {
  getLeads: (): NotifyLead[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(ASTRO_CONFIG.storage.leadsKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  registerLead: async (lead: Omit<NotifyLead, "createdAt">): Promise<boolean> => {
    try {
      const createdAt = new Date().toISOString();
      const newLead: NotifyLead = { ...lead, createdAt };
      
      // 1. Persistencia Local (Fallback inmediato)
      const currentLeads = LeadService.getLeads();
      currentLeads.push(newLead);
      if (typeof window !== "undefined") {
        localStorage.setItem(ASTRO_CONFIG.storage.leadsKey, JSON.stringify(currentLeads.slice(-ASTRO_CONFIG.storage.maxLeads)));
      }

      // 2. Sincronización Remota (Insforge)
      await insforge.saveLead({
        contact_value: lead.value,
        channel: lead.channel,
        project_id: ASTRO_CONFIG.project.id,
        metadata: { value2: lead.value2, createdAt }
      });

      return true;
    } catch (e) {
      console.error("Lead registration sync error:", e);
      return true; // Retornamos true porque al menos se guardó localmente
    }
  }
};
