/* Salman Coffee server (Node.js + Express). Serves the built React site from public/,
   the photos from images/, and the menu from data.json.
   GET  /api/data        menu content (all visitors read this)
   PUT  /api/data        admin saves the menu (needs a token from /api/login)
   POST /api/login       {pin} -> {token}
   ADMIN_PIN comes from the environment. The default "0000" is a PLACEHOLDER: set ADMIN_PIN before going live.
   No secrets are stored in this file. */
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data.json');
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 8080;
const PIN_DEFAULT = '0000';
const PIN = process.env.ADMIN_PIN || PIN_DEFAULT;
const TOKEN_HOURS = 12;
const tokens = new Map();   // token -> expiry (in memory; a restart signs the admin out)
let failures = 0, lockedUntil = 0;

function pinOk(given) {
  const a = Buffer.from(String(given || '')), b = Buffer.from(PIN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function tokenOk(req) {
  const h = String(req.headers.authorization || '');
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  const exp = tokens.get(t);
  if (!exp) return false;
  if (exp < Date.now()) { tokens.delete(t); return false; }
  return true;
}
function validContent(d) {
  if (!d || typeof d !== 'object' || !d.shop || !Array.isArray(d.categories) || !Array.isArray(d.items)) return 'content needs shop, categories and items';
  if (d.categories.length > 60 || d.items.length > 400) return 'too many categories or items';
  const cats = new Set(d.categories.map(c => String(c.id)));
  for (const it of d.items) {
    if (!it || typeof it.id !== 'string' || !cats.has(String(it.cat))) return 'an item points at a category that does not exist';
    if (typeof it.price !== 'number' && typeof it.price !== 'string') return 'item price is missing';
  }
  return null;
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '4mb' }));

app.get('/api/status', (req, res) => res.json({ ok: true, pinIsDefault: PIN === PIN_DEFAULT }));

app.get('/api/data', (req, res) => {
  res.set('cache-control', 'no-store');
  res.type('application/json').send(fs.readFileSync(DATA, 'utf8'));
});

app.post('/api/login', (req, res) => {
  if (Date.now() < lockedUntil) return res.status(429).json({ ok: false, error: 'Too many tries. Wait a minute.' });
  if (!pinOk(req.body && req.body.pin)) {
    failures++; if (failures >= 5) { lockedUntil = Date.now() + 60000; failures = 0; }
    return res.status(401).json({ ok: false, error: 'Wrong PIN' });
  }
  failures = 0;
  const t = crypto.randomBytes(24).toString('hex');
  tokens.set(t, Date.now() + TOKEN_HOURS * 3600 * 1000);
  res.json({ ok: true, token: t });
});

app.put('/api/data', (req, res) => {
  if (!tokenOk(req)) return res.status(401).json({ ok: false, error: 'Sign in to the admin first.' });
  const bad = validContent(req.body);
  if (bad) return res.status(400).json({ ok: false, error: bad });
  const tmp = DATA + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(req.body, null, 2) + '\n');
  fs.renameSync(tmp, DATA);
  res.json({ ok: true, saved: new Date().toISOString() });
});

app.use('/images', express.static(path.join(ROOT, 'images'), { maxAge: '1d' }));
app.use(express.static(PUBLIC, { index: 'index.html' }));
// React router-less pages: /admin and anything else get the app shell
app.get(/^(?!\/api).*/, (req, res) => {
  const f = path.join(PUBLIC, 'index.html');
  if (!fs.existsSync(f)) return res.status(503).type('text').send('Front end not built yet: run npm run build');
  res.sendFile(f);
});

const server = app.listen(PORT, () => {
  console.log('Salman Coffee on http://localhost:' + PORT);
  if (PIN === PIN_DEFAULT) console.log('WARNING: ADMIN_PIN is the placeholder 0000. Set ADMIN_PIN before going live.');
});
export default server;
