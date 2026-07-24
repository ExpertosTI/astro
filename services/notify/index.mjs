import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';

const PORT = Number(process.env.PORT || 8789);
const NOTIFY_SECRET = process.env.NOTIFY_SECRET || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '2BK2';
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'astrsdq@gmail.com';
const PROJECT_ID = process.env.ASTRO_PROJECT_ID || 'ASTRO_SDQ_2027';
const EDITION = process.env.ASTRO_EDITION || '5TA EDICIÓN · 2027';
const SITE_URL = (process.env.SITE_URL || 'https://astro.renace.tech').replace(/\/$/, '');
const LEADS_API_URL = (process.env.LEADS_API_URL || 'http://insforge_postgrest:3000/leads').replace(/\/$/, '');
const WEEKLY_REPORT_DAY = Number(process.env.WEEKLY_REPORT_DAY || 1); // 1=Mon … 0=Sun (JS getDay)
const WEEKLY_REPORT_HOUR = Number(process.env.WEEKLY_REPORT_HOUR || 9); // local server hour

const EVOLUTION = {
  baseUrl: (process.env.EVOLUTION_API_URL || 'https://evoapi.renace.tech').replace(/\/$/, ''),
  apiKey: process.env.EVOLUTION_API_KEY || '',
  instance: process.env.EVOLUTION_INSTANCE || 'renace',
};

const SMTP = {
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: Number(process.env.SMTP_PORT || 465) || 465,
  user: process.env.SMTP_USER || 'info@renace.tech',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || 'info@renace.tech',
  fromName: process.env.SMTP_FROM_NAME || 'ASTRO SDQ',
  replyTo: process.env.SMTP_REPLY_TO || 'info@renace.tech',
  profile: (process.env.SMTP_PROFILE || 'hostinger').toLowerCase(),
};

const CHANNEL_LABELS = {
  ig: 'Instagram',
  whatsapp: 'WhatsApp',
  mail: 'Email',
  fb: 'Facebook',
};

const rateMap = new Map();
const MAX_PER_MIN = 12;
const adminTokens = new Map(); // token -> expiresAt
const TOKEN_TTL_MS = 30 * 60 * 1000;
const TEXT_DELAY_MS = 3500;

let transporter = null;
let waState = {
  instanceName: EVOLUTION.instance,
  connected: false,
  phone: '',
  updatedAt: new Date().toISOString(),
};

function envTrim(v, fallback = '') {
  return String(v ?? fallback).trim().replace(/^["']|["']$/g, '');
}

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

function checkNotifySecret(body) {
  if (!NOTIFY_SECRET) return true;
  return body?.secret === NOTIFY_SECRET;
}

function clientIp(req) {
  return req.headers['x-real-ip']
    || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || 'unknown';
}

function rateLimit(ip, max = MAX_PER_MIN) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const hits = (rateMap.get(ip) || []).filter((t) => t > windowStart);
  if (hits.length >= max) return false;
  hits.push(now);
  rateMap.set(ip, hits);
  return true;
}

function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  // Strip leading 00 international prefix
  if (digits.startsWith('00') && digits.length > 10) digits = digits.slice(2);
  // DR / US local 10-digit (809/829/849/…) → E.164 without +
  if (digits.length === 10) return `1${digits}`;
  // Already +1XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  // WhatsApp sometimes gets numbers pasted with country already (12–15)
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return digits;
}

function maskPhone(phone) {
  const d = normalizePhone(phone);
  if (!d || d.length < 4) return null;
  return `…${d.slice(-4)}`;
}

function maskEmail(addr) {
  return String(addr || '').replace(/(.{2}).+(@.+)/, '$1***$2');
}

/** API key + URL + instance — enough to message the contact's WhatsApp. */
function whatsappApiConfigured() {
  return Boolean(EVOLUTION.baseUrl && EVOLUTION.apiKey && EVOLUTION.instance);
}

function adminWhatsAppConfigured() {
  return Boolean(normalizePhone(ADMIN_WHATSAPP));
}

function resolvedSmtp() {
  let { host, port, user, pass, from, fromName, replyTo, profile } = SMTP;
  const renaceMailbox = /@renace\.tech$/i.test(user);
  if (profile === 'hostinger' || renaceMailbox) {
    host = 'smtp.hostinger.com';
    port = 465;
  }
  return {
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    user,
    pass,
    from,
    fromName,
    replyTo,
    provider: port === 465 ? 'hostinger' : 'smtp',
  };
}

