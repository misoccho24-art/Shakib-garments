/* ═══════════════════════════════════════════════════════════
   store.js — shared namespace, helpers, local persistence, seed data.
   Everything lives in localStorage: no backend, no Firebase, no network.
   ═══════════════════════════════════════════════════════════ */
window.V = window.V || {};

/* ─────────────── helpers ─────────────── */
V.util = {
  qs: function (sel, root) { return (root || document).querySelector(sel); },
  qsa: function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); },

  el: function (tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  },

  pad: function (n) { return (n < 10 ? '0' : '') + n; },

  /* seconds → "MM:SS" (clamped so the display never overflows 4 digits) */
  mmss: function (sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.min(99, Math.floor(sec / 60));
    return V.util.pad(m) + ':' + V.util.pad(sec % 60);
  },

  clock: function (d) {
    d = d || new Date();
    return V.util.pad(d.getHours()) + ':' + V.util.pad(d.getMinutes()) + ':' + V.util.pad(d.getSeconds());
  },

  hhmm: function (d) {
    d = d || new Date();
    return V.util.pad(d.getHours()) + ':' + V.util.pad(d.getMinutes());
  },

  rand: function (min, max) { return Math.random() * (max - min) + min; },
  randInt: function (min, max) { return Math.floor(V.util.rand(min, max + 1)); },
  pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },

  uid: function (prefix) {
    return (prefix || '') + Math.random().toString(36).slice(2, 7).toUpperCase();
  },

  esc: function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  initials: function (name) {
    var parts = String(name).replace(/^Dr\.?\s*/i, '').trim().split(/\s+/);
    return ((parts[0] || '')[0] || '' ).toUpperCase() + ((parts[parts.length - 1] || '')[0] || '').toUpperCase();
  },

  /* deterministic colour per name, so an avatar never changes between reloads */
  hue: function (str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  },

  reduceMotion: function () {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
};

