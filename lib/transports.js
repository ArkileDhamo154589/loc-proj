import net from 'node:net';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const encodeHeader = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);
const wrap76 = (s) => s.replace(/.{1,76}/g, '$&\r\n');

function encodeAddress(addr) {
  const m = /^(.*)<([^>]+)>$/.exec(addr.trim());
  return m ? `${encodeHeader(m[1].trim())} <${m[2]}>` : addr;
}

function bareAddress(addr) {
  const m = /<([^>]+)>/.exec(addr);
  return m ? m[1] : addr.trim();
}

/** Minimal SMTP client without auth or TLS: meant for the local Mailpit inside ddev. */
export function sendSmtp({ host, port, from, to, replyTo, subject, html, text }) {
  const boundary = 'mr' + Date.now().toString(36);
  const message = [
    `From: ${encodeAddress(from)}`,
    `To: ${to}`,
    ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64(text)),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64(html)),
    `--${boundary}--`,
    '',
  ].join('\r\n');

  const steps = [
    [null, 220],
    ['EHLO meltemi.local', 250],
    [`MAIL FROM:<${bareAddress(from)}>`, 250],
    [`RCPT TO:<${bareAddress(to)}>`, 250],
    ['DATA', 354],
    [message + '\r\n.', 250],
    ['QUIT', 221],
  ];

  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port: Number(port) });
    socket.setTimeout(8000, () => socket.destroy(new Error('SMTP timeout')));
    let buffer = '';
    let step = 0;

    const next = () => {
      const [command] = steps[step];
      if (command !== null) socket.write(command + '\r\n');
    };

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      // A reply is complete when its last line has a space after the code ("250 OK").
      const lines = buffer.split('\r\n').filter(Boolean);
      const last = lines[lines.length - 1];
      if (!buffer.endsWith('\r\n') || !/^\d{3} /.test(last)) return;
      buffer = '';
      const code = Number(last.slice(0, 3));
      if (code !== steps[step][1]) {
        socket.destroy();
        return reject(new Error(`SMTP ${code}: ${last}`));
      }
      step += 1;
      if (step === steps.length) {
        socket.end();
        return resolve();
      }
      next();
    });
    socket.on('error', reject);
  });
}

export async function sendResend({ apiKey, from, to, replyTo, subject, html, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], reply_to: replyTo, subject, html, text }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

async function readJsonResponse(res) {
  const body = await res.text();
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Sheet webhook returned non-JSON (${res.status})`);
  }
}

/**
 * Sends a request to the Apps Script web app (apps-script/Code.gs), which checks availability,
 * appends the row and sends the emails. Returns the script's JSON ({ ok, error }); throws only on
 * network errors, timeouts or invalid responses.
 */
export async function postToSheet({ url, token, row, mails, capacity, action, timeoutMs = 25000 }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token, action, row, mails, capacity }),
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
  return readJsonResponse(res);
}

export async function getFromSheet({ url, token, params, timeoutMs = 12000 }) {
  const query = new URLSearchParams({ ...params, token });
  const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}${query}`, {
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
  return readJsonResponse(res);
}

export async function readLocal(file) {
  try {
    const text = await readFile(file, 'utf8');
    return text.split('\n').filter(Boolean).map((line) => JSON.parse(line));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

export async function appendLocal(file, row) {
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, JSON.stringify(row) + '\n', 'utf8');
}
