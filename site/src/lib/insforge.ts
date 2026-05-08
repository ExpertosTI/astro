const API_URL = "/api/insforge";

export type InsforgeLead = {
  contact_value: string;
  channel: string;
  project_id: string;
  metadata?: any;
};

export const insforge = {
  async saveLead(lead: InsforgeLead): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ ...lead, created_at: new Date().toISOString() })
      });
      return response.ok;
    } catch { return false; }
  },

  async getLeads(): Promise<any[]> {
    try {
      const response = await fetch(`${API_URL}/leads?order=created_at.desc`, {
        headers: { 'Accept': 'application/json' }
      });
      return response.ok ? await response.json() : [];
    } catch { return []; }
  },

  async getStats() {
    const leads = await this.getLeads();
    const stats = { total: leads.length, byChannel: {} as Record<string, number> };
    leads.forEach(l => { stats.byChannel[l.channel] = (stats.byChannel[l.channel] || 0) + 1; });
    return stats;
  }
};
