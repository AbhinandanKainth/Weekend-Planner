#!/usr/bin/env node
/* Validates every city data file. Usage: node scripts/validate-data.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const CATS = ['heritage', 'nature', 'food', 'culture', 'shopping', 'adventure', 'nightlife', 'kids', 'wellness', 'spiritual', 'daytrip'];
const TIMES = ['morning', 'afternoon', 'evening', 'night', 'anytime'];
const GROUPS = ['friends', 'solo', 'couple', 'family', 'elders'];
const PERSONAS = ['ananya', 'karthik', 'neha', 'rajesh'];
const WALK = ['low', 'medium', 'high'];
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ctx = { WP: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data/cities.js'), 'utf8'), Object.assign(ctx, { window: ctx }));
const registry = ctx.WP.cities;

let errors = 0, warnings = 0;
const err = (c, m) => { errors++; console.error(`  ✗ [${c}] ${m}`); };
const warn = (c, m) => { warnings++; console.warn(`  ! [${c}] ${m}`); };
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

for (const meta of registry) {
  const file = path.join(root, 'data', meta.id + '.js');
  if (!fs.existsSync(file)) { err(meta.id, 'missing data file ' + file); continue; }
  let city;
  const sandbox = { WP: { registerCity: (c) => { city = c; } } };
  try { vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file }); }
  catch (e) { err(meta.id, 'syntax/runtime error: ' + e.message); continue; }
  if (!city) { err(meta.id, 'WP.registerCity was not called'); continue; }
  const C = meta.id;
  if (city.id !== meta.id) err(C, `id "${city.id}" does not match registry`);
  ['name', 'nameHi', 'tagline', 'weather', 'gettingAround', 'safety'].forEach((k) => { if (!isStr(city[k])) err(C, 'missing ' + k); });

  const ids = new Set();
  (city.activities || []).forEach((a, i) => {
    const A = `${C}:${a.id || '#' + i}`;
    if (!/^[a-z0-9-]+$/.test(a.id || '')) err(A, 'bad id');
    if (ids.has(a.id)) err(A, 'duplicate id');
    ids.add(a.id);
    ['name', 'nameHi', 'area', 'description', 'timing', 'tip', 'transit', 'mapsQuery', 'accessibility'].forEach((k) => { if (!isStr(a[k])) err(A, 'missing ' + k); });
    if (!CATS.includes(a.category)) err(A, 'bad category ' + a.category);
    if (typeof a.cost !== 'number' || a.cost < 0) err(A, 'bad cost');
    if (typeof a.duration !== 'number' || a.duration <= 0 || a.duration > 14) err(A, 'bad duration');
    if (!TIMES.includes(a.bestTime)) err(A, 'bad bestTime ' + a.bestTime);
    if (!Array.isArray(a.closedOn) || a.closedOn.some((d) => !DOW.includes(d))) err(A, 'bad closedOn');
    if ((a.closedOn || []).some((d) => d === 'Sat' || d === 'Sun')) err(A, 'closed on a weekend day');
    if (typeof a.indoor !== 'boolean' || typeof a.kidFriendly !== 'boolean' || typeof a.elderFriendly !== 'boolean') err(A, 'indoor/kidFriendly/elderFriendly must be boolean');
    if (!Array.isArray(a.goodFor) || !a.goodFor.length || a.goodFor.some((g) => !GROUPS.includes(g))) err(A, 'bad goodFor');
    if (!WALK.includes(a.walking)) err(A, 'bad walking');
    if (a.website && !/^https?:\/\//.test(a.website)) err(A, 'website must be a full URL');
    if (a.months && (!Array.isArray(a.months) || a.months.some((m) => !(m >= 1 && m <= 12)))) err(A, 'bad months');
  });
  const acts = city.activities || [];
  if (acts.length < 20) err(C, `only ${acts.length} activities`);
  CATS.forEach((c) => { if (!acts.some((a) => a.category === c)) warn(C, 'no activity in category ' + c); });

  const its = city.itineraries || [];
  GROUPS.forEach((g) => { if (!its.some((i) => i.for === g)) err(C, 'no itinerary for ' + g); });
  const itIds = new Set();
  its.forEach((it) => {
    const I = `${C}:${it.id}`;
    if (itIds.has(it.id)) err(I, 'duplicate itinerary id');
    itIds.add(it.id);
    ['title', 'titleHi', 'summary'].forEach((k) => { if (!isStr(it[k])) err(I, 'missing ' + k); });
    if (!GROUPS.includes(it.for)) err(I, 'bad for');
    if (!PERSONAS.includes(it.persona)) err(I, 'bad persona');
    if (typeof it.budget !== 'number') err(I, 'bad budget');
    const days = (it.days || []).map((d) => d.day);
    if (!days.includes('sat') || !days.includes('sun')) err(I, 'needs sat and sun');
    (it.days || []).forEach((d) => {
      let prev = -1;
      (d.slots || []).forEach((s) => {
        if (!ids.has(s.activityId)) err(I, 'unknown activityId ' + s.activityId);
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time || '')) err(I, 'bad time ' + s.time);
        const m = parseInt(s.time, 10) * 60 + parseInt(String(s.time).slice(3), 10);
        if (m < prev) warn(I, `slots out of order on ${d.day} at ${s.time}`);
        prev = m;
      });
    });
  });
  console.log(`✓ ${C}: ${acts.length} activities, ${its.length} itineraries`);
}

console.log(`\n${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
