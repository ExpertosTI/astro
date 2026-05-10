"use client";

const NOTIFY_STORAGE_KEY = "astro-notify-leads";
const MAX_NOTIFY_LEADS = 100;

export type ContactChannel = "mail" | "ig" | "fb" | "whatsapp";
export type NotifyLead = { value: string; value2: string; channel: ContactChannel; createdAt: string };

export const LeadService = {
  getLeads: (): NotifyLead[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(NOTIFY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  registerLead: async (lead: Omit<NotifyLead, "createdAt">): Promise<boolean> => {
    try {
      const newLead: NotifyLead = { ...lead, createdAt: new Date().toISOString() };
      const currentLeads = LeadService.getLeads();
      currentLeads.push(newLead);
      
      if (typeof window !== "undefined") {
        localStorage.setItem(NOTIFY_STORAGE_KEY, JSON.stringify(currentLeads.slice(-MAX_NOTIFY_LEADS)));
      }

      // Here you could add the API call to your backend if needed
      // await fetch('/api/notify', { method: 'POST', body: JSON.stringify(newLead) });

      return true;
    } catch (e) {
      console.error("Lead registration error:", e);
      return false;
    }
  }
};
