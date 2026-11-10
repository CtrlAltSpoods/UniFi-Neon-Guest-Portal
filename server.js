'use strict';
/**
 * Guest Wi-Fi — UniFi External Captive Portal
 * Zero-dependency Node.js server (Node 18+).
 *
 * Flow:
 *   1. Guest joins the SSID; UniFi redirects them to
 *      http://<this-server>/guest/s/<site>/?ap=..&id=<client-mac>&t=..&url=..&ssid=..
 *   2. The portal page asks for the password.
 *   3. POST /api/connect checks it, then asks the UniFi controller to
 *      authorize the client MAC ("authorize-guest") for GUEST_MINUTES.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

// ---------------------------------------------------------------- config
const env = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' ? process.env[k] : d);

const CONFIG = {
  port: parseInt(env('PORT', '8080'), 10),
  portalPassword: env('PORTAL_PASSWORD', ''), // required, no default
  title: env('PORTAL_TITLE', 'Guest Wi-Fi'),
  logoTop: env('LOGO_TOP', ''),       // default: first word of PORTAL_TITLE
  logoBottom: env('LOGO_BOTTOM', ''), // default: second word of PORTAL_TITLE, else "WI-FI"
  footer: env('FOOTER_TEXT', ''),     // default: PORTAL_TITLE
  guestMinutes: parseInt(env('GUEST_MINUTES', '1440'), 10), // 24h
  successUrl: env('SUCCESS_URL', ''), // optional fixed landing page after login
  unifi: {
    url: env('UNIFI_URL', '').replace(/\/+$/, ''), // e.g. https://192.168.1.1  or https://10.0.0.2:8443
    username: env('UNIFI_USERNAME', ''),
    password: env('UNIFI_PASSWORD', ''),
    site: env('UNIFI_SITE', ''), // blank = use the site from the redirect URL (usually "default")
    type: env('UNIFI_TYPE', 'auto').toLowerCase(), // auto | unifios | classic
    verifyTls: env('UNIFI_VERIFY_TLS', 'false').toLowerCase() === 'true',
  },
  rateLimit: {
    max: parseInt(env('RATE_LIMIT_MAX', '10'), 10),
    windowMs: parseInt(env('RATE_LIMIT_WINDOW_SEC', '300'), 10) * 1000,
  },
};

if (!CONFIG.portalPassword) {
  console.error('FATAL: PORTAL_PASSWORD is not set. Pass it to the container, e.g. -e PORTAL_PASSWORD=... or in .env');
  process.exit(1);
}

{
  const words = CONFIG.title.trim().split(/\s+/);
  if (!CONFIG.logoTop) CONFIG.logoTop = words[0] || 'GUEST';
  if (!CONFIG.logoBottom) CONFIG.logoBottom = words[1] || 'WI-FI';
  if (!CONFIG.footer) CONFIG.footer = CONFIG.title;
}

const DEMO_MODE = !CONFIG.unifi.url;
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------------------------------------------------------------- page rendering
const escHtml = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderPortal() {
  const tpl = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  const pageCfg = JSON.stringify({
    title: CONFIG.title,
    top: CONFIG.logoTop.toUpperCase(),
    bottom: CONFIG.logoBottom.toUpperCase(),
  }).replace(/</g, '\\u003c');
  return Buffer.from(tpl
    .replace(/\{\{TITLE_HEADING\}\}/g, () => escHtml(CONFIG.title).replace(/-/g, '&#8209;')) // keep "Wi-Fi" together
    .replace(/\{\{TITLE\}\}/g, () => escHtml(CONFIG.title))
    .replace(/\{\{FOOTER\}\}/g, () => escHtml(CONFIG.footer))
    .replace(/\{\{LOGO_LABEL\}\}/g, () => escHtml(`${CONFIG.logoTop} ${CONFIG.logoBottom}`))
    .replace('{{CONFIG_JSON}}', () => pageCfg), 'utf8');
}
const PORTAL_PAGE = renderPortal();

const log = (...a) => console.log(new Date().toISOString(), ...a);

// ---------------------------------------------------------------- helpers
const MAC_RE = /^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i;
const SITE_RE = /^[a-z0-9_-]{1,64}$/i;

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function normMac(m) {
  return String(m || '').trim().toLowerCase().replace(/-/g, ':');
}

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  return (xff ? String(xff).split(',')[0] : req.socket.remoteAddress || '').trim();
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('Body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------- rate limiting
const attempts = new Map(); // ip -> [timestamps]
function rateLimited(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < CONFIG.rateLimit.windowMs);
  attempts.set(ip, list);
  return list.length >= CONFIG.rateLimit.max;
}
function recordFailure(ip) {
  const list = attempts.get(ip) || [];
  list.push(Date.now());
  attempts.set(ip, list);
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of attempts) {
    const keep = list.filter((t) => now - t < CONFIG.rateLimit.windowMs);
    if (keep.length) attempts.set(ip, keep); else attempts.delete(ip);
  }
}, 60_000).unref();

// ---------------------------------------------------------------- UniFi controller client
class UniFi {
  constructor(cfg) {
    this.cfg = cfg;
    this.base = cfg.url ? new URL(cfg.url) : null;
    this.cookies = {};
    this.csrf = null;
    this.isUnifiOS = cfg.type === 'unifios' ? true : cfg.type === 'classic' ? false : null;
    this.loggedIn = false;
    this.loginPromise = null;
  }

  request(method, pathname, body) {
    return new Promise((resolve, reject) => {
      const url = new URL(pathname, this.base);
      const lib = url.protocol === 'https:' ? https : http;
      const payload = body ? JSON.stringify(body) : null;
      const headers = { Accept: 'application/json' };
      if (payload) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(payload);
      }
      const cookieStr = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
      if (cookieStr) headers.Cookie = cookieStr;
      if (this.csrf) headers['X-CSRF-Token'] = this.csrf;

      const req = lib.request(url, {
        method,
        headers,
        rejectUnauthorized: this.cfg.verifyTls,
        timeout: 10_000,
      }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          for (const sc of res.headers['set-cookie'] || []) {
            const [pair] = sc.split(';');
            const i = pair.indexOf('=');
            if (i > 0) this.cookies[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
          }
          const newCsrf = res.headers['x-updated-csrf-token'] || res.headers['x-csrf-token'];
          if (newCsrf) this.csrf = newCsrf;
          if (!this.csrf && this.cookies.csrf_token) this.csrf = this.cookies.csrf_token;
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try { json = JSON.parse(text); } catch (_) { /* not json */ }
          resolve({ status: res.statusCode, json, text });
        });
      });
      req.on('timeout', () => req.destroy(new Error('UniFi controller request timed out')));
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  async login() {
    if (this.loginPromise) return this.loginPromise;
    this.loginPromise = (async () => {
      this.cookies = {};
      this.csrf = null;
      const creds = { username: this.cfg.username, password: this.cfg.password, remember: true };

      const tryOS = async () => {
        const r = await this.request('POST', '/api/auth/login', creds);
        if (r.status >= 200 && r.status < 300) { this.isUnifiOS = true; return true; }
        return r;
      };
      const tryClassic = async () => {
        const r = await this.request('POST', '/api/login', creds);
        if (r.status >= 200 && r.status < 300) { this.isUnifiOS = false; return true; }
        return r;
      };

      let result;
      if (this.isUnifiOS === true) result = await tryOS();
      else if (this.isUnifiOS === false) result = await tryClassic();
      else {
        result = await tryOS();
        if (result !== true) result = await tryClassic();
      }
      if (result !== true) {
        throw new Error(`UniFi login failed (HTTP ${result.status}): ${result.text.slice(0, 200)}`);
      }
      this.loggedIn = true;
      log(`[unifi] logged in to ${this.isUnifiOS ? 'UniFi OS' : 'classic'} controller at ${this.base.origin}`);
    })();
    try { await this.loginPromise; } finally { this.loginPromise = null; }
  }

  apiPath(site, p) {
    return `${this.isUnifiOS ? '/proxy/network' : ''}/api/s/${encodeURIComponent(site)}${p}`;
  }

  async authorizeGuest({ site, mac, ap, minutes }) {
    if (!this.loggedIn) await this.login();
    const body = { cmd: 'authorize-guest', mac, minutes };
    if (ap && MAC_RE.test(ap)) body.ap_mac = normMac(ap);

    let r = await this.request('POST', this.apiPath(site, '/cmd/stamgr'), body);
    if (r.status === 401 || r.status === 403) {
      log('[unifi] session expired, logging in again');
      this.loggedIn = false;
      await this.login();
      r = await this.request('POST', this.apiPath(site, '/cmd/stamgr'), body);
    }
    const ok = r.status >= 200 && r.status < 300 && (!r.json || !r.json.meta || r.json.meta.rc === 'ok');
    if (!ok) throw new Error(`authorize-guest failed (HTTP ${r.status}): ${r.text.slice(0, 200)}`);
    return true;
  }
}

