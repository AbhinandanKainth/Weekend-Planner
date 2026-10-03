/* Weekend Planner app. Vanilla JS, no dependencies. */
(function () {
  'use strict';

  var STORE_KEY = 'wp:v1';
  var DAYS = ['sat', 'sun'];
  var GROUPS = ['all', 'friends', 'solo', 'couple', 'family', 'elders'];
  var GROUP_EMOJI = { all: '🙌', friends: '👯', solo: '🎧', couple: '💑', family: '👨‍👩‍👧', elders: '👵' };
  var CATS = ['heritage', 'nature', 'food', 'culture', 'shopping', 'adventure', 'nightlife', 'kids', 'wellness', 'spiritual', 'daytrip'];
  var CAT_EMOJI = { heritage: '🏛️', nature: '🌳', food: '🍜', culture: '🎭', shopping: '🛍️', adventure: '🧗', nightlife: '🎶', kids: '🧸', wellness: '🧘', spiritual: '🛕', daytrip: '🚗' };
  var DEFAULT_TIME = { morning: '09:00', afternoon: '13:00', evening: '17:30', night: '20:00', anytime: '11:00' };
  var DAY_HI = { Mon: 'सोम', Tue: 'मंगल', Wed: 'बुध', Thu: 'गुरु', Fri: 'शुक्र', Sat: 'शनि', Sun: 'रवि' };

  var main = document.getElementById('main');
  var citySelect = document.getElementById('city-select');
  var toastEl = document.getElementById('toast');

  /* ---------- State ---------- */
  var state = load();
  var ui = { weekendOffset: initialOffset(), filters: defaultFilters(), route: null, sharedWeekend: null };

  function defaults() {
    return { lang: 'en', theme: 'auto', textSize: 'm', city: null, group: 'all', people: 2, plans: {} };
  }
  function defaultFilters() {
    return { q: '', budget: 'any', cat: 'all', tod: 'any', indoor: false, kid: false, elder: false, sort: 'reco' };
  }
  function load() {
    var s = defaults();
    try {
      var raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      Object.keys(raw).forEach(function (k) { s[k] = raw[k]; });
    } catch (e) { /* storage unavailable */ }
    if (GROUPS.indexOf(s.group) < 0) s.group = 'all';
    return s;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  /* ---------- Helpers ---------- */
  function t(key, vars) {
    var dict = window.I18N[state.lang] || window.I18N.en;
    var s = dict[key] != null ? dict[key] : (window.I18N.en[key] != null ? window.I18N.en[key] : key);
    if (vars) Object.keys(vars).forEach(function (k) { s = s.replace('{' + k + '}', vars[k]); });
    return s;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function locale() { return state.lang === 'hi' ? 'hi-IN' : 'en-IN'; }
  function inr(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
  function price(n, withApprox) {
    if (!n) return '<span class="price free">' + esc(t('free')) + '</span>';
    return '<span class="price">' + (withApprox === false ? '' : '~') + inr(n) + '</span>';
  }
  function hrs(h) { return t('duration', { h: (Math.round(h * 10) / 10).toLocaleString(locale()) }); }
  function nameOf(a) { return state.lang === 'hi' && a.nameHi ? a.nameHi : a.name; }
  function altName(a) { return state.lang === 'hi' && a.nameHi ? a.name : ''; }
  function cityName(c) { return state.lang === 'hi' && c.nameHi ? c.nameHi : c.name; }
  function cityMeta(id) { return WP.cities.filter(function (c) { return c.id === id; })[0]; }
  function mapsUrl(a, city) {
    var q = a.mapsQuery || (a.name + ', ' + (city ? city.name : ''));
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  }
  function toMin(hhmm) { var p = String(hhmm || '00:00').split(':'); return (+p[0] || 0) * 60 + (+p[1] || 0); }
  function fromMin(m) {
    m = Math.max(0, Math.min(23 * 60 + 30, Math.round(m / 15) * 15));
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }
  function fmtTime(hhmm) {
    var p = hhmm.split(':'); var d = new Date(2026, 0, 1, +p[0], +p[1]);
    return d.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
  }
  // From Sunday noon onward, 'this weekend' is mostly over, so open on the next one.
  function initialOffset() { var n = new Date(); return n.getDay() === 0 && n.getHours() >= 12 ? 1 : 0; }
  function activeWeekend() {
    return (ui.route && ui.route.view === 'shared' && ui.sharedWeekend) || weekendDates(ui.weekendOffset);
  }
  function ymd(d) { return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); }
  function weekendDates(offset) {
    var now = new Date(); now.setHours(12, 0, 0, 0);
    var day = now.getDay();
    var sat = new Date(now);
    if (day === 0) sat.setDate(now.getDate() - 1);
    else sat.setDate(now.getDate() + (6 - day));
    sat.setDate(sat.getDate() + 7 * (offset || 0));
    var sun = new Date(sat); sun.setDate(sat.getDate() + 1);
    return { sat: sat, sun: sun };
  }
  function fmtDate(d, opts) { return d.toLocaleDateString(locale(), opts || { weekday: 'short', day: 'numeric', month: 'short' }); }
  function monthName(m) { return new Date(2026, m - 1, 1).toLocaleDateString(locale(), { month: 'short' }); }
  function monthsLabel(months) {
    if (!months || !months.length) return '';
    var set = {}; months.forEach(function (m) { set[m] = 1; });
    var starts = months.filter(function (m) { return !set[((m + 10) % 12) + 1]; });
    if (starts.length === 1) {
      var end = starts[0]; while (set[(end % 12) + 1] && ((end % 12) + 1) !== starts[0]) end = (end % 12) + 1;
      return end === starts[0] ? monthName(end) : monthName(starts[0]) + '–' + monthName(end);
    }
    return months.map(monthName).join(', ');
  }
  function inSeason(a) {
    if (!a.months || !a.months.length) return true;
    return a.months.indexOf(weekendDates(ui.weekendOffset).sat.getMonth() + 1) >= 0;
  }
  function closedLabel(arr) {
    return arr.map(function (d) { return state.lang === 'hi' ? (DAY_HI[d] || d) : d; }).join(', ');
  }
  function dayLabel(d, short) { return t(d + (short ? 'Short' : '')); }

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(msg, actionLabel, action) {
    clearTimeout(toastTimer);
    toastEl.innerHTML = '<span>' + esc(msg) + '</span>' + (actionLabel ? '<button type="button">' + esc(actionLabel) + '</button>' : '');
    if (actionLabel) toastEl.querySelector('button').onclick = function () { action(); hideToast(); };
    toastEl.classList.add('show');
    toastTimer = setTimeout(hideToast, actionLabel ? 10000 : 2800);
  }
  function hideToast() { toastEl.classList.remove('show'); }

  /* ---------- City data loading ---------- */
  var loading = {};
  function loadCity(id) {
    if (WP.data[id]) return Promise.resolve(WP.data[id]);
    if (loading[id]) return loading[id];
    loading[id] = new Promise(function (resolve, reject) {
      (WP._waiters[id] = WP._waiters[id] || []).push(resolve);
      var s = document.createElement('script');
      s.src = 'data/' + id + '.js';
      s.async = true;
      s.onerror = function () { delete loading[id]; s.remove(); reject(new Error('load failed')); };
      document.head.appendChild(s);
    });
    return loading[id];
  }
  function actMap(city) {
    if (!city._map) { city._map = {}; city.activities.forEach(function (a) { city._map[a.id] = a; }); }
    return city._map;
  }

  /* ---------- Plans (My weekend) ---------- */
  function myPlan(cityId) {
    var p = state.plans[cityId];
    if (!p || !p.sat || !p.sun) p = state.plans[cityId] = { sat: [], sun: [] };
    return p;
  }
  function planCount(cityId) { var p = state.plans[cityId]; return p ? (p.sat || []).length + (p.sun || []).length : 0; }
  function sortDay(list) { list.sort(function (a, b) { return toMin(a.time) - toMin(b.time); }); }
  function nextTime(list, a, city) {
    if (!list.length) return DEFAULT_TIME[a.bestTime] || '10:00';
    var last = list[list.length - 1];
    var la = actMap(city)[last.id];
    var start = toMin(last.time) + Math.round(((la && la.duration) || 1.5) * 60) + 30;
    var pref = toMin(DEFAULT_TIME[a.bestTime] || '00:00');
    return fromMin(Math.max(start, a.bestTime === 'anytime' ? 0 : pref));
  }
  function addToDay(city, actId, day) {
    var plan = myPlan(city.id);
    var a = actMap(city)[actId];
    if (!a) return;
    if (plan[day].some(function (s) { return s.id === actId; })) { toast(t('alreadyAdded', { day: dayLabel(day) })); return; }
    plan[day].push({ id: actId, time: nextTime(plan[day], a, city) });
    sortDay(plan[day]);
    save();
    toast(t('added', { day: dayLabel(day) }), t('tabMy'), function () { go('#/' + city.id + '/my'); });
    updateCountBadge(city.id);
  }
  function itineraryToPlan(it) {
    var p = { sat: [], sun: [] };
    it.days.forEach(function (d) {
      var key = d.day === 'sun' ? 'sun' : 'sat';
      d.slots.forEach(function (s) { var x = { id: s.activityId, time: s.time }; if (s.note) x.note = s.note; p[key].push(x); });
      sortDay(p[key]);
    });
    return p;
  }
  function isEmpty(p) { return !p || (!(p.sat || []).length && !(p.sun || []).length); }
  function applyPlan(cityId, p, doneMsg) {
    var existing = state.plans[cityId];
    var backup = !isEmpty(existing) && JSON.stringify(existing) !== JSON.stringify(p) ? JSON.parse(JSON.stringify(existing)) : null;
    state.plans[cityId] = JSON.parse(JSON.stringify(p));
    save();
    go('#/' + cityId + '/my');
    if (backup) toast(t('replacedPlan'), t('undo'), function () { state.plans[cityId] = backup; save(); rerender(); });
    else toast(doneMsg);
  }
  function planStats(city, p) {
    var map = actMap(city), cost = 0, h = { sat: 0, sun: 0 };
    DAYS.forEach(function (d) {
      (p[d] || []).forEach(function (s) { var a = map[s.id]; if (a) { cost += a.cost || 0; h[d] += a.duration || 0; } });
    });
    return { cost: cost, hours: h };
  }

  /* Share encoding (URL-safe): sat items ~ sun items, each "activityId.HHMM", comma separated */
  function encodePlan(p, sat) {
    return DAYS.map(function (d) {
      return (p[d] || []).map(function (s) { return s.id + '.' + s.time.replace(':', ''); }).join(',');
    }).join('~') + (sat ? '~' + ymd(sat) : '');
  }
  function decodePlan(str, city) {
    try {
      var map = actMap(city), parts = decodeURIComponent(str).split('~'), p = { sat: [], sun: [] }, ok = true;
      DAYS.forEach(function (d, i) {
        (parts[i] || '').split(',').filter(Boolean).forEach(function (tok) {
          var m = /^([a-z0-9-]+)\.(\d{2})(\d{2})$/.exec(tok);
          if (m && map[m[1]]) p[d].push({ id: m[1], time: m[2] + ':' + m[3] }); else ok = false;
        });
        sortDay(p[d]);
      });
      var dm = /^(\d{4})(\d{2})(\d{2})$/.exec(parts[2] || ''), sat = null;
      if (dm) { sat = new Date(+dm[1], +dm[2] - 1, +dm[3], 12); if (sat.getDay() !== 6) sat = null; }
      return { plan: p, partial: !ok, sat: sat };
    } catch (e) { return null; }
  }
  function baseUrl() { return location.href.split('#')[0]; }
  function shareUrl(cityId, p) { return baseUrl() + '#/' + cityId + '/shared/' + encodePlan(p, activeWeekend().sat); }
  function shareText(city, p) {
    var map = actMap(city), w = activeWeekend(), lines = [];
    lines.push(t('shareIntro', { city: cityName(city) }) + ' (' + fmtDate(w.sat) + ' – ' + fmtDate(w.sun) + ')');
    DAYS.forEach(function (d) {
      if (!p[d].length) return;
      lines.push('', '*' + dayLabel(d).toUpperCase() + '*');
      p[d].forEach(function (s) {
        var a = map[s.id]; if (!a) return;
        lines.push(fmtTime(s.time) + ' · ' + nameOf(a) + ' (' + a.area + ')' + (a.cost ? ' ~' + inr(a.cost) : ' · ' + t('free')));
        if (s.note) lines.push('   ↳ ' + s.note);
      });
    });
    var st = planStats(city, p);
    lines.push('', t('estCost') + ': ~' + inr(st.cost) + ' ' + t('perPerson') + ' (' + t('budgetNote') + ')');
    return lines.join('\n');
  }
  function doShare(kind, city, p) {
    var url = shareUrl(city.id, p), text = shareText(city, p);
    if (kind === 'native' && navigator.share) {
      navigator.share({ title: t('appName'), text: text, url: url }).catch(function () { /* cancelled */ });
    } else if (kind === 'wa') {
      window.open('https://wa.me/?text=' + encodeURIComponent(text + '\n\n' + url), '_blank', 'noopener');
    } else if (kind === 'copy') {
      copy(url).then(function () { toast(t('copied')); });
    }
  }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve) {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ }
      ta.remove(); resolve();
    });
  }

  /* ---------- Calendar (.ics) ---------- */
  function icsEscape(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); }
  function icsFold(line) {
    var out = [], s = line;
    while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74); }
    out.push(s); return out.join('\r\n');
  }
  function icsDate(date, hhmm, addMin) {
    // Times are IST (UTC+5:30); convert to UTC.
    var p = hhmm.split(':');
    var utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), +p[0], +p[1]) - 330 * 60000 + (addMin || 0) * 60000;
    return new Date(utc).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
  function downloadIcs(city, p) {
    var map = actMap(city), w = activeWeekend(), stamp = icsDate(new Date(), '00:00');
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Weekend Planner//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    DAYS.forEach(function (d) {
      p[d].forEach(function (s, i) {
        var a = map[s.id]; if (!a) return;
        L.push('BEGIN:VEVENT',
          'UID:' + city.id + '-' + d + '-' + i + '-' + a.id + '-' + w[d].toISOString().slice(0, 10) + '@weekend-planner',
          'DTSTAMP:' + stamp,
          'DTSTART:' + icsDate(w[d], s.time),
          'DTEND:' + icsDate(w[d], s.time, Math.round((a.duration || 1) * 60)),
          icsFold('SUMMARY:' + icsEscape(a.name)),
          icsFold('LOCATION:' + icsEscape(a.area + ', ' + city.name)),
          icsFold('DESCRIPTION:' + icsEscape((s.note ? s.note + '\n' : '') + (a.tip ? a.tip + '\n' : '') + (a.timing ? 'Timing: ' + a.timing + '\n' : '') + mapsUrl(a, city))),
          'END:VEVENT');
      });
    });
    L.push('END:VCALENDAR');
    var blob = new Blob([L.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'weekend-' + city.id + '-' + w.sat.toISOString().slice(0, 10) + '.ics';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 2000);
  }

  /* ---------- Routing ---------- */
  function parseRoute() {
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean);
    if (!parts.length) return { view: 'home' };
    var r = { city: parts[0], view: 'plans' };
    if (parts[1] === 'explore') r.view = 'explore';
    else if (parts[1] === 'my') r.view = 'my';
    else if (parts[1] === 'plan' && parts[2]) { r.view = 'plan'; r.planId = parts[2]; }
    else if (parts[1] === 'shared' && parts[2] != null) { r.view = 'shared'; r.data = parts.slice(2).join('/'); }
    else if (parts[1]) r.view = 'notfound';
    return r;
  }
  function go(hash) { if (location.hash === hash) route(true); else location.hash = hash; }

  var lastKey = null;
  function route(force) {
    var r = parseRoute();
    var key = (r.city || '') + '|' + r.view + '|' + (r.planId || '') + '|' + (r.data || '');
    var navigated = key !== lastKey || force === true;
    lastKey = key;
    ui.route = r;
    if (r.view === 'home') { syncCitySelect(null); return paint(renderHome(), navigated); }
    if (!cityMeta(r.city)) return paint(renderNotFound(), navigated);
    if (state.city !== r.city) { state.city = r.city; save(); }
    syncCitySelect(r.city);
    if (!WP.data[r.city]) {
      paint(renderLoading(), navigated);
      loadCity(r.city).then(function () { if (parseRoute().city === r.city) route(true); })
        .catch(function () { if (parseRoute().city === r.city) paint(renderLoadError(r.city), false); });
      return;
    }
    var city = WP.data[r.city];
    var html;
    if (r.view === 'plans') html = renderPlans(city);
    else if (r.view === 'explore') html = renderExplore(city);
    else if (r.view === 'my') html = renderMy(city);
    else if (r.view === 'plan') html = renderPlanDetail(city, r.planId);
    else if (r.view === 'shared') html = renderShared(city, r.data);
    else html = renderNotFound();
    paint(html, navigated);
    document.title = cityName(city) + ' · ' + t('appName');
  }

  function paint(html, navigated) {
    var active = document.activeElement;
    var fkey = active && main.contains(active) ? active.getAttribute('data-fkey') : null;
    var selStart = fkey && active.selectionStart != null ? active.selectionStart : null;
    main.innerHTML = html;
    if (navigated) {
      window.scrollTo(0, 0);
      var h1 = main.querySelector('h1');
      if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
    } else if (fkey) {
      var el = main.querySelector('[data-fkey="' + fkey + '"]');
      if (el) { el.focus({ preventScroll: true }); if (selStart != null && el.setSelectionRange) { try { el.setSelectionRange(selStart, selStart); } catch (e) { /* ignore */ } } }
    }
    if (!ui.route || ui.route.view === 'home') document.title = t('appName') + ': ' + WP.cities.map(function (c) { return c.name; }).join(', ');
  }
  function rerender() { route(false); }

  /* ---------- Views ---------- */
  function renderHome() {
    var last = state.city && cityMeta(state.city);
    return '' +
      '<section class="hero">' +
        '<h1>' + esc(t('heroTitle')) + '</h1>' +
        '<p>' + esc(t('heroSub')) + '</p>' +
        (last ? '<p class="continue"><a class="btn btn-primary" href="#/' + last.id + (planCount(last.id) ? '/my' : '') + '">' + esc(t('lastCity')) + ' ' + esc(cityName(last)) + ' →</a></p>' : '') +
      '</section>' +
      '<h2>' + esc(t('pickCity')) + '</h2>' +
      '<ul class="city-grid">' + WP.cities.map(function (c) {
        return '<li><a class="city-card" href="#/' + c.id + '">' +
          '<span class="city-emoji" aria-hidden="true">' + c.emoji + '</span>' +
          '<span class="city-name">' + esc(cityName(c)) + '</span>' +
          '<span class="city-blurb">' + esc(state.lang === 'hi' ? c.blurbHi : c.blurb) + '</span>' +
          (planCount(c.id) ? '<span class="badge good">' + esc(t('tabMy')) + ': ' + planCount(c.id) + '</span>' : '') +
        '</a></li>';
      }).join('') + '</ul>' +
      '<section class="how" aria-labelledby="how-h"><h2 id="how-h">' + esc(t('howTitle')) + '</h2><ol>' +
        '<li>' + esc(t('how1')) + '</li><li>' + esc(t('how2')) + '</li><li>' + esc(t('how3')) + '</li>' +
      '</ol></section>';
  }

  function renderLoading() {
    return '<div class="loading" role="status" aria-live="polite"><h1 class="visually-hidden">' + esc(t('loading')) + '</h1>' +
      '<p class="muted">' + esc(t('loading')) + '</p><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>';
  }
  function renderLoadError(id) {
    var online = navigator.onLine !== false;
    return '<div class="empty" role="alert"><div class="big" aria-hidden="true">' + (online ? '🛠️' : '📶') + '</div><h1>' + esc(t(online ? 'loadErrorData' : 'loadError')) + '</h1>' +
      '<div class="btn-row" style="justify-content:center"><button class="btn btn-primary" data-action="retry" data-city="' + esc(id) + '">' + esc(t('retry')) + '</button>' +
      '<a class="btn" href="#/">' + esc(t('chooseAnother')) + '</a></div></div>';
  }
  function renderNotFound() {
    return '<div class="empty"><div class="big" aria-hidden="true">🧭</div><h1>' + esc(t('notFound')) + '</h1><a class="btn btn-primary" href="#/">' + esc(t('goHome')) + '</a></div>';
  }

  function cityHeader(city) {
    var w = weekendDates(ui.weekendOffset);
    return '' +
      '<div class="city-head"><div>' +
        '<h1>' + esc(cityName(city)) + '</h1>' +
        '<p class="city-tagline">' + esc(state.lang === 'hi' && city.taglineHi ? city.taglineHi : city.tagline) + '</p>' +
      '</div>' +
      '<div class="weekend-switch" role="group" aria-label="' + esc(t('weekendOf', { d: '' }).trim()) + '">' +
        [0, 1].map(function (o) {
          return '<button class="chip" data-action="weekend" data-offset="' + o + '" data-fkey="wk' + o + '" aria-pressed="' + (ui.weekendOffset === o) + '">' +
            esc(t(o ? 'nextWeekend' : 'thisWeekend')) + '</button>';
        }).join('') +
        '<span class="weekend-pill">📅 ' + esc(fmtDate(w.sat)) + ' – ' + esc(fmtDate(w.sun)) + '</span>' +
      '</div></div>' +
      (state.lang === 'hi' ? '<p class="note small">' + esc(t('hiPartial')) + '</p>' : '') +
      '<details class="info"><summary>ℹ️ ' + esc(t('cityInfo')) + '</summary><div class="info-grid">' +
        '<div><h3>🌦️ ' + esc(t('weather')) + '</h3><p>' + esc(city.weather) + '</p></div>' +
        '<div><h3>🚇 ' + esc(t('gettingAround')) + '</h3><p>' + esc(city.gettingAround) + '</p></div>' +
        '<div><h3>🛡️ ' + esc(t('safety')) + '</h3><p>' + esc(city.safety) + '</p></div>' +
      '</div></details>' +
      '<p class="label" id="who-l">' + esc(t('whoComing')) + '</p>' +
      '<div class="chip-group" role="group" aria-labelledby="who-l">' + GROUPS.map(function (g) {
        return '<button class="chip" data-action="group" data-group="' + g + '" data-fkey="g-' + g + '" aria-pressed="' + (state.group === g) + '">' +
          '<span aria-hidden="true">' + GROUP_EMOJI[g] + '</span> ' + esc(t('g_' + g)) + '</button>';
      }).join('') + '</div>';
  }
  function tabs(city, current) {
    var n = planCount(city.id);
    var items = [['plans', t('tabPlans'), ''], ['explore', t('tabExplore'), '/explore'], ['my', t('tabMy'), '/my']];
    return '<nav class="tabs" aria-label="' + esc(cityName(city)) + '">' + items.map(function (it) {
      return '<a class="tab" href="#/' + city.id + it[2] + '"' + (current === it[0] ? ' aria-current="page"' : '') + '>' + esc(it[1]) +
        (it[0] === 'my' ? ' <span class="count" id="my-count"' + (n ? '' : ' hidden') + '>' + n + '</span>' : '') + '</a>';
    }).join('') + '</nav>';
  }
  function updateCountBadge(cityId) {
    var el = document.getElementById('my-count');
    if (!el) return;
    var n = planCount(cityId); el.textContent = n; el.hidden = !n;
  }

  function matchesGroup(a, g) {
    if (g === 'all') return true;
    if ((a.goodFor || []).indexOf(g) < 0) return false;
    if (g === 'family') return !!a.kidFriendly;
    if (g === 'elders') return !!a.elderFriendly;
    return true;
  }

  /* Plans list */
  function renderPlans(city) {
    var list = city.itineraries.slice();
    if (state.group !== 'all') {
      var exact = list.filter(function (i) { return i.for === state.group; });
      var rest = list.filter(function (i) { return i.for !== state.group; });
      list = exact.concat(rest);
    }
    return cityHeader(city) + tabs(city, 'plans') +
      '<div class="toolbar"><button class="btn btn-accent" data-action="surprise">🎲 ' + esc(t('surprise')) + '</button></div>' +
      '<div class="grid">' + list.map(function (it) { return planCard(city, it); }).join('') + '</div>';
  }
  function planCard(city, it) {
    var stops = it.days.reduce(function (n, d) { return n + d.slots.length; }, 0);
    var highlight = state.group !== 'all' && it.for === state.group;
    return '<article class="card plan-card' + (highlight ? ' best' : '') + '">' +
      '<div class="for"><span aria-hidden="true">' + (GROUP_EMOJI[it.for] || '') + '</span> ' + esc(t('g_' + it.for)) +
        (highlight ? ' <span class="badge best-badge">★ ' + esc(t('bestMatch')) + '</span>' : '') + '</div>' +
      '<h3><a href="#/' + city.id + '/plan/' + it.id + '">' + esc(state.lang === 'hi' && it.titleHi ? it.titleHi : it.title) + '</a></h3>' +
      '<p class="desc">' + esc(it.summary) + '</p>' +
      '<div class="meta"><span>' + price(planStats(city, itineraryToPlan(it)).cost) + ' ' + esc(t('perPerson')) + '</span><span>' + stops + ' ' + esc(t('stops')) + '</span></div>' +
      '<div class="card-actions">' +
        '<a class="btn btn-sm" href="#/' + city.id + '/plan/' + it.id + '">' + esc(t('viewPlan')) + '</a>' +
        '<button class="btn btn-sm btn-primary" data-action="use-plan" data-plan="' + it.id + '">' + esc(t('usePlan')) + '</button>' +
      '</div></article>';
  }

  /* Plan detail */
  function renderPlanDetail(city, planId) {
    var it = city.itineraries.filter(function (i) { return i.id === planId; })[0];
    if (!it) return renderNotFound();
    var map = actMap(city), p = itineraryToPlan(it), notes = {};
    it.days.forEach(function (d) { d.slots.forEach(function (s) { notes[(d.day === 'sun' ? 'sun' : 'sat') + s.activityId] = s.note; }); });
    var w = weekendDates(ui.weekendOffset);
    return '<p class="no-print"><a href="#/' + city.id + '">← ' + esc(t('backToPlans')) + '</a></p>' +
      '<div class="for" style="color:var(--accent);font-weight:700"><span aria-hidden="true">' + (GROUP_EMOJI[it.for] || '') + '</span> ' + esc(t('g_' + it.for)) + ' · ' + esc(cityName(city)) + '</div>' +
      '<h1>' + esc(state.lang === 'hi' && it.titleHi ? it.titleHi : it.title) + '</h1>' +
      '<p>' + esc(it.summary) + '</p>' +
      '<div class="summary-bar"><div><div class="k">' + esc(t('budgetWeekend')) + '</div><div class="v">' + price(planStats(city, p).cost) + '</div><div class="small muted">' + esc(t('budgetNote')) + '</div></div>' +
      '<div><div class="k">📅</div><div class="v">' + esc(fmtDate(w.sat)) + ' – ' + esc(fmtDate(w.sun)) + '</div></div></div>' +
      '<div class="btn-row no-print">' +
        '<button class="btn btn-primary" data-action="use-plan" data-plan="' + it.id + '">' + esc(t('usePlan')) + '</button>' +
        shareButtons('plan', it.id) +
      '</div>' +
      DAYS.map(function (d) {
        if (!p[d].length) return '';
        return '<section class="day"><h2>' + esc(dayLabel(d)) + ' <span class="muted small">' + esc(fmtDate(w[d], { day: 'numeric', month: 'short' })) + '</span></h2><ol class="timeline">' +
          p[d].map(function (s) {
            var a = map[s.id]; if (!a) return '';
            return '<li><div class="slot-time">' + esc(fmtTime(s.time)) + '</div>' + activityCard(city, a, { compact: true, note: notes[d + s.id] }) + '</li>';
          }).join('') + '</ol></section>';
      }).join('') +
      '<p class="muted small">' + esc(t('disclaimer')) + '</p>';
  }
  function shareButtons(kind, id) {
    var d = ' data-kind="' + kind + '"' + (id ? ' data-plan="' + id + '"' : '');
    return (navigator.share ? '<button class="btn" data-action="share" data-how="native"' + d + '>📤 ' + esc(t('share')) + '</button>' : '') +
      '<button class="btn btn-wa" data-action="share" data-how="wa"' + d + '>' + esc(t('shareWA')) + '</button>' +
      '<button class="btn" data-action="share" data-how="copy"' + d + '>🔗 ' + esc(t('copyLink')) + '</button>' +
      '<button class="btn" data-action="ics"' + d + '>🗓️ ' + esc(t('calendar')) + '</button>' +
      '<button class="btn" data-action="print">🖨️ ' + esc(t('print')) + '</button>';
  }

  /* Activity card */
  function activityCard(city, a, opts) {
    opts = opts || {};
    var seasonal = a.months && a.months.length;
    var off = !inSeason(a);
    var badges = [
      '<span class="badge"><span aria-hidden="true">' + (CAT_EMOJI[a.category] || '📍') + '</span> ' + esc(t('c_' + a.category)) + '</span>',
      a.indoor ? '<span class="badge">🏠 ' + esc(t('indoor')) + '</span>' : '',
      a.kidFriendly ? '<span class="badge good">🧒 ' + esc(t('kid')) + '</span>' : '',
      a.elderFriendly ? '<span class="badge good">👵 ' + esc(t('elder')) + '</span>' : '',
      seasonal ? '<span class="badge' + (off ? ' warn' : '') + '">' + esc(off ? t('outOfSeason', { m: monthsLabel(a.months) }) : t('seasonal') + ': ' + monthsLabel(a.months)) + '</span>' : ''
    ].join('');
    var walk = { low: t('walkLow'), medium: t('walkMedium'), high: t('walkHigh') }[a.walking] || '';
    var alt = altName(a);
    return '<article class="card' + (opts.compact ? ' slot-card' : '') + '" id="act-' + esc(a.id) + '">' +
      '<div class="badges">' + badges + '</div>' +
      '<h3>' + esc(nameOf(a)) + (alt ? ' <span class="muted small" lang="en">· ' + esc(alt) + '</span>' : '') + '</h3>' +
      (opts.note ? '<p class="slot-note">💡 ' + esc(opts.note) + '</p>' : '') +
      '<div class="meta"><span>📍 ' + esc(a.area) + '</span><span>⏱️ ' + esc(hrs(a.duration)) + '</span><span>' + price(a.cost) + (a.cost ? ' ' + esc(t('perPerson')) : '') + '</span>' + (walk ? '<span>🚶 ' + esc(walk) + '</span>' : '') + '</div>' +
      (opts.compact ? '' : '<p class="desc">' + esc(a.description) + '</p>') +
      '<details><summary class="linklike" style="text-decoration:none;font-weight:700;min-height:36px;display:flex;align-items:center">' + esc(t('details')) + '</summary>' +
        (opts.compact ? '<p class="desc">' + esc(a.description) + '</p>' : '') +
        '<dl class="dl">' +
          (a.costNote ? '<dt>💰</dt><dd>' + esc(a.costNote) + '</dd>' : '') +
          (a.timing ? '<dt>' + esc(t('timing')) + '</dt><dd>' + esc(a.timing) + '</dd>' : '') +
          (a.closedOn && a.closedOn.length ? '<dt>' + esc(t('closedOn')) + '</dt><dd>' + esc(closedLabel(a.closedOn)) + '</dd>' : '') +
          (a.transit ? '<dt>' + esc(t('howToReach')) + '</dt><dd>' + esc(a.transit) + '</dd>' : '') +
          (a.accessibility ? '<dt>' + esc(t('access')) + '</dt><dd>' + esc(a.accessibility) + '</dd>' : '') +
          (a.tip ? '<dt>' + esc(t('tip')) + '</dt><dd>' + esc(a.tip) + '</dd>' : '') +
        '</dl>' +
      '</details>' +
      '<div class="card-actions">' +
        (opts.controls || ('<button class="btn btn-sm btn-primary" data-action="add" data-act="' + esc(a.id) + '" data-day="sat" aria-label="' + esc(t('addSat') + ': ' + a.name) + '">' + esc(t('addSat')) + '</button>' +
          '<button class="btn btn-sm btn-primary" data-action="add" data-act="' + esc(a.id) + '" data-day="sun" aria-label="' + esc(t('addSun') + ': ' + a.name) + '">' + esc(t('addSun')) + '</button>')) +
        '<a class="btn btn-sm" href="' + esc(mapsUrl(a, city)) + '" target="_blank" rel="noopener">🗺️ ' + esc(t('openMaps')) + '</a>' +
        (a.website ? '<a class="btn btn-sm btn-ghost" href="' + esc(a.website) + '" target="_blank" rel="noopener">' + esc(t('website')) + ' ↗</a>' : '') +
      '</div></article>';
  }

  /* Explore */
  function filterActivities(city) {
    var f = ui.filters, q = f.q.trim().toLowerCase();
    var list = city.activities.filter(function (a) {
      if (!matchesGroup(a, state.group)) return false;
      if (f.cat !== 'all' && a.category !== f.cat) return false;
      if (f.budget === 'free' && a.cost > 0) return false;
      if (f.budget === '300' && a.cost > 300) return false;
      if (f.budget === '1000' && a.cost > 1000) return false;
      if (f.budget === 'more' && a.cost <= 1000) return false;
      if (f.tod !== 'any' && a.bestTime !== f.tod && a.bestTime !== 'anytime') return false;
      if (f.indoor && !a.indoor) return false;
      if (f.kid && !a.kidFriendly) return false;
      if (f.elder && !(a.elderFriendly && a.walking !== 'high')) return false;
      if (q) {
        var hay = [a.name, a.nameHi, a.area, a.description, a.category, t('c_' + a.category), a.tip, a.costNote].join(' ').toLowerCase();
        if (q.split(/\s+/).some(function (w) { return hay.indexOf(w) < 0; })) return false;
      }
      return true;
    });
    var idx = {}; city.activities.forEach(function (a, i) { idx[a.id] = i; });
    list.sort(function (a, b) {
      var s = (inSeason(b) ? 1 : 0) - (inSeason(a) ? 1 : 0);
      if (s) return s;
      if (f.sort === 'cheap') return (a.cost - b.cost) || (idx[a.id] - idx[b.id]);
      if (f.sort === 'short') return (a.duration - b.duration) || (idx[a.id] - idx[b.id]);
      return idx[a.id] - idx[b.id];
    });
    return list;
  }
  function filtersActive() {
    var f = ui.filters, d = defaultFilters();
    return Object.keys(d).some(function (k) { return k !== 'sort' && f[k] !== d[k]; });
  }
  function renderExplore(city) {
    var f = ui.filters, list = filterActivities(city);
    var chips = function (name, values, labelKey) {
      return '<div class="chip-group" role="group" aria-label="' + esc(t(labelKey)) + '">' + values.map(function (v) {
        var label = v[1];
        return '<button class="chip" data-action="filter" data-name="' + name + '" data-value="' + v[0] + '" data-fkey="f-' + name + '-' + v[0] + '" aria-pressed="' + (String(f[name]) === v[0]) + '">' + label + '</button>';
      }).join('') + '</div>';
    };
    var moreOpen = f.tod !== 'any' || f.indoor || f.kid || f.elder || f.sort !== 'reco';
    return cityHeader(city) + tabs(city, 'explore') +
      '<div class="toolbar">' +
        '<label class="visually-hidden" for="q">' + esc(t('search')) + '</label>' +
        '<input id="q" type="search" data-fkey="q" placeholder="' + esc(t('search')) + ' ( / )" value="' + esc(f.q) + '" autocomplete="off" enterkeyhint="search">' +
      '</div>' +
      '<p class="label">' + esc(t('budget')) + '</p>' +
      chips('budget', [['any', esc(t('b_any'))], ['free', esc(t('b_free'))], ['300', esc(t('b_300'))], ['1000', esc(t('b_1000'))], ['more', esc(t('b_more'))]], 'budget') +
      '<p class="label">' + esc(t('category')) + '</p>' +
      chips('cat', [['all', esc(t('c_all'))]].concat(CATS.filter(function (c) {
        return city.activities.some(function (a) { return a.category === c; });
      }).map(function (c) { return [c, '<span aria-hidden="true">' + CAT_EMOJI[c] + '</span> ' + esc(t('c_' + c))]; })), 'category') +
      '<details class="filters"' + (moreOpen ? ' open' : '') + '><summary>⚙️ ' + esc(t('moreFilters')) + '</summary>' +
        '<p class="label">' + esc(t('when')) + '</p>' +
        chips('tod', ['any', 'morning', 'afternoon', 'evening', 'night'].map(function (v) { return [v, esc(t('t_' + v))]; }), 'when') +
        '<div>' +
          '<label class="check"><input type="checkbox" data-action="toggle" data-name="indoor" data-fkey="c-indoor"' + (f.indoor ? ' checked' : '') + '> 🏠 ' + esc(t('indoorOnly')) + '</label>' +
          '<label class="check"><input type="checkbox" data-action="toggle" data-name="kid" data-fkey="c-kid"' + (f.kid ? ' checked' : '') + '> 🧒 ' + esc(t('kidOnly')) + '</label>' +
          '<label class="check"><input type="checkbox" data-action="toggle" data-name="elder" data-fkey="c-elder"' + (f.elder ? ' checked' : '') + '> 👵 ' + esc(t('elderOnly')) + '</label>' +
        '</div>' +
        '<label class="check">' + esc(t('sort')) + ' <select data-action="sort" data-fkey="sort">' +
          ['reco', 'cheap', 'short'].map(function (s) { return '<option value="' + s + '"' + (f.sort === s ? ' selected' : '') + '>' + esc(t('s_' + s)) + '</option>'; }).join('') +
        '</select></label>' +
      '</details>' +
      '<div class="result-line" aria-live="polite"><span>' + esc(t('results', { n: list.length })) + '</span>' +
        (filtersActive() ? '<button class="linklike" data-action="clear-filters" data-fkey="clear">' + esc(t('clearFilters')) + '</button>' : '') + '</div>' +
      (list.length
        ? '<div class="grid three">' + list.map(function (a) { return activityCard(city, a); }).join('') + '</div>'
        : '<div class="empty"><div class="big" aria-hidden="true">🔍</div><p>' + esc(t('noResults')) + '</p>' +
          '<button class="btn btn-primary" data-action="clear-filters">' + esc(t('clearFilters')) + '</button>' +
          (state.group !== 'all' ? ' <button class="btn" data-action="group" data-group="all">' + esc(t('g_all')) + '</button>' : '') + '</div>');
  }

  /* My weekend */
  function renderMy(city) {
    var p = myPlan(city.id), map = actMap(city), w = weekendDates(ui.weekendOffset);
    var head = cityHeader(city) + tabs(city, 'my');
    if (isEmpty(p)) {
      return head + '<h2 class="visually-hidden">' + esc(t('myTitle', { city: cityName(city) })) + '</h2>' +
        '<div class="empty"><div class="big" aria-hidden="true">🗓️</div><p><strong>' + esc(t('myEmpty')) + '</strong></p><p class="muted">' + esc(t('myEmptyHint')) + '</p>' +
        '<div class="btn-row" style="justify-content:center"><a class="btn btn-primary" href="#/' + city.id + '">' + esc(t('browsePlans')) + '</a>' +
        '<a class="btn" href="#/' + city.id + '/explore">' + esc(t('explorePlaces')) + '</a></div></div>';
    }
    var st = planStats(city, p);
    return head +
      '<h2>' + esc(t('myTitle', { city: cityName(city) })) + '</h2>' +
      '<div class="summary-bar">' +
        '<div><div class="k">' + esc(t('estCost')) + '</div><div class="v">' + price(st.cost) + ' <span class="small muted">' + esc(t('perPerson')) + '</span></div><div class="small muted">' + esc(t('budgetNote')) + '</div></div>' +
        '<div><div class="k" id="ppl-l">' + esc(t('people')) + '</div><div class="stepper" role="group" aria-labelledby="ppl-l">' +
          '<button data-action="people" data-delta="-1" data-fkey="ppl-" aria-label="' + esc(t('fewerPeople')) + '">−</button><output aria-live="polite">' + state.people + '</output>' +
          '<button data-action="people" data-delta="1" data-fkey="ppl+" aria-label="' + esc(t('morePeople')) + '">+</button></div></div>' +
        '<div><div class="k">' + esc(t('estTotal', { n: state.people })) + '</div><div class="v">' + price(st.cost * state.people) + '</div></div>' +
        '<div><div class="k">' + esc(t('estHours')) + '</div><div class="v">' + esc(t('satShort')) + ' ' + esc(hrs(st.hours.sat)) + ' · ' + esc(t('sunShort')) + ' ' + esc(hrs(st.hours.sun)) + '</div></div>' +
      '</div>' +
      DAYS.map(function (d) {
        var other = d === 'sat' ? 'sun' : 'sat';
        var list = p[d];
        return '<section class="day" aria-labelledby="h-' + d + '"><h3 id="h-' + d + '">' + esc(dayLabel(d)) + ' <span class="muted small">' + esc(fmtDate(w[d], { day: 'numeric', month: 'short' })) + '</span></h3>' +
          (st.hours[d] > 10 ? '<p class="note">⚠️ ' + esc(t('tooPacked')) + '</p>' : '') +
          (list.length ? '<ol class="timeline">' + list.map(function (s, i) {
            var a = map[s.id]; if (!a) return '';
            var prev = i > 0 ? list[i - 1] : null, pa = prev && map[prev.id];
            var overlap = pa && toMin(s.time) < toMin(prev.time) + Math.round((pa.duration || 0) * 60);
            var controls =
              '<span class="slot-controls"><label class="visually-hidden" for="t-' + d + i + '">' + esc(t('time')) + ' ' + esc(a.name) + '</label>' +
              '<input type="time" id="t-' + d + i + '" step="900" value="' + esc(s.time) + '" data-action="time" data-day="' + d + '" data-idx="' + i + '" data-fkey="time-' + d + '-' + esc(s.id) + '">' +
              '<button class="btn btn-sm" data-action="move" data-day="' + d + '" data-idx="' + i + '" data-fkey="mv-' + d + i + '">⇄ ' + esc(t('moveTo', { day: dayLabel(other, true) })) + '</button>' +
              '<button class="btn btn-sm" data-action="remove" data-day="' + d + '" data-idx="' + i + '" data-fkey="rm-' + d + i + '" aria-label="' + esc(t('remove') + ': ' + a.name) + '">✕ ' + esc(t('remove')) + '</button></span>';
            return '<li><div class="slot-time">' + esc(fmtTime(s.time)) + (overlap ? ' <span class="badge warn">⚠️ ' + esc(t('overlap')) + '</span>' : '') + '</div>' +
              (s.note ? '<p class="slot-note">📝 ' + esc(s.note) + '</p>' : '') + activityCard(city, a, { compact: true, controls: controls }) + '</li>';
          }).join('') + '</ol>' : '<p class="muted">—</p>') +
        '</section>';
      }).join('') +
      '<div class="sticky-actions"><div class="btn-row">' + shareButtons('my') +
        '<button class="btn btn-ghost" data-action="clear-plan">🗑️ ' + esc(t('clearAll')) + '</button></div></div>' +
      '<p class="muted small">' + esc(t('disclaimer')) + '</p>';
  }

  /* Shared plan (read-only) */
  var sharedCache = null;
  function renderShared(city, data) {
    var res = decodePlan(data, city);
    if (!res || isEmpty(res.plan)) {
      return '<div class="empty" role="alert"><div class="big" aria-hidden="true">🔗</div><h1>' + esc(t('sharedBad')) + '</h1><a class="btn btn-primary" href="#/' + city.id + '">' + esc(t('browsePlans')) + '</a></div>';
    }
    sharedCache = res.plan;
    ui.sharedWeekend = null;
    var dateNote = '';
    if (res.sat) {
      var key = ymd(res.sat), match = [0, 1].filter(function (o) { return ymd(weekendDates(o).sat) === key; })[0];
      if (match != null) ui.weekendOffset = match;
      else if (res.sat > weekendDates(1).sat) {
        var sun = new Date(res.sat); sun.setDate(sun.getDate() + 1);
        ui.sharedWeekend = { sat: res.sat, sun: sun };
        dateNote = t('sharedDate', { d: fmtDate(res.sat) });
      } else dateNote = t('sharedPast', { d: fmtDate(res.sat) });
    }
    var p = res.plan, map = actMap(city), w = activeWeekend(), st = planStats(city, p);
    return '<h1>' + esc(t('sharedTitle')) + '</h1>' +
      '<p class="muted">' + esc(cityName(city)) + ' · ' + esc(fmtDate(w.sat)) + ' – ' + esc(fmtDate(w.sun)) + '</p>' +
      (dateNote ? '<p class="note">📅 ' + esc(dateNote) + '</p>' : '') +
      (res.partial ? '<p class="note">' + esc(t('sharedBad')) + '</p>' : '') +
      '<div class="summary-bar"><div><div class="k">' + esc(t('estCost')) + '</div><div class="v">' + price(st.cost) + ' <span class="small muted">' + esc(t('perPerson')) + '</span></div></div></div>' +
      '<div class="btn-row no-print"><button class="btn btn-primary" data-action="save-shared">' + esc(t('sharedSave')) + '</button>' +
        '<button class="btn" data-action="ics" data-kind="shared">🗓️ ' + esc(t('calendar')) + '</button></div>' +
      DAYS.map(function (d) {
        if (!p[d].length) return '';
        return '<section class="day"><h2>' + esc(dayLabel(d)) + '</h2><ol class="timeline">' + p[d].map(function (s) {
          var a = map[s.id];
          return '<li><div class="slot-time">' + esc(fmtTime(s.time)) + '</div>' + activityCard(city, a, { compact: true }) + '</li>';
        }).join('') + '</ol></section>';
      }).join('') +
      '<p class="muted small">' + esc(t('disclaimer')) + '</p>';
  }

  /* ---------- Events ---------- */
  function currentCity() { var r = ui.route; return r && r.city && WP.data[r.city]; }
  function planFor(kind, planId, city) {
    if (kind === 'my') return myPlan(city.id);
    if (kind === 'shared') return sharedCache;
    var it = city.itineraries.filter(function (i) { return i.id === planId; })[0];
    return it ? itineraryToPlan(it) : null;
  }

  main.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el || el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
    var action = el.getAttribute('data-action'), city = currentCity();
    switch (action) {
      case 'retry': delete loading[el.getAttribute('data-city')]; route(true); break;
      case 'group': state.group = el.getAttribute('data-group'); save(); rerender(); break;
      case 'weekend': ui.weekendOffset = +el.getAttribute('data-offset'); rerender(); break;
      case 'surprise': surprise(); break;
      case 'filter': ui.filters[el.getAttribute('data-name')] = el.getAttribute('data-value'); rerender(); break;
      case 'clear-filters': ui.filters = defaultFilters(); rerender(); break;
      case 'add': addToDay(city, el.getAttribute('data-act'), el.getAttribute('data-day')); break;
      case 'use-plan': {
        var it = city.itineraries.filter(function (i) { return i.id === el.getAttribute('data-plan'); })[0];
        if (it) applyPlan(city.id, itineraryToPlan(it), t('usePlanDone'));
        break;
      }
      case 'share': {
        var sp = planFor(el.getAttribute('data-kind'), el.getAttribute('data-plan'), city);
        if (sp) doShare(el.getAttribute('data-how'), city, sp);
        break;
      }
      case 'ics': {
        var ip = planFor(el.getAttribute('data-kind'), el.getAttribute('data-plan'), city);
        if (ip) downloadIcs(city, ip);
        break;
      }
      case 'print': window.print(); break;
      case 'people': state.people = Math.max(1, Math.min(20, state.people + (+el.getAttribute('data-delta')))); save(); rerender(); break;
      case 'move': {
        var p = myPlan(city.id), d = el.getAttribute('data-day'), o = d === 'sat' ? 'sun' : 'sat';
        var mi = +el.getAttribute('data-idx'), cur = p[d][mi];
        if (!cur) break;
        if (p[o].some(function (s) { return s.id === cur.id; })) { toast(t('alreadyAdded', { day: dayLabel(o) })); break; }
        p[o].push(p[d].splice(mi, 1)[0]); sortDay(p[o]);
        save(); rerender(); break;
      }
      case 'remove': {
        var pr = myPlan(city.id), dr = el.getAttribute('data-day'), idx = +el.getAttribute('data-idx');
        var removed = pr[dr].splice(idx, 1)[0];
        save(); rerender();
        if (removed) toast(t('remove') + ': ' + nameOf(actMap(city)[removed.id] || { name: '' }), t('undo'), function () {
          pr[dr].push(removed); sortDay(pr[dr]); save(); rerender();
        });
        break;
      }
      case 'clear-plan': {
        if (!window.confirm(t('clearConfirm'))) break;
        var backup = JSON.parse(JSON.stringify(myPlan(city.id)));
        state.plans[city.id] = { sat: [], sun: [] }; save(); rerender();
        toast(t('cleared'), t('undo'), function () { state.plans[city.id] = backup; save(); rerender(); });
        break;
      }
      case 'save-shared':
        if (sharedCache) applyPlan(city.id, sharedCache, t('sharedSaved'));
        break;
    }
  });

  var searchTimer;
  main.addEventListener('input', function (e) {
    if (e.target.id === 'q') {
      clearTimeout(searchTimer);
      var v = e.target.value;
      searchTimer = setTimeout(function () { ui.filters.q = v; rerender(); }, 180);
    }
  });
  main.addEventListener('change', function (e) {
    var el = e.target, action = el.getAttribute('data-action'), city = currentCity();
    if (action === 'toggle') { ui.filters[el.getAttribute('data-name')] = el.checked; rerender(); }
    else if (action === 'sort') { ui.filters.sort = el.value; rerender(); }
    else if (action === 'time' && city && el.value) {
      var p = myPlan(city.id), d = el.getAttribute('data-day');
      var item = p[d][+el.getAttribute('data-idx')];
      if (item) { item.time = el.value; sortDay(p[d]); save(); rerender(); }
    }
  });

  function surprise() {
    var city = currentCity(); if (!city) return;
    var pool = city.itineraries.filter(function (i) { return state.group === 'all' || i.for === state.group; });
    if (!pool.length) pool = city.itineraries;
    var pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) go('#/' + city.id + '/plan/' + pick.id);
  }

  /* ---------- Header controls ---------- */
  function buildCitySelect() {
    citySelect.innerHTML = '<option value="">' + esc(t('selectCity')) + '</option>' +
      WP.cities.map(function (c) { return '<option value="' + c.id + '">' + esc(cityName(c)) + '</option>'; }).join('');
  }
  function syncCitySelect(id) { citySelect.value = id || ''; }
  citySelect.addEventListener('change', function () {
    var r = ui.route || {}, id = citySelect.value;
    if (!id) return go('#/');
    var sub = r.view === 'explore' ? '/explore' : r.view === 'my' ? '/my' : '';
    go('#/' + id + sub);
  });

  var settingsDlg = document.getElementById('settings-dialog');
  var shortcutsDlg = document.getElementById('shortcuts-dialog');
  function openDialog(d) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
  document.getElementById('settings-btn').addEventListener('click', function () {
    ['lang', 'textSize', 'theme'].forEach(function (n) {
      var r = settingsDlg.querySelector('input[name="' + n + '"][value="' + state[n] + '"]'); if (r) r.checked = true;
    });
    openDialog(settingsDlg);
  });
  document.getElementById('shortcuts-btn').addEventListener('click', function () { openDialog(shortcutsDlg); });
  settingsDlg.addEventListener('change', function (e) {
    var n = e.target.name, v = e.target.value;
    if (!n) return;
    state[n] = v; save(); applyPrefs();
    if (n === 'lang') { applyI18n(); buildCitySelect(); syncCitySelect(ui.route && ui.route.city); rerender(); }
  });

  function applyPrefs() {
    var d = document.documentElement;
    if (state.theme === 'auto') d.removeAttribute('data-theme'); else d.setAttribute('data-theme', state.theme);
    d.setAttribute('data-text', state.textSize);
    d.setAttribute('lang', state.lang);
  }
  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
  }

  /* ---------- Keyboard shortcuts ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea' || e.target.isContentEditable) {
      if (e.key === 'Escape' && e.target.id === 'q') e.target.blur();
      return;
    }
    if (document.querySelector('dialog[open]')) return;
    var r = ui.route || {}, c = r.city && cityMeta(r.city) ? r.city : state.city;
    switch (e.key) {
      case '/':
        if (!c) return; e.preventDefault();
        if (r.view !== 'explore') go('#/' + c + '/explore');
        setTimeout(function () { var q = document.getElementById('q'); if (q) q.focus(); }, 60);
        break;
      case '1': if (c) go('#/' + c); break;
      case '2': if (c) go('#/' + c + '/explore'); break;
      case '3': if (c) go('#/' + c + '/my'); break;
      case 's': surprise(); break;
      case 'c': e.preventDefault(); citySelect.focus(); break;
      case 'd': {
        var dark = state.theme === 'dark' || (state.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        state.theme = dark ? 'light' : 'dark'; save(); applyPrefs(); break;
      }
      case '?': openDialog(shortcutsDlg); break;
    }
  });

  /* ---------- Offline + service worker ---------- */
  var banner = document.getElementById('offline-banner');
  function netStatus() { banner.hidden = navigator.onLine !== false; }
  window.addEventListener('online', netStatus);
  window.addEventListener('offline', netStatus);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* ignore */ }); });
  }

  /* Keep sticky tabs just below the header, whatever the text size. */
  var topbar = document.querySelector('.topbar');
  function syncTopbar() { document.documentElement.style.setProperty('--topbar-h', topbar.offsetHeight + 'px'); }
  if (window.ResizeObserver) new ResizeObserver(syncTopbar).observe(topbar);
  window.addEventListener('resize', syncTopbar);

  /* ---------- Boot ---------- */
  applyPrefs();
  applyI18n();
  buildCitySelect();
  netStatus();
  window.addEventListener('hashchange', function () { route(); });
  if (!location.hash && state.city && cityMeta(state.city)) history.replaceState(null, '', '#/' + state.city);
  route(true);
  syncTopbar();
})();
