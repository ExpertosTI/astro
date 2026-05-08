/**
 * INSFORGE ADAPTER
 * Cliente de conexión para la base de datos de Insforge (PostgREST)
 */

const API_URL = process.env.NEXT_PUBLIC_INSFORGE_API_URL;

export type InsforgeEdition = {
  id?: string;
  name: string;
  coordinates: string;
  location: string;
  is_active: boolean;
  metadata?: any;
};

export type InsforgeLead = {
  contact_value: string;
  channel: string;
  project_id: string;
  metadata?: any;
};

export const insforge = {
  /**
   * Obtiene la edición activa configurada en Insforge
   */
  async getActiveEdition(): Promise<InsforgeEdition | null> {
    try {
      if (!API_URL) return null;
      
      const response = await fetch(`${API_URL}/editions?is_active=eq.true&limit=1`, {
        headers: { 'Accept': 'application/vnd.pgrst.object+json' }
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      // Fail silently to use local fallbacks
      return null;
    }
  },

  /**
   * Registra un nuevo lead (contacto) en la base de datos
   */
  async saveLead(lead: InsforgeLead): Promise<boolean> {
    try {
      if (!API_URL) return false;

      const response = await fetch(`${API_URL}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          ...lead,
          created_at: new Date().toISOString()
        })
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  },

  /**
   * Obtiene la lista de leads (Solo para Admin)
   */
  async getLeads(): Promise<any[]> {
    try {
      if (!API_URL) return [];
      const response = await fetch(`${API_URL}/leads?order=created_at.desc`, {
        headers: { 'Accept': 'application/json' }
      });
      return response.ok ? await response.json() : [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Obtiene estadísticas rápidas de leads
   */
  async getStats(): Promise<{ total: number; byChannel: Record<string, number> }> {
    const leads = await this.getLeads();
    const stats = {
      total: leads.length,
      byChannel: {} as Record<string, number>
    };

    leads.forEach(l => {
      stats.byChannel[l.channel] = (stats.byChannel[l.channel] || 0) + 1;
    });

    return stats;
  }
};
