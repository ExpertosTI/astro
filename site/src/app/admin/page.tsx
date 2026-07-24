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
      setWaMsg(String(data.error || "No se pudo obtener QR — revisa EVOLUTION_API_KEY (global evoapi)"));
      setWaBusy(false);
      return;
    }
    if (data.alreadyConnected) {
      setWaMsg("Instancia renace ya vinculada.");
      setWaQr(null);
      await refreshWa();
      setWaBusy(false);
      return;
    }
    setWaQr(String(data.qrcode || ""));
    setWaMsg(`Escanea el QR · instancia ${data.instanceName || "renace"}`);
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
    setMailMsg(verify?.ok ? "SMTP Renace listo" : String(verify?.error || "SMTP pendiente — sync con ./scripts/push-evo.sh"));
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
          <p className={styles.eyebrow}>Mission control</p>
          <h2 className={styles.title} style={{ marginBottom: "0.2rem" }}>ASTRO ADMIN</h2>
          <p className={styles.loginHint}>
            Escribe <strong>SDQ</strong> en el landing o entra con la clave de comando.
          </p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              className={styles.input}
              placeholder="CLAVE"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
            />
            {loginError && (
              <p style={{ color: "#ff8f8f", fontSize: "0.8rem", margin: "0 0 0.8rem" }}>{loginError}</p>
            )}
            <button type="submit" className={`${styles.button} ${styles.buttonWide}`}>
              INGRESAR
            </button>
          </form>
        </div>
      </div>
    );
  }

  const mailMeta = (mailStatus?.status || {}) as Record<string, string | null>;
  const waConnected = Boolean(waStatus?.connected);
  const mailOk = Boolean((mailStatus?.verify as { ok?: boolean } | undefined)?.ok);

  return (
    <div className={styles.adminContainer}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <p className={styles.eyebrow}>evoapi · renace · 5ta edición</p>
            <h1 className={styles.title}>COMANDO CENTRAL</h1>
          </div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.button} onClick={fetchData}>
              {loading ? "…" : "Recargar"}
            </button>
            <button type="button" className={`${styles.button} ${styles.buttonGhost}`} onClick={handleLogout}>
              Salir
            </button>
          </div>
        </header>

        <nav className={styles.tabs} aria-label="Secciones admin">
          {(
            [
              ["leads", "Leads"],
              ["whatsapp", "WhatsApp"],
              ["mail", "Correo"],
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
                <div className={styles.kpiLabel}>Total leads</div>
                <div className={styles.kpiValue}>{stats?.total || 0}</div>
              </div>
              {stats?.byChannel && Object.entries(stats.byChannel).map(([channel, count]) => (
                <div className={styles.kpiCard} key={channel}>
                  <div className={styles.kpiLabel}>{channel}</div>
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
                    <th>WhatsApp</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, i) => (
                    <tr key={i}>
                      <td style={{ color: "rgba(255,210,170,0.55)", fontSize: "12px" }}>
                        {new Date(lead.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span className={styles.channelBadge}>{lead.channel}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{lead.contact_value}</td>
                      <td style={{ color: "rgba(255,210,170,0.7)" }}>
                        {String(lead.metadata?.phone ?? lead.contact_value_2 ?? "—")}
                      </td>
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "40px", color: "rgba(255,210,170,0.45)" }}>
                        Aún no hay registros.
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
            <h2 className={styles.panelTitle}>WhatsApp · Evolution</h2>
            <p className={styles.panelLead}>
              Misma identidad Renace que ZAV · instancia <strong>renace</strong> en evoapi.renace.tech.
              Los leads confirman al WhatsApp del contacto.
            </p>
            <div className={styles.statusRow}>
              <span className={`${styles.badge} ${waConnected ? styles.badgeOk : styles.badgeWarn}`}>
                {waConnected ? "CONECTADO" : "DESCONECTADO"}
              </span>
              <span className={styles.meta}>
                {String(waStatus?.instance || "renace")} · {String(waStatus?.connectionState || "—")}
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
              <button type="button" className={`${styles.button} ${styles.buttonGhost}`} disabled={waBusy} onClick={disconnectWa}>
                Desconectar
              </button>
            </div>
            {waMsg && (
              <p className={`${styles.panelMsg} ${/unauth|fail|error|no se/i.test(waMsg) ? styles.panelMsgErr : ""}`}>
                {waMsg}
              </p>
            )}
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
            <h2 className={styles.panelTitle}>Correo · Renace</h2>
            <p className={styles.panelLead}>
              Relay Hostinger vía <strong>info@renace.tech</strong> — mismas credenciales SMTP que ZAV.
              Se configuran solas con <code>./scripts/push-evo.sh</code>.
            </p>
            <div className={styles.statusRow}>
              <span className={`${styles.badge} ${mailOk ? styles.badgeOk : styles.badgeWarn}`}>
                {mailOk ? "SMTP OK" : "SMTP PENDIENTE"}
              </span>
              <span className={styles.meta}>
                {mailMeta.provider || "hostinger"} · {mailMeta.host || "smtp.hostinger.com"}:{mailMeta.port || "465"}
              </span>
              {mailMeta.user ? <span className={styles.meta}>{mailMeta.user}</span> : null}
            </div>
            <div className={styles.actionRow}>
              <button type="button" className={styles.button} disabled={mailBusy} onClick={refreshMail}>
                Verificar SMTP
              </button>
              <button type="button" className={styles.button} disabled={mailBusy} onClick={sendMailTest}>
                Enviar prueba
              </button>
            </div>
            {mailMsg && (
              <p className={`${styles.panelMsg} ${/not_configured|fail|error|pendiente/i.test(mailMsg) ? styles.panelMsgErr : ""}`}>
                {mailMsg}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