function mailConfigured() {
  const s = resolvedSmtp();
  return Boolean(s.pass && s.user);
}

function getTransporter() {
  if (!mailConfigured()) return null;
  if (!transporter) {
    const s = resolvedSmtp();
    transporter = nodemailer.createTransport({
      host: s.host,
      port: s.port,
      secure: s.secure,
      requireTLS: s.requireTLS,
      auth: { user: s.user, pass: s.pass },
    });
  }
  return transporter;
}

function issueAdminToken() {
  const token = crypto.randomBytes(24).toString('hex');
  adminTokens.set(token, Date.now() + TOKEN_TTL_MS);
  return token;
}

function authorized(req) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!bearer) return false;
  const expires = adminTokens.get(bearer);
  if (!expires) return false;
  if (Date.now() > expires) {
    adminTokens.delete(bearer);
    return false;
  }
  return true;
}

async function evoFetch(route, options = {}) {
  if (!whatsappApiConfigured()) {
    return { success: false, error: 'Evolution API not configured' };
  }
  try {
    const res = await fetch(`${EVOLUTION.baseUrl}${route}`, {
      ...options,
      signal: AbortSignal.timeout(25_000),
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION.apiKey,
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = data?.message ?? data?.error ?? `HTTP ${res.status}`;
      return {
        success: false,
        error: Array.isArray(msg) ? msg.join(', ') : String(msg).slice(0, 240),
        data,
        status: res.status,
      };
    }
    return { success: true, data, status: res.status };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'network_error' };
  }
}

function extractQr(data) {
  const candidates = [
    data?.qrcode?.base64,
    data?.base64,
    data?.qr?.base64,
    typeof data?.qrcode === 'string' ? data.qrcode : null,
  ];
  for (const raw of candidates) {
    if (typeof raw !== 'string') continue;
    const cleaned = raw.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    if (cleaned.length < 80) continue;
    return raw.startsWith('data:') ? raw : `data:image/png;base64,${cleaned}`;
  }
  return null;
}

function extractState(data) {
  return data?.instance?.state || data?.state || data?.connectionState || data?.status || 'unknown';
}

function extractOwnerPhone(data) {
  const owner =
    data?.instance?.owner ||
    data?.owner ||
    data?.instance?.ownerJid ||
    data?.ownerJid ||
    '';
  return String(owner).replace(/@.*$/, '').replace(/\D/g, '') || '';
}

function activeInstance() {
  return envTrim(EVOLUTION.instance, waState.instanceName) || 'renace';
}

async function refreshConnection() {
  const name = activeInstance();
  const result = await evoFetch(`/instance/connectionState/${encodeURIComponent(name)}`);
  if (!result.success) {
    const missing = result.status === 404 || /not found/i.test(String(result.error || ''));
    return {
      ok: false,
      instanceName: name,
      state: missing ? 'missing' : 'error',
      phone: waState.phone,
      error: result.error,
    };
  }
  const state = extractState(result.data);
  const phone = extractOwnerPhone(result.data);
  waState = {
    instanceName: name,
    connected: state === 'open',
    phone: phone || waState.phone,
    updatedAt: new Date().toISOString(),
  };
  return { ok: true, instanceName: name, state, phone: waState.phone };
}

