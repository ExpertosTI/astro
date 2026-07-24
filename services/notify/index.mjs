import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';

const PORT = Number(process.env.PORT || 8789);
const NOTIFY_SECRET = process.env.NOTIFY_SECRET || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '2BK2';
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'astrosdq@gmail.com';
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

function standLabel(stand) {
  if (stand === 'regular') return 'Premium';
  if (stand === 'doble') return 'Doble';
  return stand || '—';
}

function standPrice(stand) {
  if (stand === 'regular') return 'US$500';
  if (stand === 'doble') return 'US$800';
  return '';
}

const LOGO_URL = `${SITE_URL}/astro/logo-icon.png`;
const FONT_CLIMAX = `${SITE_URL}/astro/fonts/Climax.woff2`;
const FONT_GOTHAM_MD = `${SITE_URL}/astro/fonts/Gotham-Medium.ttf`;
const FONT_GOTHAM_BD = `${SITE_URL}/astro/fonts/Gotham-Bold.ttf`;
const EVENT_DATES = process.env.ASTRO_DATES || '30 ABR · 1–2 MAY 2027';
const EVENT_VENUE = process.env.ASTRO_VENUE || 'Salón de eventos Sambil · Santo Domingo';

// Stacks ASTRO: Climax (display) + Gotham (body), con fallbacks web
const FONT_DISPLAY = "'Climax','Orbitron','Arial Black',Impact,sans-serif";
const FONT_BODY = "'Gotham','Montserrat','Helvetica Neue',Helvetica,Arial,sans-serif";

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function emailFontFaces() {
  return `
  <style type="text/css">
    @font-face {
      font-family: 'Climax';
      src: url('${FONT_CLIMAX}') format('woff2');
      font-weight: 400 900;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Gotham';
      src: url('${FONT_GOTHAM_MD}') format('truetype');
      font-weight: 500;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Gotham';
      src: url('${FONT_GOTHAM_BD}') format('truetype');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700&family=Orbitron:wght@600;800&display=swap" rel="stylesheet"/>
`;
}

