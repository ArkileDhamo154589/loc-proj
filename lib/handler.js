import { validateRequest, makeRef, checkDates } from './booking.js';
import { FLEET, findCar } from './fleet.js';
import { customerEmail, ownerEmail } from './emails.js';
import { sendSmtp, sendResend, postToSheet, getFromSheet, appendLocal, readLocal } from './transports.js';

const MIN_FILL_MS = 1500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Values pasted into hosting dashboards often carry stray spaces or quotes.
export function normalizeEnv(rawEnv = process.env) {
  return Object.fromEntries(
    Object.entries(rawEnv || {}).map(([k, v]) => [k, typeof v === 'string' ? v.trim().replace(/^["']|["']$/g, '') : v]),
  );
}

function overlaps(booking, pickup, dropoff) {
  return booking.pickup < dropoff && booking.dropoff > pickup;
}

/** Cars still free per category for the given dates, from the Sheet or the local file. */
async function availableCars(env, pickup, dropoff) {
  let booked = {};
  if (env.SHEETS_WEBHOOK_URL) {
    const json = await getFromSheet({
      url: env.SHEETS_WEBHOOK_URL,
      token: env.SHEETS_TOKEN || '',
      params: { action: 'availability', pickup, dropoff },
    });
    if (!json.ok) throw new Error(`Sheet availability: ${json.error || 'unknown error'}`);
    booked = json.booked || {};
  } else if (env.LOCAL_STORE_FILE) {
    for (const b of await readLocal(env.LOCAL_STORE_FILE)) {
      if (b.status !== 'cancelled' && overlaps(b, pickup, dropoff)) booked[b.category] = (booked[b.category] || 0) + 1;
    }
  } else {
    return { available: Object.fromEntries(FLEET.map((c) => [c.id, c.count])), demo: true };
  }
  return { available: Object.fromEntries(FLEET.map((c) => [c.id, Math.max(0, c.count - (booked[c.id] || 0))])) };
}

/** GET /api/availability?pickup=YYYY-MM-DD&dropoff=YYYY-MM-DD */
export async function handleAvailability(query, rawEnv = process.env, log = console) {
  const env = normalizeEnv(rawEnv);
  const pickup = String(query?.pickup || '');
  const dropoff = String(query?.dropoff || '');
  const error = checkDates(pickup, dropoff);
  if (error) return { status: 422, body: { ok: false, error: 'validation', fields: { dates: error } } };
  try {
    const result = await availableCars(env, pickup, dropoff);
    return { status: 200, body: { ok: true, ...result } };
  } catch (err) {
    log.error('[availability] lookup failed', err.message);
    return { status: 502, body: { ok: false, error: 'lookup_failed' } };
  }
}

/**
 * Framework-free request handler shared by the Vercel function and the local dev server.
 * Returns { status, body }. A request counts as delivered when at least one sink
 * (Google Sheet, local file or owner email) accepted it.
 */
export async function handleBookingRequest(input, rawEnv = process.env, log = console) {
  const env = normalizeEnv(rawEnv);
  if (!input || typeof input !== 'object') return { status: 400, body: { ok: false, error: 'bad_request' } };

  // Bots fill the hidden field or submit instantly: pretend success, store nothing.
  const tooFast = Number(input.startedAt) && Date.now() - Number(input.startedAt) < MIN_FILL_MS;
  if (input.website || tooFast) return { status: 200, body: { ok: true, ref: makeRef() } };

  const { errors, data } = validateRequest(input);
  if (errors) return { status: 422, body: { ok: false, error: 'validation', fields: errors } };

  const request = { ref: makeRef(), createdAt: new Date().toISOString(), ...data };
  const capacity = findCar(request.category).count;
  const unavailable = async () => {
    let available;
    try {
      ({ available } = await availableCars(env, request.pickup, request.dropoff));
    } catch {
      /* the client simply keeps its previous availability */
    }
    return { status: 409, body: { ok: false, error: 'unavailable', fields: { category: 'unavailable' }, available } };
  };

  const from = env.MAIL_FROM || 'Meltemi Rentals <bookings@meltemi-rentals.gr>';
  const ownerValid = EMAIL_RE.test(env.OWNER_EMAIL || '');
  if (env.OWNER_EMAIL && !ownerValid) log.error('[booking] OWNER_EMAIL is not a valid address, owner notification skipped');
  const owner = ownerValid ? env.OWNER_EMAIL : 'bookings@meltemi-rentals.gr';
  const mails = [{ ...customerEmail(request), replyTo: owner }];
  if (ownerValid || !env.OWNER_EMAIL) mails.push(ownerEmail(request, owner));

  const mailVia = env.SMTP_HOST ? 'smtp' : env.RESEND_API_KEY ? 'resend' : env.SHEETS_SEND_MAIL === '1' ? 'sheet' : 'none';
  const sinks = [];

  if (env.SHEETS_WEBHOOK_URL) {
    const sheet = { url: env.SHEETS_WEBHOOK_URL, token: env.SHEETS_TOKEN || '' };
    try {
      const json = await postToSheet({
        ...sheet,
        row: request,
        capacity,
        mails: mailVia === 'sheet' ? mails.map((m) => ({ ...m, fromName: 'Meltemi Rentals' })) : [],
      });
      if (json.ok) sinks.push('sheet');
      else if (json.error === 'unavailable') return unavailable();
      else log.error('[booking] sheet rejected', request.ref, json.error);
      if (json.mailErrors?.length) log.error('[booking] sheet mail errors', request.ref, json.mailErrors.join(' | '));
    } catch (err) {
      // The script may have saved the row even though the response was lost (slow Apps Script, timeout).
      log.error('[booking] sheet request failed, checking whether it was saved', request.ref, err.message);
      try {
        const found = await getFromSheet({ ...sheet, params: { action: 'find', ref: request.ref } });
        if (found.ok && found.found) sinks.push('sheet');
      } catch (findErr) {
        log.error('[booking] sheet lookup failed', request.ref, findErr.message);
      }
    }
  }

  if (env.LOCAL_STORE_FILE) {
    try {
      if (!env.SHEETS_WEBHOOK_URL) {
        const { available } = await availableCars(env, request.pickup, request.dropoff);
        if (available[request.category] < 1) return unavailable();
      }
      await appendLocal(env.LOCAL_STORE_FILE, request);
      sinks.push('file');
    } catch (err) {
      log.error('[booking] local store failed', request.ref, err.message);
    }
  }

  let mailed = mailVia === 'sheet' && sinks.includes('sheet');
  if (mailVia === 'smtp' || mailVia === 'resend') {
    const results = await Promise.allSettled(
      mails.map((m) =>
        mailVia === 'smtp'
          ? sendSmtp({ host: env.SMTP_HOST, port: env.SMTP_PORT || 25, from, ...m })
          : sendResend({ apiKey: env.RESEND_API_KEY, from, ...m }),
      ),
    );
    results.forEach((r, i) => r.status === 'rejected' && log.error('[booking] mail failed', i, request.ref, r.reason?.message));
    mailed = results[0].status === 'fulfilled';
    if (results[1]?.status === 'fulfilled') sinks.push('owner-mail');
  }

  // No storage configured at all (e.g. a preview deployment): accept the request in demo mode,
  // so the page can be evaluated end to end, and tell the client nothing was saved.
  const configured = Boolean(env.SHEETS_WEBHOOK_URL || env.LOCAL_STORE_FILE || mailVia === 'smtp' || mailVia === 'resend');
  if (!configured) {
    log.info?.('[booking] demo mode, no storage configured', request.ref);
    return {
      status: 200,
      body: { ok: true, demo: true, ref: request.ref, days: request.days, total: request.total, mailed: false },
    };
  }

  if (!sinks.length) {
    log.error('[booking] request not delivered anywhere', request.ref, JSON.stringify(request));
    return { status: 503, body: { ok: false, error: 'not_delivered' } };
  }

  log.info?.('[booking] stored', request.ref, sinks.join(','), mailed ? 'mailed' : 'no-mail');
  return {
    status: 200,
    body: { ok: true, ref: request.ref, days: request.days, total: request.total, mailed },
  };
}