async function getEvolutionQr() {
  const name = activeInstance();
  const live = await evoFetch(`/instance/connectionState/${encodeURIComponent(name)}`);
  if (live.success && extractState(live.data) === 'open') {
    const phone = extractOwnerPhone(live.data);
    waState = { instanceName: name, connected: true, phone, updatedAt: new Date().toISOString() };
    return { ok: true, instanceName: name, qrcode: null, alreadyConnected: true };
  }

  const conn = await evoFetch(`/instance/connect/${encodeURIComponent(name)}`);
  if (conn.success) {
    const qr = extractQr(conn.data);
    if (qr) return { ok: true, instanceName: name, qrcode: qr };
  }

  if (conn.status === 404 || /not found/i.test(String(conn.error || ''))) {
    const created = await evoFetch('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName: name,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });
    if (created.success) {
      const qr = extractQr(created.data);
      if (qr) return { ok: true, instanceName: name, qrcode: qr };
      const again = await evoFetch(`/instance/connect/${encodeURIComponent(name)}`);
      const qr2 = again.success ? extractQr(again.data) : null;
      if (qr2) return { ok: true, instanceName: name, qrcode: qr2 };
    }
    return { ok: false, instanceName: name, qrcode: null, error: created.error || conn.error };
  }

  return { ok: false, instanceName: name, qrcode: null, error: conn.error || 'No QR available' };
}

async function logoutEvolution() {
  const name = activeInstance();
  const result = await evoFetch(`/instance/logout/${encodeURIComponent(name)}`, { method: 'DELETE' });
  waState = { ...waState, connected: false, phone: '', updatedAt: new Date().toISOString() };
  return { ok: result.success, error: result.error, instanceName: name };
}

async function sendWhatsAppEvolution(to, text) {
  const phone = normalizePhone(to);
  if (!phone || phone.length < 11) throw new Error('whatsapp_phone_invalid');
  if (!whatsappApiConfigured()) throw new Error('whatsapp_not_configured');

  const instance = activeInstance();
  const url = `${EVOLUTION.baseUrl}/message/sendText/${encodeURIComponent(instance)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: EVOLUTION.apiKey,
    },
    body: JSON.stringify({
      number: phone,
      text,
      delay: TEXT_DELAY_MS,
    }),
  });

  const bodyText = await res.text().catch(() => '');
  if (!res.ok) {
    console.warn('[astro-notify] Evolution send failed', {
      status: res.status,
      to: maskPhone(phone),
      instance,
      body: bodyText.slice(0, 240),
    });
    throw new Error(`whatsapp_evolution_${res.status}:${bodyText.slice(0, 200)}`);
  }

  console.log('[astro-notify] WA sent', { to: maskPhone(phone), instance });
}

async function sendMail({ to, subject, text, html }) {
  const transport = getTransporter();
  if (!transport) throw new Error('mail_not_configured');
  const s = resolvedSmtp();
  await transport.sendMail({
    from: `"${s.fromName}" <${s.from}>`,
    replyTo: s.replyTo,
    to,
    subject,
    text,
    html: html || undefined,
  });
}

function channelLabel(channel) {
  return CHANNEL_LABELS[channel] || channel || '—';
}

function buildClientMessage({ contact, channel }) {
  return [
    `🚀 ${PROJECT_ID}`,
    '',
    'Registro confirmado.',
    'Te avisaremos cuando abramos lista o ventas.',
    '',
    `Canal: ${channelLabel(channel)}`,
    contact ? `Contacto: ${contact}` : '',
    '',
    SITE_URL,
  ].filter(Boolean).join('\n');
}

function resolveClientEmail(contact, channel, metadata) {
  const fromMeta = String(metadata?.email || '').trim();
  if (fromMeta.includes('@')) return fromMeta;
  const fromContact = String(contact || '').trim();
  if (channel === 'mail' && fromContact.includes('@')) return fromContact;
  return '';
}

function buildClientEmailText({ contact, metadata }) {
  const name = metadata?.fullName || metadata?.firstName || contact || 'artista';
  return [
    `Hola ${name},`,
    '',
    'Recibimos tu registro para ASTRO SDQ.',
    EDITION,
    '',
    metadata?.stand ? `Stand: ${standLabel(metadata.stand)}` : '',
    metadata?.standExtra ? `Stand extra: ${standLabel(metadata.standExtra)}` : '',
    '',
    'Pronto te contactaremos con los siguientes pasos.',
    '',
    SITE_URL,
    '',
    '— Equipo ASTRO SDQ',
  ].filter((line) => line !== undefined).join('\n');
}

function buildClientEmailHtml({ contact, metadata }) {
  const name = metadata?.fullName || metadata?.firstName || contact || 'artista';
  return `
    <div style="font-family:sans-serif;max-width:560px;color:#111;line-height:1.55">
      <h2 style="margin:0 0 8px;color:#c2410c">Registro recibido · ASTRO SDQ</h2>
      <p style="margin:0 0 12px;color:#444">${EDITION}</p>
      <p>Hola <strong>${name}</strong>,</p>
      <p>Confirmamos que recibimos tu registro. Pronto te contactaremos con los siguientes pasos.</p>
      ${metadata?.stand ? `<p><strong>Stand:</strong> ${standLabel(metadata.stand)}${metadata?.standExtra ? ` · Extra: ${standLabel(metadata.standExtra)}` : ''}</p>` : ''}
      <p style="margin-top:18px"><a href="${SITE_URL}" style="color:#c2410c">astro.renace.tech</a></p>
      <p style="color:#777;font-size:13px">— Equipo ASTRO SDQ</p>
    </div>
  `;
}

function standLabel(stand) {
  if (stand === 'regular') return 'Premium';
  if (stand === 'doble') return 'Doble';
  return stand || '—';
}

function buildAdminMessage({ contact, phone, channel, metadata }) {
  const lines = [
    `📬 Nuevo registro · ${PROJECT_ID}`,
    EDITION,
    '',
    `Canal: ${channelLabel(channel)}`,
    `Contacto: ${contact || '—'}`,
    `WhatsApp: ${phone}`,
  ];
  if (metadata?.fullName) lines.push(`Nombre: ${metadata.fullName}`);
  if (metadata?.email) lines.push(`Email: ${metadata.email}`);
  if (metadata?.instagram) lines.push(`Instagram: ${metadata.instagram}`);
  if (metadata?.nationality) lines.push(`Nacionalidad: ${metadata.nationality}`);
  if (metadata?.stand) lines.push(`Stand: ${standLabel(metadata.stand)}`);
  if (metadata?.standExtra) lines.push(`Stand extra: ${standLabel(metadata.standExtra)}`);
  if (metadata?.source) lines.push(`Origen: ${metadata.source}`);
  if (metadata?.viewport) lines.push(`Viewport: ${metadata.viewport}`);
  lines.push('', `Admin: ${SITE_URL}/admin/`);
  return lines.join('\n');
}

function buildAdminEmailHtml({ contact, phone, channel, metadata }) {
  const rows = [
    ['Canal', channelLabel(channel)],
    ['Contacto', contact || '—'],
    ['WhatsApp', phone],
  ];
  if (metadata?.fullName) rows.push(['Nombre', metadata.fullName]);
  if (metadata?.email) rows.push(['Email', metadata.email]);
  if (metadata?.instagram) rows.push(['Instagram', metadata.instagram]);
  if (metadata?.nationality) rows.push(['Nacionalidad', metadata.nationality]);
  if (metadata?.stand) rows.push(['Stand', standLabel(metadata.stand)]);
  if (metadata?.standExtra) rows.push(['Stand extra', standLabel(metadata.standExtra)]);
  if (metadata?.source) rows.push(['Origen', metadata.source]);

  const lis = rows
    .map(([k, v]) => `<li><strong>${k}:</strong> ${String(v)}</li>`)
    .join('');

  return `
    <div style="font-family:sans-serif;max-width:560px;color:#111;line-height:1.5">
      <h2 style="margin:0 0 8px;color:#c2410c">Nuevo registro · ASTRO SDQ</h2>
      <p style="margin:0 0 14px;color:#444">${EDITION}</p>
      <ul style="padding-left:18px;margin:0 0 16px">${lis}</ul>
      <p style="margin:0"><a href="${SITE_URL}/admin/" style="color:#c2410c">Abrir admin ASTRO</a></p>
    </div>
  `;
}

async function handleLead(req, res) {
  const ip = clientIp(req);
  if (!rateLimit(ip)) {
    return json(res, 429, { ok: false, error: 'rate_limited' });
  }

  const canClientWa = whatsappApiConfigured();
  const canAdminWa = canClientWa && adminWhatsAppConfigured();
  const canSmtp = mailConfigured();
  const canAdminMail = canSmtp && Boolean(ADMIN_EMAIL);
  if (!canClientWa && !canSmtp) {
    return json(res, 503, { ok: false, error: 'notify_not_configured' });
  }

  const body = await readBody(req);
  if (!body || typeof body !== 'object') {
    return json(res, 400, { ok: false, error: 'invalid_json' });
  }
  if (!checkNotifySecret(body)) {
    return json(res, 401, { ok: false, error: 'unauthorized' });
  }

  const contact = String(body.contact || body.value || '').trim();
  const phone = normalizePhone(body.phone || body.value2 || '');
  const channel = String(body.channel || 'ig').trim();

  if (!phone || phone.length < 11) {
    return json(res, 400, { ok: false, error: 'phone_required', hint: 'Usa WhatsApp con código de país (ej. 1809XXXXXXX)' });
  }
  if (!contact) {
    return json(res, 400, { ok: false, error: 'contact_required' });
  }

  const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};
  const clientEmail = resolveClientEmail(contact, channel, metadata);

  let clientOk = false;
  let adminOk = false;
  let mailOk = false;
  let clientMailOk = false;
  let clientError = null;
  let adminError = null;
  let clientMailError = null;

  // 1) Prioridad: aviso al WhatsApp que el contacto escribió en el form
  if (canClientWa) {
    try {
      await sendWhatsAppEvolution(phone, buildClientMessage({ contact, channel }));
      clientOk = true;
    } catch (err) {
      clientError = err.message;
      console.warn('[astro-notify] client WA failed:', clientError);
    }
  }

  // 1b) Correo de confirmación al registrado
  if (canSmtp && clientEmail) {
    try {
      await sendMail({
        to: clientEmail,
        subject: 'Registro recibido · ASTRO SDQ',
        text: buildClientEmailText({ contact, metadata }),
        html: buildClientEmailHtml({ contact, metadata }),
      });
      clientMailOk = true;
    } catch (err) {
      clientMailError = err.message;
      console.warn('[astro-notify] client mail failed:', clientMailError);
    }
  }

  // 2) Alerta al admin (opcional) — con pausa anti-ban
  if (canAdminWa) {
    await new Promise((r) => setTimeout(r, 4500));
    try {
      await sendWhatsAppEvolution(
        ADMIN_WHATSAPP,
        buildAdminMessage({ contact, phone, channel, metadata }),
      );
      adminOk = true;
    } catch (err) {
      adminError = err.message;
      console.warn('[astro-notify] admin WA failed:', adminError);
    }
  }

  if (canAdminMail) {
    try {
      await sendMail({
        to: ADMIN_EMAIL,
        subject: `Nuevo registro ASTRO · ${metadata?.fullName || contact || channelLabel(channel)}`,
        text: buildAdminMessage({ contact, phone, channel, metadata }),
        html: buildAdminEmailHtml({ contact, phone, channel, metadata }),
      });
      mailOk = true;
    } catch (err) {
      console.warn('[astro-notify] admin mail failed:', err.message);
    }
  }

  // El lead del contacto es lo crítico: si falló WA/correo del cliente y no hubo ningún canal, 502
  if (!clientOk && !clientMailOk && !adminOk && !mailOk) {
    return json(res, 502, {
      ok: false,
      error: 'notify_send_failed',
      client: clientOk,
      clientMail: clientMailOk,
      admin: adminOk,
      mail: mailOk,
      clientError,
      clientMailError,
      adminError,
      to: maskPhone(phone),
    });
  }

  // Si el contacto no recibió WA pero sí llegó alerta admin/mail, reportamos ok parcial
  rememberLead({
    contact,
    phone,
    channel,
    metadata,
    created_at: new Date().toISOString(),
  });

  return json(res, 200, {
    ok: true,
    client: clientOk,
    clientMail: clientMailOk,
    admin: adminOk,
    mail: mailOk,
    to: maskPhone(phone),
    clientError: clientOk ? undefined : clientError,
    clientMailError: clientMailOk ? undefined : clientMailError,
    adminError: adminOk ? undefined : adminError,
  });
}

async function handleAdminLogin(req, res) {
  const ip = clientIp(req);
  if (!rateLimit(`admin-login:${ip}`, 8)) {
    return json(res, 429, { ok: false, error: 'rate_limited' });
  }
  const body = await readBody(req);
  const password = String(body?.password || '');
  if (!password || password !== ADMIN_PASSWORD) {
    return json(res, 401, { ok: false, error: 'invalid_password' });
  }
  const token = issueAdminToken();
  return json(res, 200, { ok: true, token, expiresIn: TOKEN_TTL_MS });
}

async function handleWhatsAppStatus(req, res) {
  if (!authorized(req)) return json(res, 401, { ok: false, error: 'unauthorized' });
  if (!whatsappApiConfigured()) {
    return json(res, 200, {
      configured: false,
      reason: 'EVOLUTION_API_URL / EVOLUTION_API_KEY not set',
      apiUrl: EVOLUTION.baseUrl,
      instance: '',
      connectionState: null,
      phone: null,
      adminTo: maskPhone(ADMIN_WHATSAPP),
    });
  }
  let connectionState = waState.connected ? 'open' : null;
  let phone = waState.phone || null;
  try {
    const live = await refreshConnection();
    connectionState = live.state;
    phone = live.phone || phone;
  } catch {
    /* offline ok */
  }
  return json(res, 200, {
    configured: true,
    apiUrl: EVOLUTION.baseUrl,
    instance: activeInstance(),
    connectionState,
    phone: phone ? maskPhone(phone) : null,
    adminTo: maskPhone(ADMIN_WHATSAPP),
    connected: connectionState === 'open',
  });
}

async function handleWhatsAppQr(req, res) {
  if (!authorized(req)) return json(res, 401, { ok: false, error: 'unauthorized' });
  if (!whatsappApiConfigured()) return json(res, 503, { ok: false, error: 'not_configured' });
  const result = await getEvolutionQr();
  if (result.alreadyConnected) {
    return json(res, 200, {
      ok: true,
      alreadyConnected: true,
      instanceName: result.instanceName,
      qrcode: null,
    });
  }
  if (!result.qrcode) {
    return json(res, 400, {
      ok: false,
      instanceName: result.instanceName,
      error: result.error || 'No QR available',
    });
  }
  return json(res, 200, {
    ok: true,
    instanceName: result.instanceName,
    qrcode: result.qrcode,
  });
}

async function handleWhatsAppConnection(req, res) {
  if (!authorized(req)) return json(res, 401, { ok: false, error: 'unauthorized' });
  if (!whatsappApiConfigured()) return json(res, 503, { ok: false, error: 'not_configured' });
  const result = await refreshConnection();
  return json(res, 200, {
    ok: result.ok,
    instanceName: result.instanceName,
    state: result.state,
    phone: result.phone ? maskPhone(result.phone) : null,
    error: result.error,
  });
}

async function handleWhatsAppLogout(req, res) {
  if (!authorized(req)) return json(res, 401, { ok: false, error: 'unauthorized' });
  const result = await logoutEvolution();
  return json(res, result.ok ? 200 : 502, result);
}

async function handleWhatsAppTest(req, res) {
  if (!authorized(req)) return json(res, 401, { ok: false, error: 'unauthorized' });
  if (!whatsappApiConfigured()) return json(res, 503, { ok: false, error: 'not_configured' });
  const body = await readBody(req);
  const to = normalizePhone(body?.to || ADMIN_WHATSAPP);
  if (!to) return json(res, 400, { ok: false, error: 'phone_required' });
  try {
    await sendWhatsAppEvolution(
      to,
      `✅ ASTRO SDQ · prueba WhatsApp OK\n${PROJECT_ID}\n${SITE_URL}`,
    );
    return json(res, 200, { ok: true, to: maskPhone(to) });
  } catch (err) {
    return json(res, 502, { ok: false, error: err.message });
  }
}

async function handleMailStatus(req, res) {
  if (!authorized(req)) return json(res, 401, { ok: false, error: 'unauthorized' });
  const s = resolvedSmtp();
  const configured = mailConfigured();
  let verify = { ok: false, error: 'not_configured' };
  if (configured) {
    try {
      await getTransporter().verify();
      verify = { ok: true };
    } catch (err) {
      verify = { ok: false, error: err.message, hint: 'Revisa SMTP_PASS de info@renace.tech (Hostinger)' };
    }
  }
  return json(res, 200, {
    configured,
    verify,
    status: {
      provider: s.provider,
      host: s.host,
      port: s.port,
      user: maskEmail(s.user),
      from: maskEmail(s.from),
      fromName: s.fromName,
      adminEmail: ADMIN_EMAIL ? maskEmail(ADMIN_EMAIL) : null,
    },
  });
}

async function handleMailTest(req, res) {
  if (!authorized(req)) return json(res, 401, { ok: false, error: 'unauthorized' });
  if (!mailConfigured()) return json(res, 503, { ok: false, error: 'not_configured' });
  const body = await readBody(req);
  const to = String(body?.to || ADMIN_EMAIL || SMTP.user).trim();
  if (!to) return json(res, 400, { ok: false, error: 'email_required' });
  try {
    await sendMail({
      to,
      subject: `✅ ASTRO SDQ · prueba de correo`,
      text: `Prueba OK desde ${PROJECT_ID}\n${SITE_URL}`,
      html: `<p>Prueba OK desde <strong>${PROJECT_ID}</strong>.</p><p><a href="${SITE_URL}">${SITE_URL}</a></p>`,
    });
    return json(res, 200, { ok: true, to: maskEmail(to) });
  } catch (err) {
    return json(res, 502, { ok: false, error: err.message });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return json(res, 204, {});
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  try {
    if (req.method === 'GET' && (path === '/healthz' || path === '/')) {
      const admin = normalizePhone(ADMIN_WHATSAPP);
      return json(res, 200, {
        ok: true,
        service: 'astro-notify',
        whatsapp: whatsappApiConfigured(),
        whatsappAdmin: adminWhatsAppConfigured(),
        mail: mailConfigured(),
        whatsappTo: admin ? `…${admin.slice(-4)}` : null,
        project: PROJECT_ID,
      });
    }

    if (req.method === 'POST' && path === '/lead') {
      return handleLead(req, res);
    }

    if (req.method === 'POST' && path === '/admin/login') {
      return handleAdminLogin(req, res);
    }

    if (req.method === 'GET' && path === '/whatsapp/status') {
      return handleWhatsAppStatus(req, res);
    }
    if (req.method === 'GET' && path === '/whatsapp/qr') {
      return handleWhatsAppQr(req, res);
    }
    if (req.method === 'GET' && path === '/whatsapp/connection') {
      return handleWhatsAppConnection(req, res);
    }
    if (req.method === 'POST' && path === '/whatsapp/logout') {
      return handleWhatsAppLogout(req, res);
    }
    if (req.method === 'POST' && path === '/whatsapp/test') {
      return handleWhatsAppTest(req, res);
    }

    if (req.method === 'GET' && path === '/mail/status') {
      return handleMailStatus(req, res);
    }
    if (req.method === 'POST' && path === '/mail/test') {
      return handleMailTest(req, res);
    }

    if (req.method === 'POST' && path === '/report/weekly') {
      return handleWeeklyReport(req, res);
    }

    return json(res, 404, { ok: false, error: 'not_found' });
  } catch (err) {
    console.error('[astro-notify] unhandled', err);
    return json(res, 500, { ok: false, error: 'internal_error' });
  }
});

const recentLeads = [];
const WEEKLY_STATE_FILE = path.join('/tmp', 'astro-weekly-report.json');

function rememberLead(entry) {
  recentLeads.unshift(entry);
  if (recentLeads.length > 500) recentLeads.length = 500;
}

function readWeeklyState() {
  try {
    return JSON.parse(fs.readFileSync(WEEKLY_STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeWeeklyState(state) {
  try {
    fs.writeFileSync(WEEKLY_STATE_FILE, JSON.stringify(state));
  } catch (err) {
    console.warn('[astro-notify] weekly state write failed:', err.message);
  }
}

function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

async function fetchLeadsFromApi(sinceIso) {
  const url = new URL(LEADS_API_URL);
  url.searchParams.set('order', 'created_at.desc');
  url.searchParams.set('limit', '500');
  if (PROJECT_ID) url.searchParams.set('project_id', `eq.${PROJECT_ID}`);
  if (sinceIso) url.searchParams.set('created_at', `gte.${sinceIso}`);

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`leads_http_${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function sevenDaysAgoIso() {
  const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function buildWeeklyReport(leads, sinceIso) {
  const byStand = {};
  const byChannel = {};
  for (const lead of leads) {
    const meta = lead.metadata && typeof lead.metadata === 'object' ? lead.metadata : {};
    const stand = standLabel(meta.stand || '—');
    byStand[stand] = (byStand[stand] || 0) + 1;
    const ch = channelLabel(lead.channel || meta.channel || '—');
    byChannel[ch] = (byChannel[ch] || 0) + 1;
  }

  const standLines = Object.entries(byStand).map(([k, v]) => `  · ${k}: ${v}`).join('\n') || '  · sin datos';
  const channelLines = Object.entries(byChannel).map(([k, v]) => `  · ${k}: ${v}`).join('\n') || '  · sin datos';

  const recentRows = leads.slice(0, 40).map((lead) => {
    const meta = lead.metadata && typeof lead.metadata === 'object' ? lead.metadata : {};
    const name = meta.fullName || meta.contact || lead.contact_value || '—';
    const phone = meta.phone || lead.contact_value_2 || '—';
    const stand = standLabel(meta.stand || '');
    const when = String(lead.created_at || '').slice(0, 16).replace('T', ' ');
    return `· ${when} · ${name} · ${phone} · ${stand}`;
  });

  const text = [
    `📊 Reporte semanal ASTRO · ${PROJECT_ID}`,
    EDITION,
    '',
    `Periodo: desde ${sinceIso.slice(0, 10)}`,
    `Total registros: ${leads.length}`,
    '',
    'Por stand:',
    standLines,
    '',
    'Por canal:',
    channelLines,
    '',
    'Últimos registros:',
    ...(recentRows.length ? recentRows : ['· (sin registros esta semana)']),
    '',
    `Admin: ${SITE_URL}/admin/`,
  ].join('\n');

  const htmlRows = leads.slice(0, 40).map((lead) => {
    const meta = lead.metadata && typeof lead.metadata === 'object' ? lead.metadata : {};
    const name = meta.fullName || meta.contact || lead.contact_value || '—';
    const phone = meta.phone || lead.contact_value_2 || '—';
    const stand = standLabel(meta.stand || '');
    const when = String(lead.created_at || '').slice(0, 16).replace('T', ' ');
    return `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${when}</td><td style="padding:6px 8px;border-bottom:1px solid #eee">${name}</td><td style="padding:6px 8px;border-bottom:1px solid #eee">${phone}</td><td style="padding:6px 8px;border-bottom:1px solid #eee">${stand}</td></tr>`;
  }).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:680px;color:#111">
      <h2 style="margin:0 0 6px;color:#c2410c">Reporte semanal · ASTRO SDQ</h2>
      <p style="margin:0 0 12px;color:#555">${EDITION}</p>
      <p><strong>Total:</strong> ${leads.length} registros desde ${sinceIso.slice(0, 10)}</p>
      <h3 style="margin:18px 0 8px">Por stand</h3>
      <pre style="background:#f7f7f7;padding:10px;border-radius:8px">${standLines}</pre>
      <h3 style="margin:18px 0 8px">Por canal</h3>
      <pre style="background:#f7f7f7;padding:10px;border-radius:8px">${channelLines}</pre>
      <h3 style="margin:18px 0 8px">Detalle</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="text-align:left;background:#fff7ed"><th style="padding:6px 8px">Fecha</th><th style="padding:6px 8px">Nombre</th><th style="padding:6px 8px">WhatsApp</th><th style="padding:6px 8px">Stand</th></tr></thead>
        <tbody>${htmlRows || '<tr><td colspan="4" style="padding:8px">Sin registros</td></tr>'}</tbody>
      </table>
      <p style="margin-top:16px"><a href="${SITE_URL}/admin/">Abrir admin</a></p>
    </div>
  `;

  return { text, html, total: leads.length };
}

async function collectWeeklyLeads(sinceIso) {
  try {
    const remote = await fetchLeadsFromApi(sinceIso);
    if (remote.length) return remote;
  } catch (err) {
    console.warn('[astro-notify] weekly leads API:', err.message);
  }
  return recentLeads
    .filter((l) => !l.created_at || l.created_at >= sinceIso)
    .map((l) => ({
      contact_value: l.contact,
      channel: l.channel,
      created_at: l.created_at,
      metadata: l.metadata,
      contact_value_2: l.phone,
    }));
}

async function sendWeeklyReport({ force = false } = {}) {
  if (!mailConfigured() || !ADMIN_EMAIL) {
    return { ok: false, error: 'mail_not_configured' };
  }

  const key = weekKey();
  const state = readWeeklyState();
  if (!force && state.lastWeekKey === key) {
    return { ok: true, skipped: true, week: key };
  }

  const sinceIso = sevenDaysAgoIso();
  const leads = await collectWeeklyLeads(sinceIso);
  const report = buildWeeklyReport(leads, sinceIso);

  await sendMail({
    to: ADMIN_EMAIL,
    subject: `Reporte semanal ASTRO · ${leads.length} registros · ${key}`,
    text: report.text,
    html: report.html,
  });

  writeWeeklyState({ ...state, lastWeekKey: key, lastSentAt: new Date().toISOString(), lastCount: leads.length });
  return { ok: true, week: key, total: leads.length };
}

async function handleWeeklyReport(req, res) {
  const body = await readBody(req);
  if (!checkNotifySecret(body || {})) {
    return json(res, 401, { ok: false, error: 'unauthorized' });
  }
  try {
    const result = await sendWeeklyReport({ force: Boolean(body?.force) });
    return json(res, result.ok ? 200 : 503, result);
  } catch (err) {
    console.warn('[astro-notify] weekly report failed:', err.message);
    return json(res, 502, { ok: false, error: err.message || 'weekly_failed' });
  }
}

function scheduleWeeklyReport() {
  const tick = async () => {
    try {
      const now = new Date();
      if (now.getDay() !== WEEKLY_REPORT_DAY) return;
      if (now.getHours() !== WEEKLY_REPORT_HOUR) return;
      const result = await sendWeeklyReport({ force: false });
      if (result.ok && !result.skipped) {
        console.log(`[astro-notify] weekly report sent (${result.total} leads, ${result.week})`);
      }
    } catch (err) {
      console.warn('[astro-notify] weekly tick:', err.message);
    }
  };
  setInterval(tick, 30 * 60 * 1000);
  setTimeout(tick, 20_000);
}

server.listen(PORT, () => {
  console.log(
    `[astro-notify] :${PORT} wa=${whatsappApiConfigured()} mail=${mailConfigured()} instance=${activeInstance()} adminMail=${ADMIN_EMAIL || '—'}`,
  );
  scheduleWeeklyReport();
});
