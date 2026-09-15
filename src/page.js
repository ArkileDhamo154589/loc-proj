import { FLEET, TYPICAL, CONTACT, MAX_DAYS, money, typicalTotal } from '../lib/fleet.js';
import { sprite, icon } from './icons.js';
import { PHOTOS } from '../lib/photos.js';

const DEFAULT_DAYS = 7;

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function daysLabel(t, n) {
  return `${n} ${n === 1 ? t.calc.dayOne : t.calc.dayMany}`;
}

function bill(t, lang, kind, days) {
  const ours = kind === 'ours';
  const mini = FLEET[0];
  const lines = [
    { id: 'base', rate: ours ? mini.price : TYPICAL.base, perDay: true },
    ...TYPICAL.perDay.map((l) => ({ id: l.id, rate: l.amount, perDay: true })),
    ...TYPICAL.oneOff.map((l) => ({ id: l.id, rate: l.amount, perDay: false })),
  ];
  const total = ours ? mini.price * days : typicalTotal(days);

  const rows = lines
    .map((l, i) => {
      const isBase = l.id === 'base';
      const rate = l.perDay ? fill(t.calc.perDay, { price: money(l.rate, lang) }) : t.calc.oneOff;
      let amount;
      if (ours && !isBase) {
        amount = `<span class="bill-in">${icon('check')}${t.calc.included}</span>`;
      } else {
        amount = `<span data-amt>${money(l.perDay ? l.rate * days : l.rate, lang)}</span>`;
      }
      const cls = isBase ? 'is-base' : ours ? 'is-in' : 'is-extra';
      return `<li class="bill-line ${cls}" data-line="${l.id}" data-rate="${l.rate}" data-per-day="${l.perDay ? 1 : 0}" style="--i:${i}">
<span class="bill-label">${t.calc.lines[l.id]}${ours && !isBase ? '' : `<small>${rate}</small>`}</span>
<span class="bill-amt">${amount}</span></li>`;
    })
    .join('');

  const note = ours
    ? `<p class="bill-note is-ok">${icon('check')}<span>${t.calc.depositOurs}</span></p>`
    : `<p class="bill-note is-warn">${icon('alert')}<span>${fill(t.calc.deposit, { deposit: money(TYPICAL.deposit, lang) })}</span></p>`;

  return `<article class="bill bill-${kind} reveal">
<header class="bill-head">
  <h3>${ours ? t.calc.oursTitle : t.calc.adTitle}</h3>
  <p>${ours ? t.calc.oursSub : t.calc.adSub}</p>
</header>
<ul class="bill-lines">${rows}${ours ? `<li class="bill-line is-all"><span class="bill-label">${t.calc.allIncluded}</span><span class="bill-amt"><span class="bill-in">${icon('check')}${t.calc.included}</span></span></li>` : ''}</ul>
<div class="bill-total">
  <span>${t.calc.total}</span>
  <strong data-total="${kind}">${money(total, lang)}</strong>
</div>
<div class="bill-bar" aria-hidden="true"><span data-bar="${kind}" style="--w:${(total / typicalTotal(days)).toFixed(3)}"></span></div>
<p class="bill-perday" data-perday="${kind}">${fill(t.calc.perDayApprox, { price: money(total / days, lang) })}</p>
${note}
</article>`;
}

function carCard(t, lang, car) {
  const c = t.cars[car.id];
  const s = t.carsSection;
  const bags = car.bags === 1 ? s.bagOne : fill(s.bagMany, { n: car.bags });
  return `<article class="car reveal" data-car="${car.id}">
<div class="car-visual">
  <img src="/img/car-${car.id}-480.webp" srcset="/img/car-${car.id}-480.webp 480w, /img/car-${car.id}-720.webp 720w" sizes="(min-width: 980px) 270px, (min-width: 560px) 45vw, 92vw" width="720" height="450" loading="lazy" decoding="async" alt="${attr(c.model)}">
  <span class="car-fleet">${fill(s.inFleet, { n: car.count })}</span>
</div>
<div class="car-body">
  <h3>${c.name}</h3>
  <p class="car-model">${c.model}</p>
  <p class="car-desc">${c.desc}</p>
  <ul class="specs">
    <li>${icon('seat')}${fill(s.seats, { n: car.seats })}</li>
    <li>${icon('bag')}${bags}</li>
    <li>${icon(car.gearbox === 'auto' ? 'auto' : 'gear')}${car.gearbox === 'auto' ? s.auto : s.manual}</li>
    <li>${icon('snow')}${s.ac}</li>
  </ul>
  <div class="car-foot">
    <p class="car-price"><strong>${money(car.price, lang)}</strong><span>${s.perDay}<br>${s.final}</span></p>
    <a class="btn btn-dark" href="#book" data-choose="${car.id}">${s.choose}</a>
  </div>
</div>
</article>`;
}

