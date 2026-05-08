"use client";

import { useState, useEffect } from "react";
import { insforge } from "@/lib/insforge";
import styles from "./admin.module.css";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Password simple para esta versión
    if (password === "astro2026") {
      setIsAuthenticated(true);
      fetchData();
    } else {
      alert("Acceso Denegado");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const data = await insforge.getLeads();
    const s = await insforge.getStats();
    setLeads(data);
    setStats(s);
    setLoading(false);
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.loginOverlay}>
        <div className={styles.loginCard}>
          <h2 className={styles.title} style={{ marginBottom: "20px" }}>ASTRO ADMIN</h2>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              className={styles.input}
              placeholder="Código de Acceso"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <button type="submit" className={styles.button}>INGRESAR AL SISTEMA</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminContainer}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <h1 className={styles.title}>DASHBOARD EJECUTIVO</h1>
          <button className={styles.button} style={{ width: "auto", padding: "8px 16px" }} onClick={fetchData}>
            {loading ? "CARGANDO..." : "RECARGAR"}
          </button>
        </header>

        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Total Leads</div>
            <div className={styles.kpiValue}>{stats?.total || 0}</div>
          </div>
          {stats?.byChannel && Object.entries(stats.byChannel).map(([channel, count]: any) => (
            <div className={styles.kpiCard} key={channel}>
              <div className={styles.kpiLabel}>Leads {channel.toUpperCase()}</div>
              <div className={styles.kpiValue}>{count}</div>
            </div>
          ))}
        </div>

        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Canal</th>
                <th>Contacto</th>
                <th>Extra</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => (
                <tr key={i}>
                  <td style={{ color: "#8ea2bf", fontSize: "12px" }}>
                    {new Date(lead.created_at).toLocaleString()}
                  </td>
                  <td>
                    <span className={styles.channelBadge}>{lead.channel}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{lead.contact_value}</td>
                  <td style={{ color: "#8ea2bf" }}>{lead.contact_value_2 || "-"}</td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "40px", color: "#8ea2bf" }}>
                    No hay registros aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
