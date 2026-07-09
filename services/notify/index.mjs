import http from 'node:http';

const PORT = Number(process.env.PORT || 8789);
const NOTIFY_SECRET = process.env.NOTIFY_SECRET || '';
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || '';
const PROJECT_ID = process.env.ASTRO_PROJECT_ID || 'ASTRO_SDQ_2026';
const EDITION = process.env.ASTRO_EDITION || '5TA EDICIÓN';
const SITE_URL = (process.env.SITE_URL || 'https://astro.renace.tech').replace(/\/$/, '');

const EVOLUTION = {
  baseUrl: (process.env.EVOLUTION_API_URL || '').replace(/\/$/, ''),
  apiKey: process.env.EVOLUTION_API_KEY || '',
  instance: process.env.EVOLUTION_INSTANCE || '',
};

const CHANNEL_LABELS = {
  ig: 'Instagram',
  whatsapp: 'WhatsApp',
  mail: 'Email',
  fb: 'Facebook',
};

const rateMap = new Map();
const MAX_PER_MIN = 12;

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
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

function rateLimit(ip) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const hits = (rateMap.get(ip) || []).filter((t) => t > windowStart);
  if (hits.length >= MAX_PER_MIN) return false;
  hits.push(now);
  rateMap.set(ip, hits);
  return true;
}

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  if (digits.startsWith('00') && digits.length > 10) return digits.slice(2);
  return digits;
}

function whatsappConfigured() {
  return Boolean(
    EVOLUTION.baseUrl && EVOLUTION.apiKey && EVOLUTION.instance && ADMIN_WHATSAPP,
  );
}

async function sendWhatsAppEvolution(to, text) {
  const phone = normalizePhone(to);
  if (!phone) throw new Error('whatsapp_phone_invalid');

  const url = `${EVOLUTION.baseUrl}/message/sendText/${encodeURIComponent(EVOLUTION.instance)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: EVOLUTION.apiKey,
    },
    body: JSON.stringify({ number: phone, text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`whatsapp_evolution_${res.status}:${err.slice(0, 200)}`);
  }
}

function channelLabel(channel) {
  return CHANNEL_LABELS[channel] || channel || '—';
}

function buildClientMessage({ contact, channel }) {
  return [
    `🚀 ${PROJECT_ID}`,
    '',
    'Registro confirmado.',
    'Te avisaremos por WhatsApp cuando abramos lista o ventas.',
    '',
    `Canal: ${channelLabel(channel)}`,
    contact ? `Contacto: ${contact}` : '',
    '',
    SITE_URL,
  ].filter(Boolean).join('\n');
}

function buildAdminMessage({ contact, phone, channel, metadata }) {
  const lines = [
    `📬 Nuevo lead · ${PROJECT_ID}`,
    EDITION,
    '',
    `Canal: ${channelLabel(channel)}`,
    `Contacto: ${contact || '—'}`,
    `WhatsApp: ${phone}`,
  ];
  if (metadata?.source) lines.push(`Origen: ${metadata.source}`);
  if (metadata?.viewport) lines.push(`Viewport: ${metadata.viewport}`);
  lines.push('', `Admin: ${SITE_URL}/admin/`);
  return lines.join('\n');
}

async function handleLead(req, res) {
  const ip = clientIp(req);
  if (!rateLimit(ip)) {
    return json(res, 429, { ok: false, error: 'rate_limited' });
  }

  if (!whatsappConfigured()) {
    return json(res, 503, { ok: false, error: 'whatsapp_not_configured' });
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
    return json(res, 400, { ok: false, error: 'phone_required' });
  }
  if (!contact) {
    return json(res, 400, { ok: false, error: 'contact_required' });
  }

  const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};

  let clientOk = false;
  let adminOk = false;

  try {
    await sendWhatsAppEvolution(phone, buildClientMessage({ contact, channel }));
    clientOk = true;
  } catch (err) {
    console.warn('[astro-notify] client WA failed:', err.message);
  }

  try {
    await sendWhatsAppEvolution(ADMIN_WHATSAPP, buildAdminMessage({ contact, phone, channel, metadata }));
    adminOk = true;
  } catch (err) {
    console.warn('[astro-notify] admin WA failed:', err.message);
  }

  if (!clientOk && !adminOk) {
    return json(res, 502, { ok: false, error: 'whatsapp_send_failed', client: clientOk, admin: adminOk });
  }

  return json(res, 200, { ok: true, client: clientOk, admin: adminOk });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && (url.pathname === '/healthz' || url.pathname === '/')) {
    const admin = normalizePhone(ADMIN_WHATSAPP);
    return json(res, 200, {
      ok: true,
      service: 'astro-notify',
      whatsapp: whatsappConfigured(),
      whatsappTo: admin ? `…${admin.slice(-4)}` : null,
      project: PROJECT_ID,
    });
  }

  if (req.method === 'POST' && url.pathname === '/lead') {
    return handleLead(req, res);
  }

  return json(res, 404, { ok: false, error: 'not_found' });
});

server.listen(PORT, () => {
  console.log(`[astro-notify] listening on :${PORT} whatsapp=${whatsappConfigured()}`);
});