/* ─────────────── persistence ─────────────── */
V.store = {
  prefix: 'vitalis:',
  ok: (function () {
    try { localStorage.setItem('vitalis:probe', '1'); localStorage.removeItem('vitalis:probe'); return true; }
    catch (e) { return false; }
  })(),
  mem: {},

  get: function (key, fallback) {
    try {
      var raw = this.ok ? localStorage.getItem(this.prefix + key) : this.mem[key];
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },

  set: function (key, value) {
    var raw = JSON.stringify(value);
    try {
      if (this.ok) localStorage.setItem(this.prefix + key, raw);
      else this.mem[key] = raw;
    } catch (e) {
      /* quota or private mode — fall back to memory so the session still works */
      this.mem[key] = raw;
    }
    return value;
  },

  del: function (key) {
    try { localStorage.removeItem(this.prefix + key); } catch (e) {}
    delete this.mem[key];
  },

  /* every key this site owns — used by Reset all / Export */
  keys: ['theme', 'content', 'doctors', 'calls', 'pin', 'speed']
};

/* ─────────────── seed data ─────────────── */
V.seed = {};

V.seed.doctors = [
  { id: 'd1', name: 'Dr. Ayesha Rahman', spec: 'Emergency Physician', dept: 'Emergency', status: 'available', floor: 'G', room: 'ER-04', resp: 2, years: 14, tags: ['Trauma lead', 'ACLS', 'Ultrasound'], bio: 'Runs the night resuscitation bay. Fourteen years of front-door medicine and the calmest voice in the building.' },
  { id: 'd2', name: 'Dr. Imran Kabir', spec: 'Interventional Cardiologist', dept: 'Cardiology', status: 'surgery', floor: '4', room: 'Cath Lab 2', resp: 9, years: 18, tags: ['STEMI', 'Angioplasty'], bio: 'Door-to-balloon under 40 minutes, 600+ primary PCIs. Currently scrubbed in.' },
  { id: 'd3', name: 'Dr. Naomi Adeyemi', spec: 'Trauma Surgeon', dept: 'Trauma', status: 'available', floor: '2', room: 'OT-1', resp: 3, years: 11, tags: ['Damage control', 'FAST'], bio: 'Trauma team leader. Takes the worst road accidents the city can produce.' },
  { id: 'd4', name: 'Dr. Samuel Ortiz', spec: 'Neurologist', dept: 'Neurology', status: 'oncall', floor: '6', room: 'Stroke Unit', resp: 7, years: 16, tags: ['Thrombolysis', 'Stroke call'], bio: 'Leads the stroke pathway — clot-busting decisions inside the golden window.' },
  { id: 'd5', name: 'Dr. Priya Nandini', spec: 'Paediatric Emergency', dept: 'Paediatrics', status: 'available', floor: '3', room: 'PED-02', resp: 4, years: 9, tags: ['PALS', 'Neonatal'], bio: 'Paediatric resus lead. Keeps a drawer of stickers next to the intubation kit.' },
  { id: 'd6', name: 'Dr. Hasan Chowdhury', spec: 'Anaesthesiologist', dept: 'Critical Care', status: 'surgery', floor: '2', room: 'OT-3', resp: 12, years: 20, tags: ['Airway', 'ICU'], bio: 'Difficult-airway specialist. If a tube will go in, it goes in for him.' },
  { id: 'd7', name: 'Dr. Elena Novak', spec: 'Orthopaedic Surgeon', dept: 'Orthopaedics', status: 'available', floor: '5', room: 'ORT-11', resp: 6, years: 13, tags: ['Fractures', 'Spine'], bio: 'Pins, plates and a very fast plaster room.' },
  { id: 'd8', name: 'Dr. Tariq Mahmud', spec: 'Emergency Physician', dept: 'Emergency', status: 'available', floor: 'G', room: 'ER-01', resp: 2, years: 7, tags: ['Toxicology', 'ATLS'], bio: 'Poisoning and overdose lead for the district. Knows every antidote by heart.' },
  { id: 'd9', name: 'Dr. Fatima Zahra', spec: 'Obstetrics & Gynaecology', dept: 'Maternity', status: 'oncall', floor: '7', room: 'Labour 3', resp: 8, years: 15, tags: ['Emergency C-section'], bio: 'Delivered more than 3,000 babies, several of them in a lift.' },
  { id: 'd10', name: 'Dr. Michael Osei', spec: 'Intensivist', dept: 'Critical Care', status: 'available', floor: '8', room: 'ICU-A', resp: 5, years: 17, tags: ['Ventilation', 'Sepsis'], bio: 'Runs the eight-bed ICU and the sepsis alert protocol.' },
  { id: 'd11', name: 'Dr. Sara Lindqvist', spec: 'Radiologist', dept: 'Imaging', status: 'available', floor: '1', room: 'CT-2', resp: 4, years: 12, tags: ['CT trauma', 'Reporting'], bio: 'Reads a trauma CT in under four minutes, day or night.' },
  { id: 'd12', name: 'Dr. Rohan Verma', spec: 'Burns & Plastics', dept: 'Burns', status: 'off', floor: '5', room: 'BRN-2', resp: 25, years: 10, tags: ['Grafting', 'Escharotomy'], bio: 'Burns unit consultant. Off shift until 20:00.' }
];

V.seed.departments = [
  { ico: '🚨', name: 'Emergency & Resus', desc: 'Four resuscitation bays, walk-in triage in under two minutes, open every hour of the year.', beds: '24 bays', wait: '00:04' },
  { ico: '❤️', name: 'Cardiac Centre', desc: 'Two cath labs on permanent standby for heart attacks, with a dedicated STEMI pathway.', beds: '18 beds', wait: '00:09' },
  { ico: '🦴', name: 'Trauma & Orthopaedics', desc: 'Helipad-fed trauma theatre with a surgical team that never leaves the building.', beds: '30 beds', wait: '00:11' },
  { ico: '🧠', name: 'Neuro & Stroke', desc: 'CT-to-needle in 22 minutes on average, thrombectomy service around the clock.', beds: '16 beds', wait: '00:07' },
  { ico: '👶', name: 'Paediatrics', desc: 'Child-sized everything, from cannulas to waiting-room ceilings.', beds: '22 beds', wait: '00:06' },
  { ico: '🫁', name: 'Critical Care', desc: 'Eight ICU beds, six HDU, one-to-one nursing and full organ support.', beds: '14 beds', wait: '—' },
  { ico: '🤰', name: 'Maternity', desc: 'Obstetric theatre attached to the labour ward — decision to delivery in minutes.', beds: '20 beds', wait: '00:05' },
  { ico: '🔬', name: 'Imaging & Labs', desc: 'CT, MRI and a hot lab that turns bloods around while the porter waits.', beds: '—', wait: '00:03' }
];

V.seed.ticker = [
  '🚑 4 units on the road',
  '🟢 ER accepting all categories',
  '🩸 O− blood stock: healthy',
  '🚁 Air ambulance on standby',
  '🏥 ICU beds available',
  '⚡ Cath lab staffed',
  '🧬 Trauma team assembled',
  '📞 Emergency line: 999'
];

V.seed.marquee = [
  'ISO 9001 certified', 'JCI accredited emergency pathway', 'Level I trauma centre',
  'Stroke-ready hospital', 'Neonatal transport service', 'Blood bank on site',
  'Helipad · 24h', 'Paediatric resus certified'
];

V.seed.crews = [
  { lead: 'Paramedic Rifat Hossain', mate: 'EMT Lina Barua' },
  { lead: 'Paramedic Joseph Mbeki', mate: 'EMT Anika Roy' },
  { lead: 'Paramedic Dana Whitfield', mate: 'EMT Karim Sattar' },
  { lead: 'Paramedic Nurul Alam', mate: 'EMT Sofia Marin' },
  { lead: 'Paramedic Grace Okonkwo', mate: 'EMT Tanvir Islam' }
];

/* ─────────────── toasts ─────────────── */
V.toast = function (title, body, type) {
  var wrap = document.getElementById('toasts');
  if (!wrap) return;
  var icons = { ok: '✓', warn: '!', info: '🚑', err: '×' };
  var t = V.util.el('div', 'toast toast--' + (type || 'info'));
  t.innerHTML =
    '<span class="toast__ico">' + (icons[type] || icons.info) + '</span>' +
    '<span><b>' + V.util.esc(title) + '</b>' + (body ? '<small>' + V.util.esc(body) + '</small>' : '') + '</span>';
  wrap.appendChild(t);
  setTimeout(function () {
    t.classList.add('is-out');
    setTimeout(function () { t.remove(); }, 400);
  }, 4600);
};