const unifi = new UniFi(CONFIG.unifi);

// ---------------------------------------------------------------- static files
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
};

function serveFile(res, file, status = 200, extraHeaders = {}) {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(status, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Content-Length': data.length,
      ...SECURITY_HEADERS,
      ...extraHeaders,
    });
    res.end(data);
  });
}

// ---------------------------------------------------------------- handlers
async function handleConnect(req, res) {
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return sendJson(res, 429, { ok: false, error: 'Too many attempts. Please wait a few minutes and try again.' });
  }

  let data;
  try {
    const raw = await readBody(req);
    data = JSON.parse(raw || '{}');
  } catch (_) {
    return sendJson(res, 400, { ok: false, error: 'Bad request.' });
  }

  const password = String(data.password || '');
  if (!password || !safeEqual(password.trim(), CONFIG.portalPassword)) {
    recordFailure(ip);
    log(`[portal] wrong password from ${ip}`);
    return sendJson(res, 401, { ok: false, error: 'That password isn’t right. Try again.' });
  }

  const mac = normMac(data.id);
  const site = CONFIG.unifi.site || (SITE_RE.test(String(data.site || '')) ? data.site : 'default');
  const redirect = CONFIG.successUrl || (/^https?:\/\//i.test(String(data.url || '')) ? String(data.url) : '');

  if (DEMO_MODE) {
    log(`[portal] DEMO MODE: password OK for ${mac || 'unknown device'} (no UNIFI_URL set, nothing authorized)`);
    return sendJson(res, 200, { ok: true, demo: true, redirect });
  }

  if (!MAC_RE.test(mac)) {
    return sendJson(res, 400, {
      ok: false,
      error: 'We couldn’t identify your device. Please reconnect to the Wi-Fi network and try again.',
    });
  }

  try {
    await unifi.authorizeGuest({ site, mac, ap: data.ap, minutes: CONFIG.guestMinutes });
    log(`[portal] authorized ${mac} on site "${site}" for ${CONFIG.guestMinutes} min`);
    return sendJson(res, 200, { ok: true, redirect, minutes: CONFIG.guestMinutes });
  } catch (err) {
    log(`[portal] ERROR authorizing ${mac}: ${err.message}`);
    return sendJson(res, 502, { ok: false, error: 'Password accepted, but the network didn’t respond. Please try again in a moment.' });
  }
}

