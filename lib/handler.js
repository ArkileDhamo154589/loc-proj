import { validateRequest, makeRef } from './booking.js';
import { customerEmail, ownerEmail } from './emails.js';
import { sendSmtp, sendResend, postToSheet, appendLocal } from './transports.js';

const MIN_FILL_MS = 1500;

/**
 * Framework-free request handler shared by the Vercel function and the local dev server.
 * Returns { status, body }. A request counts as delivered when at least one sink
 * (Google Sheet, local file or owner email) accepted it.
 */
export async function handleBookingRequest(input, env = process.env, log = console) {
  if (!input || typeof input !== 'object') return { status: 400, body: { ok: false, error: 'bad_request' } };

  // Bots fill the hidden field or submit instantly: pretend success, store nothing.
  const tooFast = Number(input.startedAt) && Date.now() - Number(input.startedAt) < MIN_FILL_MS;
  if (input.website || tooFast) return { status: 200, body: { ok: true, ref: makeRef() } };

  const { errors, data } = validateRequest(input);
  if (errors) return { status: 422, body: { ok: false, error: 'validation', fields: errors } };

  const request = { ref: makeRef(), createdAt: new Date().toISOString(), ...data };
  const from = env.MAIL_FROM || 'Meltemi Rentals <bookings@meltemi-rentals.gr>';
  const owner = env.OWNER_EMAIL || 'bookings@meltemi-rentals.gr';
  const mails = [
    { ...customerEmail(request), replyTo: owner },
    ownerEmail(request, owner),
  ];

  const mailVia = env.SMTP_HOST ? 'smtp' : env.RESEND_API_KEY ? 'resend' : env.SHEETS_SEND_MAIL === '1' ? 'sheet' : 'none';
  const sinks = [];

  if (env.SHEETS_WEBHOOK_URL) {
    try {
      await postToSheet({
        url: env.SHEETS_WEBHOOK_URL,
        token: env.SHEETS_TOKEN || '',
        row: request,
        mails: mailVia === 'sheet' ? mails.map((m) => ({ ...m, fromName: 'Meltemi Rentals' })) : [],
      });
      sinks.push('sheet');
    } catch (err) {
      log.error('[booking] sheet failed', request.ref, err.message);
    }
  }

  if (env.LOCAL_STORE_FILE) {
    try {
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
    if (results[1].status === 'fulfilled') sinks.push('owner-mail');
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
