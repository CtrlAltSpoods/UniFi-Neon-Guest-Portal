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
const holidays = require('./holidays');

// ---------------------------------------------------------------- config
const env = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' ? process.env[k] : d);

const CONFIG = {
  port: parseInt(env('PORT', '8080'), 10),
  portalPassword: env('PORTAL_PASSWORD', ''), // required, no default
  title: env('PORTAL_TITLE', 'Guest Wi-Fi'),
  logoTop: env('LOGO_TOP', ''),       // default: first word of PORTAL_TITLE
  logoBottom: env('LOGO_BOTTOM', ''), // default: second word of PORTAL_TITLE, else "WI-FI"
  footer: env('FOOTER_TEXT', ''),     // default: PORTAL_TITLE
  theme: env('THEME', 'auto').toLowerCase(), // auto | off | christmas | easter | ...
  themePreview: env('THEME_PREVIEW', 'true').toLowerCase() !== 'false', // allow ?theme=<id> in the URL
  timeZone: env('PORTAL_TIMEZONE', 'Australia/Adelaide'),
  music: env('MUSIC', 'on').toLowerCase() !== 'off', // background music (starts on first tap)
  wrongVideo: env('WRONG_PASSWORD_VIDEO', ''), // optional video file shown when the password is wrong
  musicDir: env('MUSIC_DIR', ''), // optional folder of your own tracks: <theme>.mp3 / default.mp3
  guestMinutes: parseInt(env('GUEST_MINUTES', '1440'), 10), // 24h
  successUrl: env('SUCCESS_URL', ''), // optional fixed landing page after login
  unifi: {
    url: env('UNIFI_URL', '').replace(/\/+$/, ''), // e.g. https://192.168.1.1  or https://10.0.0.2:8443
    apiKey: env('UNIFI_API_KEY', ''),    // preferred: Network 9.3+ (Settings > Control Plane > Integrations)
    siteId: env('UNIFI_SITE_ID', ''),    // API key mode only; blank = look it up
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

// ---------------------------------------------------------------- optional wrong-password video
const VIDEO_TYPES = { '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };
let wrongVideo = null; // { file, size, type }
if (CONFIG.wrongVideo) {
  try {
    const st = fs.statSync(CONFIG.wrongVideo);
    const type = VIDEO_TYPES[path.extname(CONFIG.wrongVideo).toLowerCase()];
    if (!st.isFile()) throw new Error('not a file');
    if (!type) throw new Error('use an .mp4, .m4v, .webm or .mov file');
    wrongVideo = { file: CONFIG.wrongVideo, size: st.size, type };
  } catch (e) {
    console.warn(`WARNING: WRONG_PASSWORD_VIDEO "${CONFIG.wrongVideo}" can't be used (${e.message}) - check the volume mapping`);
  }
}

// ---------------------------------------------------------------- optional custom music per theme
// MUSIC_DIR/<theme>.mp3 (e.g. australiaday.mp3, christmas.m4a) replaces that theme's built-in track;
// default.mp3 replaces the everyday lo-fi track.
const AUDIO_TYPES = { '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.oga': 'audio/ogg', '.wav': 'audio/wav', '.flac': 'audio/flac' };
function customTrack(themeId) {
  if (!CONFIG.musicDir) return null;
  for (const name of [themeId === 'none' ? 'default' : themeId]) {
    for (const ext of Object.keys(AUDIO_TYPES)) {
      const file = path.join(CONFIG.musicDir, name + ext);
      try { const st = fs.statSync(file); if (st.isFile()) return { name: name + ext, file, size: st.size, type: AUDIO_TYPES[ext] }; } catch (_) { /* not there */ }
    }
  }
  return null;
}

// Stream a video with HTTP range support (iPhones refuse to play video without it).
function serveVideo(req, res, v) {
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  const base = { 'Content-Type': v.type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=3600', ...SECURITY_HEADERS };
  if (range) {
    let start = range[1] === '' ? v.size - parseInt(range[2], 10) : parseInt(range[1], 10);
    let end = range[1] !== '' && range[2] !== '' ? parseInt(range[2], 10) : v.size - 1;
    if (isNaN(start) || start < 0) start = 0;
    end = Math.min(end, v.size - 1);
    if (start > end || start >= v.size) {
      res.writeHead(416, { ...base, 'Content-Range': `bytes */${v.size}` }); return res.end();
    }
    res.writeHead(206, { ...base, 'Content-Range': `bytes ${start}-${end}/${v.size}`, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(v.file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...base, 'Content-Length': v.size });
  if (req.method === 'HEAD') return res.end();
  return fs.createReadStream(v.file).pipe(res);
}
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------------------------------------------------------------- page rendering
const escHtml = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TEMPLATE = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');

function currentTheme(previewId) {
  const { y, m, d } = holidays.localDate(CONFIG.timeZone);
  if (previewId) return holidays.previewTheme(previewId, y, m, d);
  if (CONFIG.theme === 'off' || CONFIG.theme === 'none') return { id: 'none', banner: '' };
  if (CONFIG.theme !== 'auto') return holidays.previewTheme(CONFIG.theme, y, m, d);
  return holidays.themeFor(y, m, d);
}

function renderPortal(theme) {
  const tpl = TEMPLATE;
  const pageCfg = JSON.stringify({
    title: CONFIG.title,
    top: CONFIG.logoTop.toUpperCase(),
    bottom: CONFIG.logoBottom.toUpperCase(),
    theme: theme.id,
    banner: theme.banner,
    music: CONFIG.music,
    musicFile: (() => { const c = customTrack(theme.id); return c ? `/theme-music/${encodeURIComponent(c.name)}` : ''; })(),
    wrongVideo: wrongVideo ? '/wrong-password-video' : '',
  }).replace(/</g, '\\u003c');
  return Buffer.from(tpl
    .replace(/\{\{TITLE_HEADING\}\}/g, () => escHtml(CONFIG.title).replace(/-/g, '&#8209;')) // keep "Wi-Fi" together
    .replace(/\{\{TITLE\}\}/g, () => escHtml(CONFIG.title))
    .replace(/\{\{FOOTER\}\}/g, () => escHtml(CONFIG.footer))
    .replace(/\{\{LOGO_LABEL\}\}/g, () => escHtml(`${CONFIG.logoTop} ${CONFIG.logoBottom}`))
    .replace('{{CONFIG_JSON}}', () => pageCfg), 'utf8');
}

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

// Explain controller timeouts: could we even open a connection, or did it go silent after?
function watchTimeout(req, url, method) {
  let connected = false;
  req.on('socket', (sock) => {
    if (!sock.connecting) connected = true;
    else sock.once('connect', () => { connected = true; });
  });
  req.on('timeout', () => {
    const where = `${url.protocol}//${url.host}`;
    const msg = connected
      ? `connected to ${where} but got no reply to ${method} ${url.pathname} within 10s (wrong port, or not a UniFi console?)`
      : `could not connect to ${where} within 10s - check UNIFI_URL's IP/port and that the Docker host can reach it (firewall/VLAN rules)`;
    req.destroy(new Error(msg));
  });
  req.on('error', (err) => {
    if (err && err.code && !err.message.includes(url.host)) err.message = `${err.message} (${url.protocol}//${url.host})`;
  });
}

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
      watchTimeout(req, url, method);
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

// ---------------------------------------------------------------- UniFi official Network API (API key)
// Docs: https://help.ui.com/hc/en-us/articles/31228198640023
//   GET  {base}/sites
//   GET  {base}/sites/{siteId}/clients?filter=macAddress.eq('aa:bb:..')
//   POST {base}/sites/{siteId}/clients/{clientId}/actions  { action: 'AUTHORIZE_GUEST_ACCESS', timeLimitMinutes }
class UniFiApiKey {
  constructor(cfg) {
    this.cfg = cfg;
    this.origin = new URL(cfg.url);
    this.basePath = null; // resolved on first use
    this.siteIds = new Map(); // redirect site name -> site UUID
  }

  request(method, pathname, body) {
    return new Promise((resolve, reject) => {
      const url = new URL(pathname, this.origin);
      const lib = url.protocol === 'https:' ? https : http;
      const payload = body ? JSON.stringify(body) : null;
      const headers = { Accept: 'application/json', 'X-API-KEY': this.cfg.apiKey };
      if (payload) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(payload); }
      const req = lib.request(url, { method, headers, rejectUnauthorized: this.cfg.verifyTls, timeout: 10_000 }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null; try { json = JSON.parse(text); } catch (_) { /* not json */ }
          resolve({ status: res.statusCode, json, text });
        });
      });
      watchTimeout(req, url, method);
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  static list(json) {
    if (Array.isArray(json)) return json;
    if (json && Array.isArray(json.data)) return json.data;
    return [];
  }

  async base() {
    if (this.basePath) return this.basePath;
    // UniFi OS consoles serve the API under /proxy/network; self-hosted Network apps may serve it directly.
    for (const candidate of ['/proxy/network/integration/v1', '/integration/v1']) {
      const r = await this.request('GET', `${candidate}/sites?limit=200`);
      if (r.status === 401 || r.status === 403) throw new Error(`API key rejected (HTTP ${r.status}) - check UNIFI_API_KEY`);
      if (r.status >= 200 && r.status < 300 && r.json) {
        this.basePath = candidate;
        this.sites = UniFiApiKey.list(r.json);
        return candidate;
      }
    }
    throw new Error('UniFi Network API not found - needs UniFi Network 9.3 or later');
  }

  async siteId(siteName) {
    if (this.cfg.siteId) return this.cfg.siteId;
    if (this.siteIds.has(siteName)) return this.siteIds.get(siteName);
    await this.base();
    const sites = this.sites || [];
    const match = sites.find((x) => x.internalReference === siteName)
      || sites.find((x) => String(x.name || '').toLowerCase() === String(siteName).toLowerCase())
      || (sites.length === 1 ? sites[0] : null)
      || (siteName === 'default' ? sites.find((x) => String(x.name).toLowerCase() === 'default') : null);
    if (!match) throw new Error(`site "${siteName}" not found (sites: ${sites.map((x) => x.name).join(', ')}) - set UNIFI_SITE_ID`);
    this.siteIds.set(siteName, match.id);
    return match.id;
  }

  async findClientId(base, siteId, mac) {
    const sameMac = (c) => normMac(c.macAddress || c.mac) === mac;
    const filter = encodeURIComponent(`macAddress.eq('${mac}')`);
    const r = await this.request('GET', `${base}/sites/${siteId}/clients?filter=${filter}`);
    if (r.status >= 200 && r.status < 300) {
      const hit = UniFiApiKey.list(r.json).find(sameMac);
      if (hit) return hit.id;
    }
    // Fallback: page through connected clients (in case filtering isn't supported).
    for (let offset = 0; offset < 5000; offset += 200) {
      const p = await this.request('GET', `${base}/sites/${siteId}/clients?offset=${offset}&limit=200`);
      if (p.status < 200 || p.status >= 300) break;
      const items = UniFiApiKey.list(p.json);
      const hit = items.find(sameMac);
      if (hit) return hit.id;
      if (items.length < 200) break;
    }
    return null;
  }

  async authorizeGuest({ site, mac, minutes }) {
    const base = await this.base();
    const siteId = await this.siteId(site);
    // A freshly-joined device can take a moment to show up in the client list.
    let clientId = null;
    for (let attempt = 0; attempt < 4 && !clientId; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 1500));
      clientId = await this.findClientId(base, siteId, mac);
    }
    if (!clientId) throw new Error(`client ${mac} not found on site ${siteId}`);
    const body = { action: 'AUTHORIZE_GUEST_ACCESS', timeLimitMinutes: minutes };
    const r = await this.request('POST', `${base}/sites/${siteId}/clients/${clientId}/actions`, body);
    if (r.status < 200 || r.status >= 300) throw new Error(`AUTHORIZE_GUEST_ACCESS failed (HTTP ${r.status}): ${r.text.slice(0, 200)}`);
    return true;
  }
}

const unifi = CONFIG.unifi.url && CONFIG.unifi.apiKey ? new UniFiApiKey(CONFIG.unifi) : new UniFi(CONFIG.unifi);

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
  let pathname, query;
  try { const u = new URL(req.url, 'http://x'); pathname = decodeURIComponent(u.pathname); query = u.searchParams; }
  catch (_) { res.writeHead(400); return res.end('Bad request'); }

  try {
    if (req.method === 'POST' && pathname === '/api/connect') return await handleConnect(req, res);

    if (req.method === 'GET' && pathname === '/healthz') {
      return sendJson(res, 200, { ok: true, demo: DEMO_MODE });
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && pathname.startsWith('/theme-music/')) {
      const m = /^\/theme-music\/([a-z]+)\.([a-z0-9]+)$/.exec(pathname);
      const c = m && customTrack(m[1] === 'default' ? 'none' : m[1]);
      if (!c || c.name !== `${m[1]}.${m[2]}`) { res.writeHead(404); return res.end('Not found'); }
      return serveVideo(req, res, c);
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/wrong-password-video') {
      if (!wrongVideo) { res.writeHead(404); return res.end('Not found'); }
      return serveVideo(req, res, wrongVideo);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405); return res.end('Method not allowed');
    }

    // Static assets (favicon etc.)
    const assetName = path.basename(pathname);
    if (assetName && assetName !== 'index.html' && /\.[a-z0-9]+$/i.test(assetName)) {
      const file = path.join(PUBLIC_DIR, assetName);
      if (file.startsWith(PUBLIC_DIR) && fs.existsSync(file)) {
        return serveFile(res, file, 200, { 'Cache-Control': /\.(js|css)$/.test(file) ? 'no-cache' : 'public, max-age=86400' });
      }
    }

    // Everything else (/, /guest/s/<site>/, captive-probe URLs) gets the portal page.
    if (req.method === 'GET') {
      const mac = query.get('id') || query.get('mac');
      log(`[portal] page view from ${clientIp(req)} ${pathname}${mac ? ` (device ${normMac(mac)}, ap ${query.get('ap') || '?'})` : ' (no device id - opened directly, not via UniFi redirect)'}`);
    }
    const preview = CONFIG.themePreview ? String(query.get('theme') || '').toLowerCase() : '';
    const PORTAL_PAGE = renderPortal(currentTheme(holidays.THEME_IDS.includes(preview) || preview === 'none' ? preview : ''));
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

server.on('error', (err) => {
  if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
    console.error(`FATAL: can't listen on port ${CONFIG.port} (${err.code}). ` +
      (err.code === 'EACCES' ? 'Remove "no-new-privileges" from the container\'s security options, or set PORT=8080 and map host port 80 to it.' : 'Something else is already using that port.'));
    process.exit(1);
  }
  throw err;
});

server.listen(CONFIG.port, () => {
  log(`"${CONFIG.title}" portal listening on :${CONFIG.port}`);
  if (CONFIG.musicDir) {
    try {
      const found = fs.readdirSync(CONFIG.musicDir).filter((f) => AUDIO_TYPES[path.extname(f).toLowerCase()]);
      log(`Custom music in ${CONFIG.musicDir}: ${found.length ? found.join(', ') : '(no audio files found - name them e.g. australiaday.mp3)'}`);
    } catch (e) { console.warn(`WARNING: MUSIC_DIR "${CONFIG.musicDir}" can't be read (${e.message}) - check the volume mapping`); }
  }
  if (wrongVideo) log(`Wrong-password video: ${wrongVideo.file} (${(wrongVideo.size / 1048576).toFixed(1)} MB)`);
  const t = currentTheme('');
  log(`Theme: ${CONFIG.theme === 'auto' ? `auto (${CONFIG.timeZone}) \u2014 today: ${t.id}` : CONFIG.theme}`);
  if (DEMO_MODE) log('WARNING: UNIFI_URL not set — running in DEMO MODE (password is checked but no device is authorized).');
  else if (CONFIG.unifi.apiKey) {
    log(`UniFi controller: ${CONFIG.unifi.url} (auth: API key, site: ${CONFIG.unifi.siteId || CONFIG.unifi.site || 'from redirect'})`);
    unifi.base().then((b) => log(`[unifi] API key OK (${b}, ${unifi.sites.length} site(s))`)).catch((e) => log(`[unifi] WARNING: ${e.message}`));
  } else {
    log(`UniFi controller: ${CONFIG.unifi.url} (auth: username/password, type: ${CONFIG.unifi.type}, site: ${CONFIG.unifi.site || 'from redirect'})`);
    if (!CONFIG.unifi.username) log('[unifi] WARNING: set UNIFI_API_KEY (recommended) or UNIFI_USERNAME/UNIFI_PASSWORD');
  }
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { log(`${sig} received, shutting down`); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); });
}
