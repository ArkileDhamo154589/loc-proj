(function () {
  'use strict';

  var MR = window.MR;
  var t = MR.t;
  var lang = MR.lang;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function money(n) {
    var num = Math.round(n).toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB');
    return lang === 'el' ? num + '€' : '€' + num;
  }
  function fill(s, vars) {
    return s.replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? vars[k] : m; });
  }
  function daysLabel(n) {
    return n + ' ' + (n === 1 ? t.calc.dayOne : t.calc.dayMany);
  }
  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(key) || 'null');
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { return null; }
  }
  function findCar(id) {
    for (var i = 0; i < MR.fleet.length; i++) if (MR.fleet[i].id === id) return MR.fleet[i];
    return null;
  }

  // Counts a number up/down inside an element, formatted as money.
  function tween(el, to) {
    var from = Number(el.getAttribute('data-value') || to);
    el.setAttribute('data-value', to);
    if (reduceMotion || from === to) { el.textContent = money(to); return; }
    var start = null;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / 380);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = money(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Language suggestion ---------- */
  (function () {
    var bar = $('[data-lang-suggest]');
    if (!bar || store('mr-lang-dismissed')) return;
    var langs = navigator.languages || [navigator.language || ''];
    var prefersGreek = langs.some(function (l) { return /^el\b/i.test(l); });
    if ((lang === 'el' && !prefersGreek) || (lang === 'en' && prefersGreek)) bar.hidden = false;
    $('[data-lang-dismiss]', bar).addEventListener('click', function () {
      bar.hidden = true;
      store('mr-lang-dismissed', true);
    });
  })();

  /* ---------- Price calculator ---------- */
  (function () {
    var section = $('[data-calc]');
    if (!section) return;
    var range = $('#calc-days', section);
    var out = $('[data-days-out]', section);
    var mini = MR.fleet[0];
    var typ = MR.typical;

    function update(days) {
      days = Math.max(1, Math.min(14, days));
      range.value = days;
      range.style.setProperty('--fill', ((days - 1) / 13) * 100 + '%');
      out.textContent = daysLabel(days);
      $$('[data-step]', section).forEach(function (b) {
        b.disabled = (b.getAttribute('data-step') === '-1' && days === 1) || (b.getAttribute('data-step') === '1' && days === 14);
      });

      $$('.bill-line', section).forEach(function (li) {
        var amt = $('[data-amt]', li);
        if (!amt) return;
        var rate = Number(li.getAttribute('data-rate'));
        var perDay = li.getAttribute('data-per-day') === '1';
        tween(amt, perDay ? rate * days : rate);
      });

      var adTotal = typ.base * days;
      typ.perDay.forEach(function (l) { adTotal += l.amount * days; });
      typ.oneOff.forEach(function (l) { adTotal += l.amount; });
      var ourTotal = mini.price * days;

      tween($('[data-total="ad"]', section), adTotal);
      tween($('[data-total="ours"]', section), ourTotal);
      $('[data-bar="ad"]', section).style.setProperty('--w', 1);
      $('[data-bar="ours"]', section).style.setProperty('--w', (ourTotal / adTotal).toFixed(3));
      $('[data-perday="ad"]', section).textContent = fill(t.calc.perDayApprox, { price: money(adTotal / days) });
      $('[data-perday="ours"]', section).textContent = fill(t.calc.perDayApprox, { price: money(ourTotal / days) });
      $('[data-saving]', section).innerHTML = fill(t.calc.saving, {
        days: daysLabel(days),
        diff: '<strong>' + money(adTotal - ourTotal) + '</strong>',
      });

      out.classList.remove('bump');
      void out.offsetWidth;
      out.classList.add('bump');
    }

    range.addEventListener('input', function () { update(Number(range.value)); });
    $$('[data-step]', section).forEach(function (btn) {
      btn.addEventListener('click', function () {
        update(Number(range.value) + Number(btn.getAttribute('data-step')));
      });
    });
    range.style.setProperty('--fill', ((Number(range.value) - 1) / 13) * 100 + '%');
    $$('[data-total],[data-amt]', section).forEach(function (el) {
      el.setAttribute('data-value', el.textContent.replace(/[^\d]/g, ''));
    });

    // Content is fully rendered from the start; this only adds the "stamping" emphasis once.
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          section.classList.add('is-live');
          io.disconnect();
        }
      }, { threshold: 0.35 });
      io.observe($('.calc-grid', section));
    }
  })();

  /* ---------- Copy the five questions ---------- */
  (function () {
    var btn = $('[data-copy-questions]');
    if (!btn) return;
    var label = $('span', btn);
    btn.addEventListener('click', function () {
      var text = t.questions.copyHeader + '\n' + t.questions.items.map(function (q, i) { return (i + 1) + '. ' + q.q; }).join('\n');
      var done = function () {
        label.textContent = t.questions.copied;
        btn.classList.add('is-done');
        setTimeout(function () { label.textContent = t.questions.copy; btn.classList.remove('is-done'); }, 2200);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else fallback();
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { /* nothing to do */ }
        document.body.removeChild(ta);
      }
    });
  })();

  /* ---------- Booking form ---------- */
  var form = $('[data-form]');
  if (!form) return;
  var DRAFT_KEY = 'mr-draft';
  var startedAt = Date.now();
  var submitBtn = $('[data-submit]', form);
  var submitLabel = $('[data-submit-label]', form);
  var alertBox = $('[data-form-alert]', form);
  var alertText = $('[data-form-alert-text]', form);
  var alertActions = $('[data-form-alert-actions]', form);
  var summary = $('[data-summary]', form);
  var success = $('[data-success]');
  var pickup = form.elements.pickup;
  var dropoff = form.elements.dropoff;

  function isoToday(offsetDays) {
    var d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }
  function addDays(iso, n) {
    var p = iso.split('-').map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return d.toISOString().slice(0, 10);
  }
  function daysBetween(a, b) {
    var x = a.split('-').map(Number);
    var y = b.split('-').map(Number);
    return Math.round((Date.UTC(y[0], y[1] - 1, y[2]) - Date.UTC(x[0], x[1] - 1, x[2])) / 86400000);
  }
  function values() {
    var checked = $('input[name="category"]:checked', form);
    return {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      pickup: pickup.value,
      dropoff: dropoff.value,
      category: checked ? checked.value : '',
      place: form.elements.place.value,
      note: form.elements.note.value.trim(),
    };
  }

  pickup.min = isoToday();
  dropoff.min = isoToday(1);

  // Restore an unsent draft (e.g. after a dropped connection or accidental reload).
  var draft = store(DRAFT_KEY);
  if (draft) {
    ['name', 'email', 'phone', 'place', 'note'].forEach(function (k) { if (draft[k]) form.elements[k].value = draft[k]; });
    if (draft.pickup && draft.pickup >= pickup.min) pickup.value = draft.pickup;
    if (draft.dropoff && pickup.value && draft.dropoff > pickup.value) dropoff.value = draft.dropoff;
    if (draft.category) setCategory(draft.category, false);
  }

  function setCategory(id, animate) {
    var input = $('input[name="category"][value="' + id + '"]', form);
    if (!input) return;
    input.checked = true;
    clearError('category');
    if (animate) {
      var opt = input.closest('.cat-opt');
      opt.classList.remove('is-picked');
      void opt.offsetWidth;
      opt.classList.add('is-picked');
    }
    renderSummary();
  }

  function renderSummary() {
    var v = values();
    var car = findCar(v.category);
    var days = v.pickup && v.dropoff ? daysBetween(v.pickup, v.dropoff) : 0;
    if (!car || days < 1) {
      summary.classList.remove('is-filled');
      summary.innerHTML = '<p class="summary-empty">' + t.form.summaryEmpty + '</p>';
      return;
    }
    summary.classList.add('is-filled');
    summary.innerHTML =
      '<div class="summary-row"><span class="summary-calc">' + t.cars[car.id] + ', ' +
      fill(t.form.summary, { days: daysLabel(days), price: money(car.price) }) +
      '</span><span class="summary-total">' + money(car.price * days) + '</span></div>' +
      '<p class="summary-final"><svg class="i" aria-hidden="true"><use href="#i-check"/></svg><span>' + t.form.summaryFinal + '</span></p>';
  }

  pickup.addEventListener('change', function () {
    if (!pickup.value) return;
    dropoff.min = addDays(pickup.value, 1);
    // Suggest a week-long rental when the return date is empty or no longer valid.
    if (!dropoff.value || dropoff.value <= pickup.value) dropoff.value = addDays(pickup.value, 7);
    clearError('pickup');
    clearError('dropoff');
  });

  form.addEventListener('input', function (e) {
    if (e.target.name && e.target.name !== 'website') clearError(e.target.name);
    renderSummary();
    var v = values();
    store(DRAFT_KEY, v);
  });
  form.addEventListener('change', renderSummary);

  // "Request this car" buttons preselect the category before scrolling to the form.
  $$('[data-choose]').forEach(function (a) {
    a.addEventListener('click', function () {
      setCategory(a.getAttribute('data-choose'), true);
      store(DRAFT_KEY, values());
    });
  });

  function fieldEl(name) { return $('[data-field="' + name + '"]', form); }

  function showError(name, code) {
    var wrap = fieldEl(name);
    var msg = t.errors[name] && t.errors[name][code];
    if (!wrap || !msg) return;
    wrap.classList.add('is-invalid');
    wrap.classList.remove('shake');
    void wrap.offsetWidth;
    wrap.classList.add('shake');
    var p = $('.field-error', wrap);
    p.textContent = msg;
    p.hidden = false;
    var input = $('input, select', wrap);
    if (input) input.setAttribute('aria-invalid', 'true');
  }
  function clearError(name) {
    var wrap = fieldEl(name);
    if (!wrap || !wrap.classList.contains('is-invalid')) return;
    wrap.classList.remove('is-invalid', 'shake');
    $('.field-error', wrap).hidden = true;
    $$('[aria-invalid]', wrap).forEach(function (el) { el.removeAttribute('aria-invalid'); });
  }

  function validate(v) {
    var errors = {};
    if (v.name.length < 2) errors.name = 'required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) errors.email = v.email ? 'invalid' : 'required';
    if (v.phone && !/^[+()\d\s.-]{6,40}$/.test(v.phone)) errors.phone = 'invalid';
    if (!v.pickup) errors.pickup = 'required';
    else if (v.pickup < isoToday()) errors.pickup = 'past';
    if (!v.dropoff) errors.dropoff = 'required';
    else if (v.pickup && !errors.pickup) {
      var d = daysBetween(v.pickup, v.dropoff);
      if (d < 1) errors.dropoff = 'beforePickup';
      else if (d > MR.maxDays) errors.dropoff = 'tooLong';
    }
    if (!v.category) errors.category = 'required';
    return errors;
  }

  function applyErrors(errors) {
    var names = Object.keys(errors);
    names.forEach(function (n) { showError(n, errors[n]); });
    var first = fieldEl(names[0]);
    if (first) {
      var focusable = $('input, select, textarea', first);
      first.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      if (focusable) setTimeout(function () { focusable.focus({ preventScroll: true }); }, reduceMotion ? 0 : 350);
    }
  }

  function whatsappLink(v) {
    var text = fill(t.whatsappText, {
      car: t.cars[v.category] || '-',
      pickup: v.pickup || '-',
      dropoff: v.dropoff || '-',
      place: t.form.places[v.place] || '-',
      name: v.name || '-',
    });
    return 'https://wa.me/' + MR.contact.whatsapp + '?text=' + encodeURIComponent(text);
  }

  function showAlert(message, withActions) {
    alertText.textContent = message;
    alertActions.hidden = !withActions;
    if (withActions) $('[data-whatsapp-fallback]', form).href = whatsappLink(values());
    alertBox.hidden = false;
  }

  function setLoading(on) {
    submitBtn.classList.toggle('is-loading', on);
    submitBtn.setAttribute('aria-busy', on ? 'true' : 'false');
    submitLabel.textContent = on ? t.form.sending : t.form.submit;
    clearTimeout(slowTimer);
    // Saving to the Sheet and sending the emails can take a few seconds: say what is happening.
    if (on) slowTimer = setTimeout(function () { submitLabel.textContent = t.form.sendingSlow; }, 2500);
  }
  var slowTimer = null;

  var sending = false;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    alertBox.hidden = true;
    var v = values();
    var errors = validate(v);
    if (Object.keys(errors).length) {
      applyErrors(errors);
      return;
    }

    if (navigator.onLine === false) {
      showAlert(t.errors.network, true);
      return;
    }

    sending = true;
    setLoading(true);
    var payload = Object.assign({}, v, { lang: lang, website: form.elements.website.value, startedAt: startedAt });
    var controller = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, 60000);

    fetch('/api/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined,
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) { return { status: res.status, body: body }; });
      })
      .then(function (r) {
        if (r.status === 200 && r.body.ok) return onSuccess(v, r.body);
        if (r.status === 422 && r.body.fields) {
          showAlert(t.errors.summary, false);
          return applyErrors(r.body.fields);
        }
        showAlert(t.errors.server, true);
      })
      .catch(function () {
        showAlert(t.errors.network, true);
      })
      .then(function () {
        clearTimeout(timer);
        sending = false;
        setLoading(false);
      });
  });

  function onSuccess(v, body) {
    store(DRAFT_KEY, null);
    $('[data-success-ref]', success).textContent = body.ref;
    $('[data-success-body]', success).textContent = fill(body.mailed === false ? t.success.bodyNoMail : t.success.body, { email: v.email });
    var car = findCar(v.category);
    $('[data-success-total]', success).textContent = body.total
      ? t.cars[v.category] + ', ' + daysLabel(body.days) + ': ' + money(body.total)
      : (car ? t.cars[car.id] : '');
    $('[data-demo-notice]', success).hidden = !body.demo;
    var dash = $('[data-dashboard]', success);
    dash.hidden = !body.demo;
    if (body.demo) renderCalendar(v, body);
    form.hidden = true;
    success.hidden = false;
    success.focus({ preventScroll: true });
    success.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }

  // Mock booking calendar for the dashboard proposal, with the visitor's request in its real row.
  function renderCalendar(v, body) {
    var cal = $('[data-cal]', success);
    var d = t.dashboard;
    var sample = {
      mini: [{ s: 3, l: 4, n: 'K. Pappa', st: 'confirmed' }],
      auto: [{ s: 0, l: 5, n: 'J. Müller', st: 'confirmed' }],
      cabrio: [{ s: 1, l: 3, n: 'L. Rossi', st: 'pickup' }],
      suv: [{ s: 2, l: 5, n: 'M. de Vries', st: 'confirmed' }],
    };
    var span = Math.max(1, Math.min(7, body.days || 1));
    var start = v.pickup ? v.pickup.split('-').map(Number) : null;
    var fmt = new Intl.DateTimeFormat(lang === 'el' ? 'el-GR' : 'en-GB', { weekday: 'short', timeZone: 'UTC' });
    var html = '<span class="cal-corner"></span>';
    for (var i = 0; i < 7; i++) {
      var date = start ? new Date(Date.UTC(start[0], start[1] - 1, start[2] + i)) : null;
      html += '<span class="cal-day">' + (date ? fmt.format(date).replace('.', '') + '<b>' + date.getUTCDate() + '</b>' : i + 1) + '</span>';
    }
    MR.fleet.forEach(function (car) {
      var bars = (sample[car.id] || []).filter(function (b) { return car.id !== v.category || b.s >= span; });
      if (car.id === v.category) bars.unshift({ s: 0, l: span, n: v.name.split(' ')[0] + ' · ' + body.ref, st: 'new' });
      html += '<span class="cal-car">' + t.cars[car.id] + '</span><span class="cal-track">';
      bars.forEach(function (b, k) {
        html += '<span class="cal-bar st-' + b.st + '" style="left:' + (b.s / 7 * 100) + '%;width:calc(' + (b.l / 7 * 100) + '% - 4px);--k:' + k + '">' +
          (b.st === 'new' ? '<em>' + d.newRequest + '</em>' : '') + '<span></span></span>';
      });
      html += '</span>';
    });
    cal.innerHTML = html;
    // Names are set as text so visitor input is never parsed as HTML.
    var labels = $$('.cal-bar > span', cal);
    var idx = 0;
    MR.fleet.forEach(function (car) {
      var bars = (sample[car.id] || []).filter(function (b) { return car.id !== v.category || b.s >= span; });
      if (car.id === v.category) bars.unshift({ n: v.name.split(' ')[0] + ' · ' + body.ref });
      bars.forEach(function (b) { labels[idx++].textContent = b.n; });
    });
  }

  $('[data-again]', success).addEventListener('click', function () {
    form.reset();
    startedAt = Date.now();
    renderSummary();
    success.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });

  renderSummary();

  /* ---------- Sticky mobile bar ---------- */
  (function () {
    var bar = $('[data-sticky]');
    var hero = $('[data-hero-cta]');
    var book = $('#book');
    if (!bar || !hero || !('IntersectionObserver' in window)) return;
    var heroVisible = true;
    var bookVisible = false;
    function sync() {
      var show = !heroVisible && !bookVisible;
      bar.classList.toggle('is-visible', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
      $$('a', bar).forEach(function (a) { a.tabIndex = show ? 0 : -1; });
    }
    new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; sync(); }).observe(hero);
    new IntersectionObserver(function (en) { bookVisible = en[0].isIntersecting; sync(); }, { rootMargin: '0px 0px -20% 0px' }).observe(book);
  })();
  /* ---------- Back to top ---------- */
  (function () {
    var btn = $('[data-to-top]');
    if (!btn) return;
    var ticking = false;
    function sync() {
      btn.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.9);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(sync); }
    }, { passive: true });
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      var brand = $('.brand');
      if (brand) brand.focus({ preventScroll: true });
    });
    sync();
  })();
})();
