"use client";

import { useEffect, useState } from "react";
import { insforge, InsforgeSavedLead, InsforgeStats } from "@/lib/insforge";
import {
  verifyAdminPassword,
  createAdminSession,
  isAdminAuthenticated,
  clearAdminSession,
} from "@/lib/admin-auth";
import styles from "./admin.module.css";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [leads, setLeads] = useState<InsforgeSavedLead[]>([]);
  const [stats, setStats] = useState<InsforgeStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated()) {
      setIsAuthenticated(true);
      fetchData();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const valid = await verifyAdminPassword(password);
    if (valid) {
      createAdminSession();
      setIsAuthenticated(true);
      setPassword("");
      fetchData();
    } else {
      setLoginError("Acceso denegado. Intentos limitados.");
    }
  };

  const handleLogout = () => {
    clearAdminSession();
    setIsAuthenticated(false);
    setLeads([]);
    setStats(null);
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
              autoComplete="current-password"
              autoFocus
            />
            {loginError && (
              <p style={{ color: "#ff6d6d", fontSize: "0.8rem", marginTop: "0.5rem" }}>{loginError}</p>
            )}
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
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className={styles.button} style={{ width: "auto", padding: "8px 16px" }} onClick={fetchData}>
              {loading ? "CARGANDO..." : "RECARGAR"}
            </button>
            <button className={styles.button} style={{ width: "auto", padding: "8px 16px", opacity: 0.7 }} onClick={handleLogout}>
              SALIR
            </button>
          </div>
        </header>

        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}>Total Leads</div>
            <div className={styles.kpiValue}>{stats?.total || 0}</div>
          </div>
          {stats?.byChannel && Object.entries(stats.byChannel).map(([channel, count]) => (
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
                  <td style={{ color: "#8ea2bf" }}>
                    {String(lead.metadata?.phone ?? lead.contact_value_2 ?? "-")}
                  </td>
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