const server = http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch (_) { res.writeHead(400); return res.end('Bad request'); }

  try {
    if (req.method === 'POST' && pathname === '/api/connect') return await handleConnect(req, res);

    if (req.method === 'GET' && pathname === '/healthz') {
      return sendJson(res, 200, { ok: true, demo: DEMO_MODE });
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405); return res.end('Method not allowed');
    }

    // Static assets (favicon etc.)
    const assetName = path.basename(pathname);
    if (assetName && assetName !== 'index.html' && /\.[a-z0-9]+$/i.test(assetName)) {
      const file = path.join(PUBLIC_DIR, assetName);
      if (file.startsWith(PUBLIC_DIR) && fs.existsSync(file)) {
        return serveFile(res, file, 200, { 'Cache-Control': 'public, max-age=86400' });
      }
    }

    // Everything else (/, /guest/s/<site>/, captive-probe URLs) gets the portal page.
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': PORTAL_PAGE.length,
      'Cache-Control': 'no-store',
      ...SECURITY_HEADERS,
    });
    return res.end(req.method === 'HEAD' ? undefined : PORTAL_PAGE);
  } catch (err) {
    log('[server] error:', err);
    if (!res.headersSent) sendJson(res, 500, { ok: false, error: 'Server error.' });
  }
});

server.listen(CONFIG.port, () => {
  log(`"${CONFIG.title}" portal listening on :${CONFIG.port}`);
  if (DEMO_MODE) log('WARNING: UNIFI_URL not set — running in DEMO MODE (password is checked but no device is authorized).');
  else log(`UniFi controller: ${CONFIG.unifi.url} (type: ${CONFIG.unifi.type}, site: ${CONFIG.unifi.site || 'from redirect'})`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { log(`${sig} received, shutting down`); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); });
}