/** Ticket HTML — tipografía Climax/Gotham como la web ASTRO */
function buildTicketEmail({
  variant = 'client',
  eyebrow,
  title,
  greeting,
  body,
  rows = [],
  highlights = [],
  ctaLabel,
  ctaHref,
  footerNote,
}) {
  const isAdmin = variant === 'admin';
  const accent = isAdmin ? '#ff6a1a' : '#ff822d';

  const highlightBlock = highlights.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
        <tr>
          ${highlights
            .map(
              ([label, value], i) => `
            <td width="${Math.floor(100 / highlights.length)}%" valign="top" style="padding:${i ? '0 0 0 8px' : '0'};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,120,34,0.12);border:1px solid rgba(255,174,84,0.28);border-radius:12px;">
                <tr>
                  <td style="padding:12px 10px;text-align:center;">
                    <p style="margin:0 0 6px;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#ffb562;font-family:${FONT_BODY};">${esc(label)}</p>
                    <p style="margin:0;font-size:13px;line-height:1.25;font-weight:700;color:#fff6df;font-family:${FONT_DISPLAY};letter-spacing:0.04em;">${esc(value)}</p>
                  </td>
                </tr>
              </table>
            </td>`,
            )
            .join('')}
        </tr>
      </table>`
    : '';

  const detailRows = rows
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(
      ([label, value], i) => `
      <tr>
        <td style="padding:12px 0;${i ? 'border-top:1px solid rgba(255,174,84,0.14);' : ''}">
          <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a07a;font-family:${FONT_BODY};">${esc(label)}</p>
          <p style="margin:0;font-size:15px;font-weight:700;color:#fff6df;font-family:${FONT_BODY};">${esc(value)}</p>
        </td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${esc(title)}</title>
  ${emailFontFaces()}
</head>
<body style="margin:0;padding:0;background:#0a0502;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0502;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border-collapse:separate;">
          <tr>
            <td style="background:linear-gradient(165deg,#1a0c06 0%,#0c0603 55%,#140a05 100%);border:1px solid rgba(255,140,45,0.38);border-radius:22px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.55);">

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 28px 18px;background:radial-gradient(ellipse at top,rgba(255,120,34,0.24),transparent 65%);text-align:center;">
                    <img src="${LOGO_URL}" width="68" height="68" alt="ASTRO SDQ" style="display:block;margin:0 auto 14px;border:0;border-radius:50%;"/>
                    ${
                      isAdmin
                        ? `<p style="display:inline-block;margin:0 0 12px;padding:5px 12px;border-radius:999px;background:rgba(255,106,26,0.2);border:1px solid rgba(255,140,45,0.55);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#ffb562;font-family:${FONT_BODY};font-weight:700;">● Nuevo registro</p>`
                        : ''
                    }
                    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#ffb562;font-family:${FONT_BODY};font-weight:500;">${esc(eyebrow)}</p>
                    <h1 style="margin:0;font-size:28px;line-height:1.1;letter-spacing:0.1em;text-transform:uppercase;color:#ffd89a;font-family:${FONT_DISPLAY};font-weight:800;">${esc(title)}</h1>
                    <p style="margin:12px 0 0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,220,180,0.72);font-family:${FONT_BODY};">${esc(EDITION)}</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:1px;background:repeating-linear-gradient(90deg,rgba(255,174,84,0.4) 0 8px,transparent 8px 16px);"></td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:24px 28px 8px;">
                    ${greeting ? `<p style="margin:0 0 10px;font-size:16px;color:#fff6df;font-family:${FONT_BODY};">${greeting}</p>` : ''}
                    ${body ? `<p style="margin:0 0 18px;font-size:14px;line-height:1.55;color:rgba(255,230,200,0.78);font-family:${FONT_BODY};">${body}</p>` : ''}

                    ${highlightBlock}

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;background:rgba(255,120,34,0.1);border:1px solid rgba(255,174,84,0.22);border-radius:14px;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#ffb562;font-family:${FONT_BODY};">Evento</p>
                          <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:#fff;font-family:${FONT_DISPLAY};letter-spacing:0.06em;">${esc(EVENT_DATES)}</p>
                          <p style="margin:0;font-size:12px;color:rgba(255,220,180,0.72);font-family:${FONT_BODY};">${esc(EVENT_VENUE)}</p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${detailRows}
                    </table>
                  </td>
                </tr>
              </table>

              ${
                ctaHref
                  ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 28px 28px;">
                    <a href="${esc(ctaHref)}" style="display:inline-block;padding:15px 30px;border-radius:12px;background:linear-gradient(135deg,${accent},#ff5c1c);color:#ffffff;text-decoration:none;font-family:${FONT_DISPLAY};font-size:13px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;box-shadow:0 10px 28px rgba(255,90,20,0.38);">${esc(ctaLabel || 'Abrir ASTRO')}</a>
                  </td>
                </tr>
              </table>`
                  : ''
              }

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 28px 24px;text-align:center;">
                    <p style="margin:0;font-size:11px;line-height:1.5;color:rgba(255,210,170,0.45);font-family:${FONT_BODY};">${esc(footerNote || '— Equipo ASTRO SDQ')}</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
          <tr>
            <td style="padding:16px 8px 0;text-align:center;">
              <p style="margin:0;font-size:11px;letter-spacing:0.08em;color:rgba(255,200,150,0.35);font-family:${FONT_BODY};">ASTRO SDQ · Santo Domingo · ${esc(SITE_URL.replace(/^https?:\/\//, ''))}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildClientEmailText({ contact, metadata }) {
  const name = metadata?.fullName || metadata?.firstName || contact || 'artista';
  return [
    `Hola ${name},`,
    '',
    'Recibimos tu registro para ASTRO SDQ.',
    EDITION,
    EVENT_DATES,
    EVENT_VENUE,
    '',
    metadata?.stand ? `Stand: ${standLabel(metadata.stand)} ${standPrice(metadata.stand)}`.trim() : '',
    metadata?.standExtra ? `Stand extra: ${standLabel(metadata.standExtra)}` : '',
    '',
    'Pronto te contactaremos con los siguientes pasos.',
    '',
    SITE_URL,
    '',
    '— Equipo ASTRO SDQ',
  ].filter((line) => line !== undefined && line !== '').join('\n');
}

function buildClientEmailHtml({ contact, metadata }) {
  const name = metadata?.fullName || metadata?.firstName || contact || 'artista';
  const stand = metadata?.stand
    ? `${standLabel(metadata.stand)}${standPrice(metadata.stand) ? ` · ${standPrice(metadata.stand)}` : ''}`
    : '';
  const rows = [
    ['Artista', name],
    ['Stand', stand],
    ['Stand extra', metadata?.standExtra ? standLabel(metadata.standExtra) : ''],
    ['WhatsApp', metadata?.phone || ''],
    ['Email', metadata?.email || ''],
  ];

  return buildTicketEmail({
    variant: 'client',
    eyebrow: 'Confirmación de registro',
    title: 'Tu ticket ASTRO',
    greeting: `Hola <strong style="color:#ffd89a;font-family:${FONT_DISPLAY}">${esc(name)}</strong>,`,
    body: 'Confirmamos que recibimos tu registro. Guarda este correo como comprobante — pronto te contactaremos con los siguientes pasos.',
    rows,
    ctaLabel: 'Ver ASTRO SDQ',
    ctaHref: SITE_URL,
    footerNote: 'Este es tu comprobante digital de registro · Equipo ASTRO SDQ',
  });
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
  if (metadata?.stand) lines.push(`Stand: ${standLabel(metadata.stand)} ${standPrice(metadata.stand)}`.trim());
  if (metadata?.standExtra) lines.push(`Stand extra: ${standLabel(metadata.standExtra)}`);
  if (metadata?.source) lines.push(`Origen: ${metadata.source}`);
  if (metadata?.viewport) lines.push(`Viewport: ${metadata.viewport}`);
  lines.push('', `Admin: ${SITE_URL}/admin/`);
  return lines.join('\n');
}

function buildAdminEmailHtml({ contact, phone, channel, metadata }) {
  const name = metadata?.fullName || contact || '—';
  const stand = metadata?.stand
    ? `${standLabel(metadata.stand)}${standPrice(metadata.stand) ? ` · ${standPrice(metadata.stand)}` : ''}`
    : '—';

  const highlights = [
    ['Artista', name],
    ['Stand', stand],
    ['WhatsApp', phone || '—'],
  ];

  const rows = [
    ['Canal', channelLabel(channel)],
    ['Contacto', contact || '—'],
    ['Email', metadata?.email || ''],
    ['Instagram', metadata?.instagram || ''],
    ['Nacionalidad', metadata?.nationality || ''],
    ['Stand extra', metadata?.standExtra ? standLabel(metadata.standExtra) : ''],
    ['Origen', metadata?.source || ''],
  ];

  return buildTicketEmail({
    variant: 'admin',
    eyebrow: 'Comando central ASTRO',
    title: 'Lead entrante',
    greeting: '',
    body: 'Nuevo artista registrado. Datos listos para seguimiento en el panel admin.',
    highlights,
    rows,
    ctaLabel: 'Abrir panel admin',
    ctaHref: `${SITE_URL}/admin/`,
    footerNote: 'Alerta interna ASTRO · no responder a este correo',
  });
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
        subject: 'Tu ticket ASTRO SDQ · Registro confirmado',
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
