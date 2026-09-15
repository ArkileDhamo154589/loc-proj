// Local development server: serves public/ and mirrors the Vercel function
// at POST /api/request using the same handler.
import http from 'node:http';
import { gzipSync } from 'node:zlib';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.js';
import { handleBookingRequest } from './lib/handler.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(root, 'public');
const port = Number(process.env.PORT || 3000);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(publicDir, path);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    const type = TYPES[extname(file)] || 'application/octet-stream';
    const headers = {
      'Content-Type': type,
      'Cache-Control': extname(file) === '.woff2' ? 'public, max-age=31536000, immutable' : 'no-cache',
    };
    // Compress text like Vercel does, so local speed tests are realistic.
    if (/text|svg/.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      headers['Content-Encoding'] = 'gzip';
      headers.Vary = 'Accept-Encoding';
      return res.writeHead(200, headers).end(gzipSync(body));
    }
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 20000) throw new Error('too large');
  }
  return JSON.parse(raw);
}

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/request')) {
    if (req.method !== 'POST') {
      res.writeHead(405, { Allow: 'POST', 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
    }
    let body = null;
    try {
      body = await readJson(req);
    } catch {
      /* handled as bad request below */
    }
    // Simulate a slow mobile connection or an outage with ?delay=ms / ?fail=1 during testing.
    const q = new URL(req.url, 'http://localhost').searchParams;
    if (q.get('delay')) await new Promise((r) => setTimeout(r, Number(q.get('delay'))));
    const result = q.get('fail')
      ? { status: 503, body: { ok: false, error: 'not_delivered' } }
      : await handleBookingRequest(body);
    res.writeHead(result.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(result.body));
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    return res.end();
  }
  return serveStatic(req, res);
});

await build();
console.log('[dev] pages built');

let pending = null;
for (const dir of ['src', 'lib']) {
  watch(join(root, dir), { recursive: true }, () => {
    clearTimeout(pending);
    pending = setTimeout(() => build().then((ms) => console.log(`[dev] rebuilt in ${ms}ms`)).catch((e) => console.error('[dev] build failed', e.message)), 80);
  });
}

server.listen(port, '0.0.0.0', () => console.log(`[dev] http://localhost:${port}`));
