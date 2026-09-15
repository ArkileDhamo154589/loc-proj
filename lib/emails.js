import el from '../src/i18n/el.js';
import en from '../src/i18n/en.js';
import { CONTACT, money, typicalTotal } from './fleet.js';

const DICTS = { el, en };

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}

function formatDate(iso, lang) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(lang === 'el' ? 'el-GR' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function layout(bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#EDF1F2;font-family:Arial,Helvetica,sans-serif;color:#0F2537">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:2px solid #0F2537;border-radius:14px">
<tr><td style="padding:22px 24px;border-bottom:2px solid #0F2537;font-size:20px;font-weight:bold">Meltemi Rentals</td></tr>
<tr><td style="padding:24px;font-size:16px;line-height:1.55">${bodyHtml}</td></tr>
</table></td></tr></table></body></html>`;
}

function summaryRows(t, r, lang) {
  return [
    [t.mail.car, `${t.cars[r.category].name} (${t.cars[r.category].model})`],
    [t.mail.pickup, `${formatDate(r.pickup, lang)}, ${t.form.places[r.place]}`],
    [t.mail.dropoff, formatDate(r.dropoff, lang)],
    [t.mail.days, String(r.days)],
    [t.mail.total, `${money(r.total, lang)} (${r.days} × ${money(r.pricePerDay, lang)})`],
  ];
}

/** Auto-reply to the customer, in the language of the page they used. */
export function customerEmail(r) {
  const lang = r.lang;
  const t = DICTS[lang];
  const m = t.mail;
  const first = r.name.split(' ')[0];
  const vars = { name: esc(first), ref: r.ref, days: r.days, total: money(r.total, lang) };

  // Ask only for what is actually missing, so the confirmation can be final.
  const missing = [];
  if (!r.phone) missing.push(m.askPhone);
  if (r.place === 'airport' || r.place === 'port') {
    if (!r.note) missing.push(r.place === 'airport' ? m.askFlight : m.askFerry);
  } else if (r.place === 'hotel' && !r.note) missing.push(m.askHotel);

  const compare = r.category === 'mini'
    ? fill(m.compareMini, { days: r.days, typical: money(typicalTotal(r.days), lang), total: money(r.total, lang) })
    : m.compareOther;

  const rows = summaryRows(t, r, lang);
  const html = layout(`
<p style="margin:0 0 14px">${fill(m.hello, vars)}</p>
<p style="margin:0 0 18px">${fill(m.received, vars)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #0F2537;border-radius:10px;margin:0 0 18px">
${rows.map(([k, v], i) => `<tr><td style="padding:10px 14px;color:#4A5D6C;${i ? 'border-top:1px solid #C9D3D9;' : ''}">${k}</td><td style="padding:10px 14px;font-weight:bold;text-align:right;${i ? 'border-top:1px solid #C9D3D9;' : ''}">${esc(v)}</td></tr>`).join('')}
</table>
<p style="margin:0 0 6px;font-weight:bold">${m.includedTitle}</p>
<ul style="margin:0 0 18px;padding-left:20px">${t.included.map((i) => `<li>${i.title}</li>`).join('')}</ul>
<p style="margin:0 0 18px;padding:12px 14px;background:#FFF6D6;border-radius:10px">${m.payAtPickup}</p>
${missing.length ? `<p style="margin:0 0 6px;font-weight:bold">${m.missingTitle}</p><ul style="margin:0 0 18px;padding-left:20px">${missing.map((x) => `<li>${x}</li>`).join('')}</ul><p style="margin:0 0 18px">${m.missingHow}</p>` : ''}
<p style="margin:0 0 6px;font-weight:bold">${m.compareTitle}</p>
<p style="margin:0 0 18px">${compare}</p>
<p style="margin:0 0 18px">${fill(m.change, { whatsapp: `<a href="https://wa.me/${CONTACT.whatsapp}">${CONTACT.whatsappLabel}</a>` })}</p>
<p style="margin:0">${m.signoff}</p>`);

  const text = [
    fill(m.hello, vars), '', strip(fill(m.received, vars)), '',
    ...rows.map(([k, v]) => `${k}: ${v}`), '',
    m.includedTitle, ...t.included.map((i) => `- ${i.title}`), '',
    strip(m.payAtPickup), '',
    ...(missing.length ? [m.missingTitle, ...missing.map((x) => `- ${strip(x)}`), strip(m.missingHow), ''] : []),
    m.compareTitle, strip(compare), '',
    strip(fill(m.change, { whatsapp: CONTACT.whatsappLabel })), '', strip(m.signoff),
  ].join('\n');

  return { to: r.email, subject: fill(m.subject, { ref: r.ref, car: t.cars[r.category].name }), html, text };
}

/** Notification to the owner, always in Greek, with reply-to set to the customer. */
export function ownerEmail(r, ownerAddress) {
  const t = el;
  const rows = [
    ['Αριθμός', r.ref],
    ['Όνομα', r.name],
    ['Email', r.email],
    ['Τηλέφωνο', r.phone || '(δεν έδωσε)'],
    ...summaryRows(t, r, 'el'),
    ['Σημείωση', r.note || '(καμία)'],
    ['Γλώσσα πελάτη', r.lang.toUpperCase()],
  ];
  const html = layout(`<p style="margin:0 0 14px;font-weight:bold">Νέο αίτημα κράτησης</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#4A5D6C;vertical-align:top">${k}</td><td style="padding:6px 0 6px 12px;font-weight:bold">${esc(v)}</td></tr>`).join('')}</table>
<p style="margin:16px 0 0;color:#4A5D6C">Ο πελάτης έλαβε ήδη αυτόματη απάντηση. Απάντησε σε αυτό το email για να του γράψεις απευθείας.</p>`);
  return {
    to: ownerAddress,
    replyTo: r.email,
    subject: `Νέο αίτημα ${r.ref}: ${r.name}, ${t.cars[r.category].name}, ${r.pickup} έως ${r.dropoff}`,
    html,
    text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
  };
}

function strip(html) {
  return String(html).replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
}
