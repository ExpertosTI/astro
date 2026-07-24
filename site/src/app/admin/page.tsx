"use client";

import { useEffect, useState } from "react";
import { insforge, InsforgeSavedLead, InsforgeStats } from "@/lib/insforge";
import {
  verifyAdminPassword,
  createAdminSession,
  isAdminAuthenticated,
  clearAdminSession,
} from "@/lib/admin-auth";
import {
  loginAdminApi,
  fetchWhatsAppStatus,
  fetchWhatsAppQr,
  pollWhatsAppConnection,
  logoutWhatsApp,
  testWhatsApp,
  fetchMailStatus,
  testMail,
} from "@/lib/admin-notify-api";
import styles from "./admin.module.css";

type Tab = "leads" | "whatsapp" | "mail";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<Tab>("leads");
  const [leads, setLeads] = useState<InsforgeSavedLead[]>([]);
  const [stats, setStats] = useState<InsforgeStats | null>(null);
  const [loading, setLoading] = useState(false);

  const [waStatus, setWaStatus] = useState<Record<string, unknown> | null>(null);
  const [waMsg, setWaMsg] = useState("");
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waBusy, setWaBusy] = useState(false);

  const [mailStatus, setMailStatus] = useState<Record<string, unknown> | null>(null);
  const [mailMsg, setMailMsg] = useState("");
  const [mailBusy, setMailBusy] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated()) {
      setIsAuthenticated(true);
      fetchData();
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (tab === "whatsapp") void refreshWa();
    if (tab === "mail") void refreshMail();
  }, [tab, isAuthenticated]);

  const completeLogin = async (pass: string) => {
    const valid = await verifyAdminPassword(pass);
    if (!valid) {
      setLoginError("Acceso denegado. Intentos limitados.");
      return false;
    }
    const api = await loginAdminApi(pass);
    createAdminSession(api.ok ? String(api.data.token || "") : undefined);
    setIsAuthenticated(true);
    setPassword("");
    setLoginError("");
    fetchData();
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    await completeLogin(password);
  };

  const handleLogout = () => {
    clearAdminSession();
    setIsAuthenticated(false);
    setLeads([]);
    setStats(null);
    setWaStatus(null);
    setMailStatus(null);
    setWaQr(null);
  };

  const fetchData = async () => {
    setLoading(true);
    const data = await insforge.getLeads();
    const s = await insforge.getStats();
    setLeads(data);
    setStats(s);
    setLoading(false);
  };

  const refreshWa = async () => {
    setWaBusy(true);
    setWaMsg("");
    const { ok, data } = await fetchWhatsAppStatus();
    if (!ok) {
      setWaMsg(String(data.error || "No se pudo leer estado WhatsApp"));
      setWaBusy(false);
      return;
    }
    setWaStatus(data);
    if (data.connected) setWaQr(null);
    setWaBusy(false);
  };

  const connectWa = async () => {
    setWaBusy(true);
    setWaMsg("");
    const { ok, data } = await fetchWhatsAppQr();
    if (!ok) {
      setWaMsg(String(data.error || "No se pudo obtener QR"));
      setWaBusy(false);
      return;
    }
    if (data.alreadyConnected) {
      setWaMsg("Instancia ya vinculada.");
      setWaQr(null);
      await refreshWa();
      setWaBusy(false);
      return;
    }
    setWaQr(String(data.qrcode || ""));
    setWaMsg(`Escanea el QR · instancia ${data.instanceName || ""}`);
    setWaBusy(false);
  };

  const pollWa = async () => {
    setWaBusy(true);
    const { ok, data } = await pollWhatsAppConnection();
    if (!ok) {
      setWaMsg(String(data.error || "Error al consultar conexión"));
    } else {
      setWaMsg(`Estado: ${data.state}${data.phone ? ` · ${data.phone}` : ""}`);
      if (data.state === "open") {
        setWaQr(null);
        await refreshWa();
      }
    }
    setWaBusy(false);
  };

  const disconnectWa = async () => {
    setWaBusy(true);
    const { ok, data } = await logoutWhatsApp();
    setWaMsg(ok ? "WhatsApp desconectado" : String(data.error || "Error al desconectar"));
    setWaQr(null);
    await refreshWa();
    setWaBusy(false);
  };

  const sendWaTest = async () => {
    setWaBusy(true);
    const { ok, data } = await testWhatsApp();
    setWaMsg(ok ? `Prueba enviada a ${data.to}` : String(data.error || "Fallo prueba WA"));
    setWaBusy(false);
  };

  const refreshMail = async () => {
    setMailBusy(true);
    setMailMsg("");
    const { ok, data } = await fetchMailStatus();
    if (!ok) {
      setMailMsg(String(data.error || "No se pudo leer SMTP"));
      setMailBusy(false);
      return;
    }
    setMailStatus(data);
    const verify = data.verify as { ok?: boolean; error?: string } | undefined;
    setMailMsg(verify?.ok ? "SMTP Renace OK" : String(verify?.error || "SMTP pendiente"));
    setMailBusy(false);
  };

  const sendMailTest = async () => {
    setMailBusy(true);
    const { ok, data } = await testMail();
    setMailMsg(ok ? `Correo de prueba enviado a ${data.to}` : String(data.error || "Fallo prueba mail"));
    setMailBusy(false);
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.loginOverlay}>
        <div className={styles.loginCard}>
          <h2 className={styles.title} style={{ marginBottom: "8px" }}>ASTRO ADMIN</h2>
          <p className={styles.loginHint}>Escribe SDQ en el landing o entra aquí con la clave de comando.</p>
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

  const mailMeta = (mailStatus?.status || {}) as Record<string, string | null>;

  return (
    <div className={styles.adminContainer}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <h1 className={styles.title}>COMANDO CENTRAL · ASTRO SDQ</h1>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className={styles.button} style={{ width: "auto", padding: "8px 16px" }} onClick={fetchData}>
              {loading ? "CARGANDO..." : "RECARGAR"}
            </button>
            <button className={styles.button} style={{ width: "auto", padding: "8px 16px", opacity: 0.7 }} onClick={handleLogout}>
              SALIR
            </button>
          </div>
        </header>

        <nav className={styles.tabs} aria-label="Secciones admin">
          {(
            [
              ["leads", "Leads"],
              ["whatsapp", "WhatsApp · evoapi"],
              ["mail", "Correo · Renace"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`${styles.tab} ${tab === id ? styles.tabActive : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "leads" && (
          <>
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
          </>
        )}

        {tab === "whatsapp" && (
          <section className={styles.panelCard}>
            <h2 className={styles.panelTitle}>WhatsApp · Evolution (evoapi.renace.tech)</h2>
            <p className={styles.panelLead}>
              Vincula la instancia compartida con ZAV / Renace. Los leads del formulario notifican por WhatsApp.
            </p>
            <div className={styles.statusRow}>
              <span className={`${styles.badge} ${waStatus?.connected ? styles.badgeOk : styles.badgeWarn}`}>
                {waStatus?.connected ? "CONECTADO" : "DESCONECTADO"}
              </span>
              <span className={styles.meta}>
                instancia · {String(waStatus?.instance || "—")} · estado · {String(waStatus?.connectionState || "—")}
              </span>
              {waStatus?.adminTo ? <span className={styles.meta}>admin · {String(waStatus.adminTo)}</span> : null}
            </div>
            <div className={styles.actionRow}>
              <button type="button" className={styles.button} disabled={waBusy} onClick={connectWa}>
                Conectar / QR
              </button>
              <button type="button" className={styles.button} disabled={waBusy} onClick={pollWa}>
                Revisar estado
              </button>
              <button type="button" className={styles.button} disabled={waBusy} onClick={sendWaTest}>
                Enviar prueba
              </button>
              <button type="button" className={styles.button} disabled={waBusy} onClick={disconnectWa} style={{ opacity: 0.75 }}>
                Desconectar
              </button>
            </div>
            {waMsg && <p className={styles.panelMsg}>{waMsg}</p>}
            {waQr && (
              <div className={styles.qrWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={waQr} alt="QR WhatsApp Evolution" className={styles.qrImg} />
                <p className={styles.meta}>WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
              </div>
            )}
          </section>
        )}

        {tab === "mail" && (
          <section className={styles.panelCard}>
            <h2 className={styles.panelTitle}>Correo · Renace (Hostinger SMTP)</h2>
            <p className={styles.panelLead}>
              Notificaciones de leads por email vía <strong>info@renace.tech</strong>, mismo relay que ZAV.
            </p>
            <div className={styles.statusRow}>
              <span className={`${styles.badge} ${(mailStatus?.verify as { ok?: boolean } | undefined)?.ok ? styles.badgeOk : styles.badgeWarn}`}>
                {(mailStatus?.verify as { ok?: boolean } | undefined)?.ok ? "SMTP OK" : "SMTP PENDIENTE"}
              </span>
              <span className={styles.meta}>
                {mailMeta.provider || "—"} · {mailMeta.host || "—"}:{mailMeta.port || "—"} · {mailMeta.user || "—"}
              </span>
              {mailMeta.adminEmail ? <span className={styles.meta}>avisos · {mailMeta.adminEmail}</span> : null}
            </div>
            <div className={styles.actionRow}>
              <button type="button" className={styles.button} disabled={mailBusy} onClick={refreshMail}>
                Verificar SMTP
              </button>
              <button type="button" className={styles.button} disabled={mailBusy} onClick={sendMailTest}>
                Enviar prueba
              </button>
            </div>
            {mailMsg && <p className={styles.panelMsg}>{mailMsg}</p>}
          </section>
        )}
      </div>
    </div>
  );
}