function field({ id, label, type = 'text', hint, optional, attrs = '', t }) {
  const describedBy = [hint && `${id}-hint`, `${id}-error`].filter(Boolean).join(' ');
  return `<div class="field" data-field="${id}">
  <label for="f-${id}">${label}${optional ? ` <span class="opt">(${t.form.optional})</span>` : ''}</label>
  <input id="f-${id}" name="${id}" type="${type}" ${attrs} aria-describedby="${describedBy}">
  ${hint ? `<p class="hint" id="${id}-hint">${hint}</p>` : ''}
  <p class="field-error" id="${id}-error" hidden></p>
</div>`;
}

export function renderPage({ t, other, cssText, jsText }) {
  const lang = t.lang;
  const homeHref = lang === 'el' ? '/' : '/en/';
  const otherHref = lang === 'el' ? '/en/' : '/';
  const mini = FLEET[0];

  const clientData = {
    lang,
    fleet: FLEET,
    typical: TYPICAL,
    contact: CONTACT,
    maxDays: MAX_DAYS,
    t: {
      calc: t.calc,
      form: t.form,
      errors: t.errors,
      success: t.success,
      questions: t.questions,
      whatsappText: t.whatsappText,
      cars: Object.fromEntries(Object.entries(t.cars).map(([k, v]) => [k, v.name])),
    },
  };

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${t.meta.title}</title>
<meta name="description" content="${attr(t.meta.description)}">
<meta name="theme-color" content="#EDF1F2">
<link rel="alternate" hreflang="el" href="/">
<link rel="alternate" hreflang="en" href="/en/">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/sofiacond-${lang === 'el' ? 'greek' : 'latin'}.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/sofia-${lang === 'el' ? 'greek' : 'latin'}.woff2" as="font" type="font/woff2" crossorigin>
<style>${cssText}</style>
</head>
<body>
${sprite()}
<a class="skip" href="#main">${lang === 'el' ? 'Μετάβαση στο περιεχόμενο' : 'Skip to content'}</a>

<div class="lang-suggest" data-lang-suggest hidden>
  <div class="container lang-suggest-inner">
    ${icon('globe')}
    <p lang="${other.lang}">${other.langSuggest.text} <a href="${otherHref}" hreflang="${other.lang}">${other.langSuggest.link}</a></p>
    <button type="button" class="icon-btn" data-lang-dismiss aria-label="${other.langSuggest.close}">${icon('x')}</button>
  </div>
</div>

<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="${homeHref}" aria-label="${t.nav.home}">
      <span class="brand-mark">${icon('wind')}</span>
      <span class="brand-name">Meltemi <span>Rentals</span></span>
    </a>
    <nav class="nav" aria-label="${lang === 'el' ? 'Κύριο μενού' : 'Main'}">
      <a href="#prices">${t.nav.prices}</a>
      <a href="#cars">${t.nav.cars}</a>
      <a href="#faq">${t.nav.faq}</a>
    </nav>
    <div class="header-actions">
      <a class="lang-switch" href="${otherHref}" hreflang="${other.lang}" lang="${other.lang}" title="${t.nav.switchTo}">${icon('globe')}<span>${t.nav.switchShort}</span></a>
      <a class="btn btn-primary btn-sm" href="#book">${t.nav.book}</a>
    </div>
  </div>
</header>

<main id="main">
<section class="hero">
  <div class="container hero-grid">
    <div class="hero-copy">
      <p class="hero-place">${icon('pin')}${t.hero.place}</p>
      <h1>${t.hero.title}</h1>
      <p class="lead">${t.hero.lead}</p>
      <div class="hero-actions" data-hero-cta>
        <a class="btn btn-primary btn-lg" href="#book">${t.hero.cta}</a>
        <a class="btn btn-ghost btn-lg" href="#prices">${t.hero.ctaCompare}</a>
      </div>
      <p class="micro">${icon('clock')}${t.hero.micro}</p>
      <div class="trust">
        <span class="trust-row"><span class="stars" aria-hidden="true">${icon('star', 'fill')}${icon('star', 'fill')}${icon('star', 'fill')}${icon('star', 'fill')}${icon('star', 'fill')}</span>${t.hero.rating}</span>
        <span class="trust-since">${icon('users')}${t.hero.since}</span>
      </div>
      <div class="hero-cars" aria-hidden="true"><span class="hero-car hero-car-a"><span class="speed" aria-hidden="true"><i></i><i></i><i></i></span><svg class="hero-car-art" viewBox="0 0 206 92" aria-hidden="true"><ellipse cx="104" cy="87" rx="92" ry="3.5" fill="#0F2537" opacity=".12"/><g class="body"><path d="M46 6h92" stroke="#0F2537" stroke-width="3.5" stroke-linecap="round"/><path d="M56 6v5M128 6v5" stroke="#0F2537" stroke-width="3"/><path d="M14 66V34q0-7 7-9l14-13q3-3 9-3h96q8 0 12 6l14 20q24 2 30 10 2 3 2 8v13q0 4-4 4H18q-4 0-4-4z" fill="#2F7FD1" stroke="#0F2537" stroke-width="3" stroke-linejoin="round"/><path d="M24 33l14-17h66v17z" fill="#EAF3FB" stroke="#0F2537" stroke-width="3" stroke-linejoin="round"/><path d="M110 16h30q6 0 9 5l9 12h-48z" fill="#EAF3FB" stroke="#0F2537" stroke-width="3" stroke-linejoin="round"/><path d="M107 37v26" stroke="#0F2537" stroke-width="2" opacity=".35"/><path d="M118 42h9M62 42h9" stroke="#0F2537" stroke-width="2.5" stroke-linecap="round"/><path d="M14 56h178" stroke="#0F2537" stroke-width="2" opacity=".25"/><rect x="182" y="44" width="9" height="7" rx="2.5" fill="#FFF6D6" stroke="#0F2537" stroke-width="2"/><rect x="14" y="30" width="6" height="12" rx="2" fill="#E4553F" stroke="#0F2537" stroke-width="2"/></g><circle class="arch" cx="52" cy="70" r="19.5"/><g class="wheel"><circle cx="52" cy="70" r="15" fill="#0F2537"/><circle cx="52" cy="70" r="7.5" fill="#DDE5EA"/><g stroke="#0F2537" stroke-width="2.2" stroke-linecap="round"><path d="M52 63.7V76.3" transform="rotate(0 52 70)"/><path d="M52 63.7V76.3" transform="rotate(60 52 70)"/><path d="M52 63.7V76.3" transform="rotate(120 52 70)"/></g><circle cx="52" cy="70" r="2" fill="#0F2537"/></g><circle class="arch" cx="158" cy="70" r="19.5"/><g class="wheel"><circle cx="158" cy="70" r="15" fill="#0F2537"/><circle cx="158" cy="70" r="7.5" fill="#DDE5EA"/><g stroke="#0F2537" stroke-width="2.2" stroke-linecap="round"><path d="M158 63.7V76.3" transform="rotate(0 158 70)"/><path d="M158 63.7V76.3" transform="rotate(60 158 70)"/><path d="M158 63.7V76.3" transform="rotate(120 158 70)"/></g><circle cx="158" cy="70" r="2" fill="#0F2537"/></g></svg></span><span class="hero-car hero-car-b"><span class="speed" aria-hidden="true"><i></i><i></i><i></i></span><svg class="hero-car-art" viewBox="0 0 206 92" aria-hidden="true"><ellipse cx="104" cy="86" rx="90" ry="3.5" fill="#0F2537" opacity=".12"/><g class="body"><path d="M16 66V40q0-8 6-12l18-10q6-3 14-3h66q10 0 17 6l21 19q26 3 32 11 2 4 2 9v6q0 4-4 4H20q-4 0-4-4z" fill="#FFCF33" stroke="#0F2537" stroke-width="3" stroke-linejoin="round"/><path d="M26 40V33q2-8 10-10l16-2h66q8 0 13 5l15 14z" fill="#EAF3FB" stroke="#0F2537" stroke-width="3" stroke-linejoin="round"/><path d="M72 21v19M110 21v19" stroke="#0F2537" stroke-width="3"/><path d="M110 44v20" stroke="#0F2537" stroke-width="2" opacity=".35"/><path d="M122 49h9" stroke="#0F2537" stroke-width="2.5" stroke-linecap="round"/><rect x="182" y="50" width="9" height="6" rx="2.5" fill="#FFF6D6" stroke="#0F2537" stroke-width="2"/><rect x="16" y="37" width="6" height="10" rx="2" fill="#E4553F" stroke="#0F2537" stroke-width="2"/></g><circle class="arch" cx="54" cy="70" r="18.5"/><g class="wheel"><circle cx="54" cy="70" r="14" fill="#0F2537"/><circle cx="54" cy="70" r="7.0" fill="#DDE5EA"/><g stroke="#0F2537" stroke-width="2.2" stroke-linecap="round"><path d="M54 64.12V75.88" transform="rotate(0 54 70)"/><path d="M54 64.12V75.88" transform="rotate(60 54 70)"/><path d="M54 64.12V75.88" transform="rotate(120 54 70)"/></g><circle cx="54" cy="70" r="2" fill="#0F2537"/></g><circle class="arch" cx="158" cy="70" r="18.5"/><g class="wheel"><circle cx="158" cy="70" r="14" fill="#0F2537"/><circle cx="158" cy="70" r="7.0" fill="#DDE5EA"/><g stroke="#0F2537" stroke-width="2.2" stroke-linecap="round"><path d="M158 64.12V75.88" transform="rotate(0 158 70)"/><path d="M158 64.12V75.88" transform="rotate(60 158 70)"/><path d="M158 64.12V75.88" transform="rotate(120 158 70)"/></g><circle cx="158" cy="70" r="2" fill="#0F2537"/></g></svg></span></div>
    </div>

    <div class="hero-visual">
    <figure class="hero-photo">
      <img src="/img/hero-640.webp" srcset="/img/hero-640.webp 640w, /img/hero-1040.webp 1040w" sizes="(min-width: 980px) 500px, 92vw" width="1040" height="693" fetchpriority="high" decoding="async" alt="${attr(t.photos.hero)}">
      <figcaption class="photo-tag">${icon('pin')}${t.photos.heroTag}</figcaption>
    </figure>
    <aside class="receipt" aria-labelledby="receipt-title">
      <div class="receipt-head">
        <h2 id="receipt-title">${t.receipt.title}</h2>
        <p class="price-tag"><strong>${money(mini.price, lang)}</strong><span>/${t.calc.dayOne}</span></p>
      </div>
      <ul class="receipt-list">
        ${t.included.map((it, i) => `<li style="--i:${i}"><span class="tick">${icon('check')}</span><span class="receipt-item">${icon(it.id, 'receipt-ico')}${it.title}</span></li>`).join('')}
      </ul>
      <dl class="receipt-foot">
        <div><dt>${t.receipt.extra}</dt><dd class="zero">${money(0, lang)}</dd></div>
        <div class="receipt-total"><dt>${t.receipt.perDay}</dt><dd>${money(mini.price, lang)}</dd></div>
      </dl>
    </aside>
    </div>
  </div>
</section>


<section id="prices" class="section calc" data-calc>
  <div class="container">
    <div class="section-head reveal">
      <h2>${t.calc.title}</h2>
      <p>${t.calc.lead}</p>
    </div>

    <div class="calc-controls reveal">
      <label for="calc-days" class="calc-label">${icon('calendar')}${t.calc.daysLabel}</label>
      <div class="stepper">
        <button type="button" class="step-btn" data-step="-1" aria-label="${t.calc.minus}">${icon('minus')}</button>
        <output for="calc-days" class="step-out" data-days-out aria-live="polite">${daysLabel(t, DEFAULT_DAYS)}</output>
        <button type="button" class="step-btn" data-step="1" aria-label="${t.calc.plus}">${icon('plus')}</button>
      </div>
      <input id="calc-days" class="range" type="range" min="1" max="14" step="1" value="${DEFAULT_DAYS}">
    </div>

    <div class="calc-grid">
      ${bill(t, lang, 'ad', DEFAULT_DAYS)}
      ${bill(t, lang, 'ours', DEFAULT_DAYS)}
    </div>

    <div class="calc-result reveal">
      <p data-saving>${fill(t.calc.saving, { days: daysLabel(t, DEFAULT_DAYS), diff: `<strong>${money(typicalTotal(DEFAULT_DAYS) - mini.price * DEFAULT_DAYS, lang)}</strong>` })}</p>
      <a class="btn btn-primary btn-lg" href="#book">${t.calc.cta}</a>
    </div>
    <p class="footnote">${t.calc.footnote}</p>
  </div>
</section>

<section id="cars" class="section cars">
  <div class="container">
    <div class="section-head reveal">
      <h2>${t.carsSection.title}</h2>
      <p>${t.carsSection.lead}</p>
    </div>
    <div class="car-grid">
      ${FLEET.map((c) => carCard(t, lang, c)).join('')}
    </div>
  </div>
</section>

<section class="section reasons">
  <div class="container">
    <h2 class="section-title reveal">${t.reasons.title}</h2>
    <div class="reason-grid">
      ${t.reasons.items.map((r) => `<div class="reason reveal"><span class="reason-ico">${icon(r.icon)}</span><h3>${r.title}</h3><p>${r.text}</p></div>`).join('')}
    </div>
  </div>
</section>

<section class="section reviews">
  <div class="container reviews-grid">
    <div class="reviews-intro">
      <h2>${t.reviews.title}</h2>
      <p class="rating-line"><span class="stars" aria-hidden="true">${icon('star', 'fill')}${icon('star', 'fill')}${icon('star', 'fill')}${icon('star', 'fill')}${icon('star', 'fill')}</span>${t.reviews.rating}</p>
      <figure class="owner reveal">
        <blockquote>${t.reviews.owner.text}</blockquote>
        <figcaption>${t.reviews.owner.name}</figcaption>
      </figure>
    </div>
    <div class="review-list">
      ${t.reviews.items.map((r) => `<figure class="review reveal"><blockquote>${r.text}</blockquote><figcaption><strong>${r.name}</strong><span>${r.meta}</span></figcaption></figure>`).join('')}
    </div>
  </div>
</section>

<section class="section questions">
  <div class="container">
    <div class="section-head reveal">
      <h2>${t.questions.title}</h2>
      <p>${t.questions.lead}</p>
    </div>
    <div class="qa reveal">
      <div class="qa-row qa-headrow" aria-hidden="true"><span>${t.questions.colQ}</span><span>${t.questions.colA}</span></div>
      <ul class="qa-list">
        ${t.questions.items.map((q) => `<li class="qa-row"><span class="qa-q">${q.q}</span><span class="qa-a">${icon('check')}${q.a}</span></li>`).join('')}
      </ul>
    </div>
    <button type="button" class="btn btn-ghost" data-copy-questions>${icon('copy')}<span>${t.questions.copy}</span></button>
  </div>
</section>

<section class="band" aria-label="${attr(t.photos.kefalos)}">
  <picture>
    <source media="(min-width: 760px)" srcset="/img/kefalos-wide-1000.webp 1000w, /img/kefalos-wide-1600.webp 1600w" sizes="100vw" width="1600" height="533">
    <img src="/img/kefalos-640.webp" width="640" height="480" loading="lazy" decoding="async" alt="${attr(t.photos.kefalos)}">
  </picture>
  <div class="container band-inner">
    <div class="band-card reveal">
      <p class="band-title">${t.band.title}</p>
      <p>${t.band.text}</p>
    </div>
  </div>
</section>

<section id="book" class="section book">
  <div class="container book-grid">
    <div class="book-intro">
      <h2>${t.form.title}</h2>
      <p class="lead">${t.form.lead}</p>
      <ul class="book-included">
        ${t.included.map((it) => `<li>${icon(it.id)}${it.short}</li>`).join('')}
      </ul>
      <div class="book-alt">
        <a class="alt-link" href="https://wa.me/${CONTACT.whatsapp}" rel="noopener">${icon('whatsapp')}<span>${t.footer.whatsapp}<small>${CONTACT.whatsappLabel}</small></span></a>
        <a class="alt-link" href="tel:${CONTACT.phone}">${icon('phone')}<span>${t.footer.call}<small>${CONTACT.phoneLabel}</small></span></a>
      </div>
    </div>

    <div class="form-card reveal">
      <form id="booking-form" novalidate data-form>
        <div class="hp" aria-hidden="true">
          <label for="f-website">Website</label>
          <input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off">
        </div>

        ${field({ id: 'name', label: t.form.name, attrs: 'autocomplete="name" required maxlength="120"', t })}
        ${field({ id: 'email', label: t.form.email, type: 'email', hint: t.form.emailHint, attrs: 'autocomplete="email" inputmode="email" required maxlength="160"', t })}

        <div class="field-row dates">
          ${field({ id: 'pickup', label: t.form.pickup, type: 'date', attrs: 'required', t })}
          ${field({ id: 'dropoff', label: t.form.dropoff, type: 'date', attrs: 'required', t })}
        </div>

        <fieldset class="field cat-field" data-field="category" aria-describedby="category-error">
          <legend>${t.form.category}</legend>
          <div class="cat-options">
            ${FLEET.map((c) => `<label class="cat-opt" data-cat="${c.id}">
              <input type="radio" name="category" value="${c.id}" required>
              <span class="cat-name">${t.cars[c.id].name}</span>
              <span class="cat-price">${fill(t.form.perDay, { price: money(c.price, lang) })}</span>
            </label>`).join('')}
          </div>
          <p class="field-error" id="category-error" hidden></p>
        </fieldset>

        <div class="field-row">
          <div class="field" data-field="place">
            <label for="f-place">${t.form.place}</label>
            <div class="select-wrap">
              <select id="f-place" name="place">
                ${Object.entries(t.form.places).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
              </select>
              ${icon('chevron')}
            </div>
          </div>
          ${field({ id: 'phone', label: t.form.phone, type: 'tel', optional: true, attrs: 'autocomplete="tel" inputmode="tel" maxlength="40"', t })}
        </div>

        <div class="field" data-field="note">
          <label for="f-note">${t.form.note} <span class="opt">(${t.form.optional})</span></label>
          <textarea id="f-note" name="note" rows="2" maxlength="600" aria-describedby="note-hint"></textarea>
          <p class="hint" id="note-hint">${t.form.noteHint}</p>
        </div>

        <div class="summary" data-summary aria-live="polite">
          <p class="summary-empty">${t.form.summaryEmpty}</p>
        </div>

        <div class="form-alert" data-form-alert role="alert" hidden>
          ${icon('alert')}
          <div>
            <p data-form-alert-text></p>
            <div class="form-alert-actions" data-form-alert-actions hidden>
              <button type="submit" class="btn btn-dark btn-sm">${t.errors.retry}</button>
              <a class="btn btn-ghost btn-sm" data-whatsapp-fallback href="https://wa.me/${CONTACT.whatsapp}" rel="noopener">${icon('whatsapp')}<span>${t.errors.whatsapp}</span></a>
            </div>
          </div>
        </div>

        <button class="btn btn-primary btn-lg btn-block" type="submit" data-submit>
          <span class="spinner" aria-hidden="true"></span>
          <span data-submit-label>${t.form.submit}</span>
        </button>
        <p class="disclaimer">${t.form.disclaimer}</p>
      </form>

      <div class="success" data-success tabindex="-1" hidden>
        <svg class="success-mark" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="25"/><path d="M17 29l7.5 7.5L40 21"/></svg>
        <h3>${t.success.title}</h3>
        <p class="success-ref">${t.success.ref}: <strong data-success-ref></strong></p>
        <p data-success-body></p>
        <p class="success-total" data-success-total></p>
        <div class="success-actions">
          <a class="btn btn-primary" href="https://wa.me/${CONTACT.whatsapp}" rel="noopener">${icon('whatsapp')}<span>${t.success.whatsapp}</span></a>
          <button type="button" class="btn btn-ghost" data-again>${t.success.again}</button>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="faq" class="section faq">
  <div class="container faq-grid">
    <h2>${t.faq.title}</h2>
    <div class="faq-list reveal">
      ${t.faq.items.map((f) => `<details class="faq-item"><summary><span>${f.q}</span>${icon('chevron')}</summary><div class="faq-a"><p>${f.a}</p></div></details>`).join('')}
    </div>
  </div>
</section>
</main>

<footer class="site-footer">
  <div class="container footer-grid">
    <div>
      <a class="brand brand-footer" href="${homeHref}" aria-label="${t.nav.home}">
        <span class="brand-mark">${icon('wind')}</span>
        <span class="brand-name">Meltemi <span>Rentals</span></span>
      </a>
      <p>${t.footer.tagline}</p>
      <p class="footer-hours">${icon('clock')}${t.footer.hours}</p>
    </div>
    <div>
      <h2 class="footer-title">${t.footer.contact}</h2>
      <ul class="footer-contact">
        <li><a href="tel:${CONTACT.phone}">${icon('phone')}<span><small>${t.footer.call}</small>${CONTACT.phoneLabel}</span></a></li>
        <li><a href="https://wa.me/${CONTACT.whatsapp}" rel="noopener">${icon('whatsapp')}<span><small>${t.footer.whatsapp}</small>${CONTACT.whatsappLabel}</span></a></li>
        <li><a href="mailto:${CONTACT.email}">${icon('mail')}<span><small>${t.footer.email}</small>${CONTACT.email}</span></a></li>
        <li><a href="${CONTACT.mapsUrl}" rel="noopener">${icon('pin')}<span><small>${t.footer.map}</small>${t.footer.address}</span></a></li>
      </ul>
    </div>
  </div>
  <div class="container">
    <details class="credits">
      <summary>${t.photos.credits}${icon('chevron')}</summary>
      <p>${t.photos.creditsLead}</p>
      <ul>
        ${Object.entries(PHOTOS).map(([k, p]) => `<li><a href="${p.page}" rel="noopener">${t.photos.names[k]}</a>, ${attr(p.author)}, ${p.licenseUrl ? `<a href="${p.licenseUrl}" rel="noopener license">${p.license}</a>` : p.license}</li>`).join('')}
      </ul>
    </details>
  </div>
  <div class="container footer-bottom">
    <p>© 2026 ${t.footer.rights}</p>
    <a class="lang-switch" href="${otherHref}" hreflang="${other.lang}" lang="${other.lang}">${icon('globe')}<span>${t.nav.switchTo}</span></a>
  </div>
</footer>

<div class="sticky-bar" data-sticky aria-hidden="true">
  <a class="btn btn-primary" href="#book" tabindex="-1">${t.sticky.book}</a>
  <a class="icon-btn icon-btn-lg" href="https://wa.me/${CONTACT.whatsapp}" rel="noopener" tabindex="-1" aria-label="${t.sticky.whatsapp}">${icon('whatsapp')}</a>
  <a class="icon-btn icon-btn-lg" href="tel:${CONTACT.phone}" tabindex="-1" aria-label="${t.sticky.call}">${icon('phone')}</a>
</div>

<script>window.MR=${JSON.stringify(clientData).replace(/</g, '\\u003c')};</script>
<script>${jsText}</script>
</body>
</html>`;
}
