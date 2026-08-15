/* =========================================================
   SAKIB APPARELS — shared lot store
   Loaded by admin.html, lot-1..5.html and lot.html, after
   lots-data.js (which the build step generates from the lot
   pages). Anything an admin changes is written here, so an
   edit made on admin.html actually shows up on the lot page.
   ========================================================= */
(function (w) {
  'use strict';

  var BAKED = w.SAKIB_LOT_DATA || {};
  var STORE = 'sakib-admin-lots';

  var PRODUCT = {
    '1': 'T-shirts',
    '2': 'Tops & crop tops',
    '3': 'Hoodies',
    '4': 'Trousers',
    '5': 'Mixed & repeat orders'
  };

  /* One order row. Every field is free text so the sheet stays editable;
     photo holds a downscaled data: URI. */
  var FIELDS = ['date', 'code', 'photo', 'qty', 'cutting', 'sewing', 'finishing', 'remark'];

  function normalise(row) {
    var out = {};
    FIELDS.forEach(function (f) { out[f] = (row && row[f] != null) ? String(row[f]) : ''; });
    return out;
  }

  function blankRow() { return normalise({}); }

  function read() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE));
      if (s && typeof s === 'object') return s;
    } catch (e) {}
    return {};
  }

  var state = read();
  if (!state.lots)  state.lots  = {};
  if (!state.added) state.added = [];
  if (!state.draft) state.draft = null;

  /* Is localStorage usable at all? Private mode and some embedded viewers
     throw on any access. When it is unavailable we run memory-only for the
     session rather than rejecting the user's edits. */
  var STORAGE_OK = (function () {
    try {
      localStorage.setItem('__sakib_probe', '1');
      localStorage.removeItem('__sakib_probe');
      return true;
    } catch (e) { return false; }
  })();

  /* true  = saved, or storage is unavailable and we are memory-only
     false = storage works but refused this write (quota — usually photos) */
  function save() {
    if (!STORAGE_OK) return true;
    try { localStorage.setItem(STORE, JSON.stringify(state)); return true; }
    catch (e) { return false; }
  }

  /* Units for a lot: the saved copy if there is one, otherwise a
     working copy seeded from the baked-in sheet. */
  function units(id) {
    id = String(id);
    if (!state.lots[id]) {
      state.lots[id] = (BAKED[id] || []).map(normalise);
    }
    return state.lots[id];
  }

  function ids() {
    var out = Object.keys(BAKED).sort(function (a, b) { return a - b; });
    state.added.forEach(function (id) {
      if (out.indexOf(String(id)) < 0) out.push(String(id));
    });
    return out;
  }

  function isDone(v) { return String(v || '').trim().toLowerCase() === 'done'; }

  function counts(id) {
    var n = { rows: 0, qty: 0, photo: 0, cutting: 0, sewing: 0, finishing: 0 };
    units(id).forEach(function (u) {
      n.rows++;
      var q = parseFloat(String(u.qty).replace(/[^\d.-]/g, ''));
      if (!isNaN(q)) n.qty += q;
      if (u.photo) n.photo++;
      if (isDone(u.cutting))   n.cutting++;
      if (isDone(u.sewing))    n.sewing++;
      if (isDone(u.finishing)) n.finishing++;
    });
    return n;
  }

  /* Replace a lot's rows wholesale — what the editor's Save calls. */
  function setUnits(id, rows) {
    state.lots[String(id)] = (rows || []).map(normalise);
    return save();
  }

  function addLot(list) {
    var next = 1;
    ids().forEach(function (id) { if (+id >= next) next = +id + 1; });
    var key = String(next);
    state.lots[key] = list.map(normalise);
    state.added.push(key);
    save();
    return key;
  }

  function removeLot(id) {
    id = String(id);
    var i = state.added.indexOf(id);
    if (i < 0) return false;              // baked lots cannot be removed
    state.added.splice(i, 1);
    delete state.lots[id];
    save();
    return true;
  }

  w.SAKIB_LOTS = {
    units: units,
    setUnits: setUnits,
    fields: FIELDS,
    blankRow: blankRow,
    isDone: isDone,
    ids: ids,
    counts: counts,
    addLot: addLot,
    removeLot: removeLot,
    isAdded: function (id) { return state.added.indexOf(String(id)) > -1; },
    label: function (id) { return 'Lot ' + id; },
    product: function (id) { return PRODUCT[String(id)] || 'Created in browser'; },
    save: save,
    persistent: STORAGE_OK,
    state: state,
    baked: BAKED
  };
})(window);
