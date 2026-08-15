/* =========================================================
   SAKIB APPARELS — shared interaction layer
   Every block guards for missing nodes so the same file can
   run on all four pages.
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine    = matchMedia('(pointer: fine)').matches;
  var coarse  = matchMedia('(hover: none)').matches;

  /* ---------------------------------------------------------
     0. LITE MODE
     Touch, small viewport or few cores → drop the expensive
     compositing work rather than trying to animate through it.
     --------------------------------------------------------- */
  var lite = coarse || innerWidth < 900 || (navigator.hardwareConcurrency || 8) <= 4;
  if (lite) root.classList.add('lite');

  /* ---------------------------------------------------------
     1. THEME — persisted, OS default on first visit
     --------------------------------------------------------- */
  var STORE = 'sakib-theme';

  function readTheme() {
    var saved = null;
    try { saved = localStorage.getItem(STORE); } catch (e) {}
    if (saved === 'light' || saved === 'dark') return saved;
    return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(mode) {
    root.setAttribute('data-theme', mode);
    try { localStorage.setItem(STORE, mode); } catch (e) {}
    var t = $('#themeToggle');
    if (t) t.setAttribute('aria-label', 'Switch to ' + (mode === 'dark' ? 'light' : 'dark') + ' theme');
    var m = $('#metaTheme');
    if (m) m.setAttribute('content', mode === 'dark' ? '#07090d' : '#f7f8fb');
  }

  applyTheme(readTheme());

  var toggle = $('#themeToggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';

      // Circular wipe out of the toggle — desktop only, it is a full-page
      // snapshot and phones cannot afford one.
      if (!reduced && !lite && document.startViewTransition) {
        var r = toggle.getBoundingClientRect();
        var x = r.left + r.width / 2, y = r.top + r.height / 2;
        var far = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        var vt = document.startViewTransition(function () { applyTheme(next); });
        vt.ready.then(function () {
          root.animate(
            { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)',
                         'circle(' + far + 'px at ' + x + 'px ' + y + 'px)'] },
            { duration: 560, easing: 'cubic-bezier(.65,0,.35,1)',
              pseudoElement: '::view-transition-new(root)' }
          );
        }).catch(function () {});
      } else {
        applyTheme(next);
      }
    });
  }

  /* ---------------------------------------------------------
     2. PRELOADER
     Plays on every page load, at half the original duration —
     the tick interval, the hold at 100% and the fade-out are
     all halved, as is the logo draw in the stylesheet.
     --------------------------------------------------------- */
  var pre = $('#preloader'), plBar = $('#plBar'), plCount = $('#plCount');
  var pct = 0, tick;

  if (pre) {
    tick = setInterval(function () {
      pct += Math.random() * 20 + 8;
      if (pct >= 100) { pct = 100; clearInterval(tick); }
      if (plBar) plBar.style.width = pct + '%';
      if (plCount) plCount.textContent = Math.round(pct);
      if (pct === 100) setTimeout(finish, 130);
    }, reduced ? 12 : (lite ? 40 : 55));
  } else {
    requestAnimationFrame(finish);
  }

  function finish() {
    if (pre) pre.classList.add('is-done');
    document.body.classList.add('is-ready');
    kickIntro();
    setTimeout(function () { if (pre) pre.style.display = 'none'; }, 350);
  }

  /* ---------------------------------------------------------
     3. SPLIT TEXT — words wrapped in masked lines
     --------------------------------------------------------- */
  function splitNode(el) {
    if (el.dataset.splitDone) return;
    el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map(function (chunk) {
      var words = chunk.replace(/\s+/g, ' ').trim().split(' ');
      return '<span class="line-mask">' + words.map(function (w, i) {
        return '<span class="word" style="transition-delay:' + (i * 40) + 'ms">' + w + '</span>';
      }).join(' ') + '</span>';
    }).join('');
    el.dataset.splitDone = '1';
  }
  $$('[data-split]').forEach(splitNode);

  // Anything above the fold is driven by the preloader, not the observer.
  var intro = $$('[data-intro]');

  function kickIntro() {
    intro.forEach(function (el, i) {
      setTimeout(function () { el.classList.add('is-in'); }, 90 + i * 80);
    });
  }

  /* ---------------------------------------------------------
     4. REVEAL ON SCROLL
     --------------------------------------------------------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      var d = parseInt(el.dataset.delay || 0, 10);
      if (d) setTimeout(function () { el.classList.add('is-in'); }, d);
      else el.classList.add('is-in');
      io.unobserve(el);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

  $$('[data-reveal], [data-split], .step').forEach(function (el) {
    if (el.hasAttribute('data-intro')) return;
    io.observe(el);
  });

  /* ---------------------------------------------------------
     4b. LOT SHEET HYDRATION
     Lot pages ship a server-rendered sheet. If an admin has
     saved changes, redraw from the shared store so the page
     shows the real current state. Runs before the count-up
     observer so the tally animates to the corrected numbers.
     --------------------------------------------------------- */
  var LOTS = window.SAKIB_LOTS;

  var COLUMNS = [
    { key: 'date',      label: 'Date',        type: 'date' },
    { key: 'code',      label: 'Item code',   type: 'text' },
    { key: 'photo',     label: 'Photo',       type: 'photo' },
    { key: 'qty',       label: 'Quantity',    type: 'qty' },
    { key: 'cutting',   label: 'Cutting',     type: 'stage' },
    { key: 'sewing',    label: 'Sewing',      type: 'stage' },
    { key: 'finishing', label: 'Finishing',   type: 'stage' },
    { key: 'remark',    label: 'Remark/Note', type: 'text' }
  ];

  var STAGES = ['', 'Pending', 'In progress', 'Done'];

  function stageClass(v) {
    var s = String(v || '').trim().toLowerCase();
    if (s === 'done') return 'stage stage--done';
    if (s === 'in progress') return 'stage stage--wip';
    if (s === 'pending') return 'stage stage--pending';
    return 'stage';
  }

  function currentLotId() {
    var el = $('[data-lot-sheet]');
    if (!el) return null;
    var n = el.getAttribute('data-lot-sheet');
    if (n !== 'auto') return n;
    var m = location.search.match(/[?&]lot=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : (LOTS ? LOTS.ids()[0] : '1');
  }

  function paintLotNav(id) {
    var nav = $('#lotNav');
    if (!nav || !LOTS) return;
    nav.innerHTML = '';
    LOTS.ids().forEach(function (n) {
      var a = document.createElement('a');
      a.href = LOTS.isAdded(n) ? 'lot.html?lot=' + encodeURIComponent(n) : 'lot-' + n + '.html';
      a.textContent = LOTS.label(n);
      if (String(n) === String(id)) a.className = 'is-current';
      nav.appendChild(a);
    });
  }

  function paintLotTally(id) {
    var host = $('#lotTally');
    if (!host || !LOTS) return;
    var n = LOTS.counts(id);
    var tiles = [
      { v: n.rows,      label: 'Orders',         dot: null },
      { v: n.qty,       label: 'Total quantity', dot: null },
      { v: n.cutting,   label: 'Cutting done',   dot: 'dot-mfg' },
      { v: n.sewing,    label: 'Sewing done',    dot: 'dot-wait' },
      { v: n.finishing, label: 'Finishing done', dot: 'dot-ready' }
    ];
    host.innerHTML = '';
    tiles.forEach(function (t) {
      var d = document.createElement('div');
      d.className = 'tally__item';
      var b = document.createElement('b');
      var c = document.createElement('span');
      c.className = 'count';
      c.setAttribute('data-count', t.v);
      c.textContent = '0';
      b.appendChild(c);
      var s = document.createElement('span');
      if (t.dot) { var i = document.createElement('i'); i.className = t.dot; s.appendChild(i); }
      s.appendChild(document.createTextNode(t.label));
      d.appendChild(b); d.appendChild(s);
      host.appendChild(d);
    });
  }

  function paintLotSheet(id) {
    var body = $('#sheetBody');
    if (!body || !LOTS) return;
    body.innerHTML = '';

    var list = LOTS.units(id);
    if (!list.length) {                       // e.g. lot.html?lot=9 with nothing stored
      var tr0 = document.createElement('tr');
      var td0 = document.createElement('td');
      td0.colSpan = COLUMNS.length;
      td0.className = 'sheet__empty';
      td0.textContent = 'No orders found for this lot. Lots created with Add are stored in the browser that made them.';
      tr0.appendChild(td0);
      body.appendChild(tr0);
      return;
    }

    list.forEach(function (row, i) {
      var tr = document.createElement('tr');
      tr.style.setProperty('--d', (i * 0.035).toFixed(3) + 's');

      COLUMNS.forEach(function (col) {
        var td = document.createElement('td');
        var v = row[col.key] || '';

        if (col.type === 'photo') {
          td.className = 'sheet__photo';
          if (v) {
            var img = document.createElement('img');
            img.src = v;
            img.alt = (row.code ? row.code + ' — ' : '') + 'order photo';
            img.loading = 'lazy';
            td.appendChild(img);
          } else {
            var none = document.createElement('span');
            none.className = 'nophoto';
            none.textContent = 'No photo';
            td.appendChild(none);
          }
        } else if (col.type === 'stage') {
          if (v) {
            var s = document.createElement('span');
            s.className = stageClass(v);
            s.textContent = v;
            td.appendChild(s);
          } else {
            td.className = 'is-blank';
            td.textContent = '—';
          }
        } else {
          if (col.key === 'code') td.className = 'sheet__code';
          if (col.key === 'date') td.className = 'sheet__date';
          if (col.key === 'qty')  td.className = 'sheet__qty';
          if (col.key === 'remark') td.className = 'sheet__note';
          td.textContent = v || '—';
          if (!v) td.classList.add('is-blank');
        }

        tr.appendChild(td);
      });

      body.appendChild(tr);
    });
  }

  /* ---------------------------------------------------------
     4a. PHOTO UPGRADE
     Every illustration is a placeholder. Drop a real photograph
     into assets/photos/ under the matching name and it is used
     instead — no markup change. The vector stays as the fallback
     if the file is not there.
     --------------------------------------------------------- */
  $$('img[data-photo]').forEach(function (img) {
    var probe = new Image();
    probe.onload = function () {
      if (!probe.naturalWidth) return;
      img.src = img.dataset.photo;
      img.classList.add('is-photo');
      // the wrapper needs it too: a photograph carries far more detail than
      // the flat vector, so its scrim is tuned separately
      if (img.parentElement) img.parentElement.classList.add('is-photo');
    };
    probe.onerror = function () { /* no photo supplied yet — keep the vector */ };
    probe.src = img.dataset.photo;
  });

  /* Lot cards — shared by the Products summary and the admin page. */
  function paintLotCards(host) {
    if (!host || !LOTS) return;

    LOTS.ids().forEach(function (id) {
      var card = $('[data-lot-card="' + id + '"]', host);

      if (!card) {
        card = document.createElement('a');
        card.className = 'lotcard';
        card.setAttribute('data-lot-card', id);
        card.href = LOTS.isAdded(id) ? 'lot.html?lot=' + encodeURIComponent(id) : 'lot-' + id + '.html';
        card.innerHTML =
          '<span class="lotcard__no"></span><h3></h3>' +
          '<div class="lotcard__meter"><i></i><i></i><i></i></div>' +
          '<div class="lotcard__foot"><span></span>' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M12 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</div>';
        host.appendChild(card);
      }

      // names come from the store, never from the markup, so a static card
      // cannot drift out of step with the lot list
      var no = $('.lotcard__no', card), name = $('h3', card);
      if (no) no.textContent = LOTS.label(id);
      if (name) name.textContent = LOTS.product(id);

      // meter = how far each stage has got through the lot
      var n = LOTS.counts(id);
      var bars = $$('.lotcard__meter i', card);
      var pct = function (v) { return n.rows ? (v / n.rows) * 100 + '%' : '0%'; };
      if (bars[0]) bars[0].style.width = pct(n.cutting);
      if (bars[1]) bars[1].style.width = pct(n.sewing);
      if (bars[2]) bars[2].style.width = pct(n.finishing);

      var foot = $('.lotcard__foot span', card);
      if (foot) foot.textContent = n.rows + ' orders · ' + n.qty + ' pcs';
    });
  }

  // read-only summary on the Products page
  var lotLinks = $('#lotLinks');
  if (lotLinks && LOTS) paintLotCards(lotLinks);

  var lotPageId = currentLotId();
  if (lotPageId && LOTS) {
    paintLotNav(lotPageId);
    paintLotTally(lotPageId);
    paintLotSheet(lotPageId);

    var heading = $('#lotHeading');
    if (heading) heading.textContent = LOTS.label(lotPageId) + ' production sheet';
    var crumb = $('#lotCrumb');
    if (crumb) crumb.textContent = LOTS.label(lotPageId);
    var desc = $('#lotDesc');
    if (desc && LOTS.isAdded(lotPageId)) {
      desc.textContent = 'Created from the Products page. Units and statuses are stored in this browser.';
    }
    if ($('#lotHeading')) document.title = LOTS.label(lotPageId) + ' — Lot admin — Sakib Apparels';
  }

  /* ---------------------------------------------------------
     5. COUNT-UP
     --------------------------------------------------------- */
  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';

    if (el.dataset.literal) { el.textContent = el.dataset.literal; return; }

    var target = parseFloat(el.dataset.count) || 0;
    var suffix = el.dataset.suffix || '';
    var prefix = el.dataset.prefix || '';
    var dot = (el.dataset.count || '').indexOf('.');
    var decimals = dot > -1 ? el.dataset.count.length - dot - 1 : 0;
    var group = !el.hasAttribute('data-nogroup');   // years must not get a thousands separator
    var show = function (v) {
      if (decimals) return v.toFixed(decimals);
      var n = Math.round(v);
      return group ? n.toLocaleString('en-US') : String(n);
    };

    if (reduced) { el.textContent = prefix + show(target) + suffix; return; }

    var dur = 1500, t0 = performance.now();
    (function frame(now) {
      var p = clamp((now - t0) / dur, 0, 1);
      el.textContent = prefix + show(target * (1 - Math.pow(1 - p, 4))) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    })(t0);
  }

  var ioCount = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { countUp(e.target); ioCount.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  $$('.count').forEach(function (el) { ioCount.observe(el); });

  /* ---------------------------------------------------------
     6. SCROLL LOOP
     One rAF-throttled handler. All geometry is measured once
     and cached, so scrolling never forces a layout.
     --------------------------------------------------------- */
  var header = $('#header');
  var bar = $('#scrollbar span');
  var timeline = $('#timeline');
  var tlFill = $('#timelineFill');
  var parallax = lite || reduced ? [] : $$('[data-parallax]');

  var navLinks = $$('.nav__link[data-spy]');
  var spyTargets = [];
  var tlBox = null;
  var docMax = 0;
  var lastY = 0, ticking = false;

  function measure() {
    docMax = Math.max(1, document.documentElement.scrollHeight - innerHeight);

    spyTargets = navLinks.map(function (a) {
      var id = a.getAttribute('href');
      var el = id && id.charAt(0) === '#' && id.length > 1 ? $(id) : null;
      return el ? el.getBoundingClientRect().top + scrollY : null;
    });

    if (timeline) {
      var r = timeline.getBoundingClientRect();
      tlBox = { top: r.top + scrollY, height: r.height };
    }

    parallax.forEach(function (el) {
      el.__base = el.getBoundingClientRect().top + scrollY + el.offsetHeight / 2;
    });
  }

  function onScroll() {
    ticking = false;
    var y = scrollY;

    if (bar) bar.style.transform = 'scaleX(' + clamp(y / docMax, 0, 1) + ')';

    if (header) {
      header.classList.toggle('is-stuck', y > 20);
      if (y > 420 && y > lastY + 6) header.classList.add('is-hidden');
      else if (y < lastY - 6) header.classList.remove('is-hidden');
    }

    if (tlFill && tlBox) {
      var p = clamp((y + innerHeight * 0.62 - tlBox.top) / tlBox.height, 0, 1);
      tlFill.style.transform = 'scaleY(' + p + ')';
    }

    for (var i = 0; i < parallax.length; i++) {
      var el = parallax[i];
      var off = (el.__base - y - innerHeight / 2) * -parseFloat(el.dataset.parallax);
      el.style.transform = 'translate3d(0,' + off.toFixed(1) + 'px,0)';
    }

    if (spyTargets.length) {
      var idx = -1;
      for (var k = 0; k < spyTargets.length; k++) {
        if (spyTargets[k] !== null && spyTargets[k] - 140 <= y) idx = k;
      }
      for (var n = 0; n < navLinks.length; n++) {
        navLinks[n].classList.toggle('is-current', n === idx);
      }
    }

    lastY = y;
  }

  addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  /* Debounced resize — remeasure, never on every frame. */
  var rTimer;
  function onResize() {
    clearTimeout(rTimer);
    rTimer = setTimeout(function () {
      measure();
      onScroll();
      $$('.acc.is-open').forEach(function (item) {
        $('.acc__panel', item).style.height = $('.acc__inner', item).offsetHeight + 'px';
      });
    }, 150);
  }
  addEventListener('resize', onResize, { passive: true });
  addEventListener('orientationchange', onResize, { passive: true });

  measure();
  onScroll();
  addEventListener('load', function () { measure(); onScroll(); });

  /* ---------------------------------------------------------
     7. MOBILE DRAWER
     --------------------------------------------------------- */
  var burger = $('#burger'), drawer = $('#drawer');
  if (burger && drawer) {
    var setDrawer = function (open) {
      drawer.classList.toggle('is-open', open);
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('is-locked', open);
    };
    burger.addEventListener('click', function () {
      setDrawer(!drawer.classList.contains('is-open'));
    });
    $$('[data-drawer-link]').forEach(function (a) {
      a.addEventListener('click', function () { setDrawer(false); });
    });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') setDrawer(false); });
  }

  /* ---------------------------------------------------------
     8. MAGNETIC BUTTONS  (fine pointer only)
     --------------------------------------------------------- */
  if (fine && !lite && !reduced) {
    $$('.magnetic').forEach(function (el) {
      var box = null;
      el.addEventListener('mouseenter', function () { box = el.getBoundingClientRect(); });
      el.addEventListener('mousemove', function (e) {
        if (!box) box = el.getBoundingClientRect();
        var x = (e.clientX - box.left - box.width / 2) * 0.26;
        var y = (e.clientY - box.top - box.height / 2) * 0.38;
        el.style.transition = 'transform .1s linear';
        el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      });
      el.addEventListener('mouseleave', function () {
        box = null;
        el.style.transition = 'transform .55s cubic-bezier(.34,1.56,.64,1)';
        el.style.transform = 'translate3d(0,0,0)';
      });
    });
  }

  /* ---------------------------------------------------------
     9. CARD TILT + SPOTLIGHT  (fine pointer only)
     --------------------------------------------------------- */
  if (fine && !lite && !reduced) {
    $$('.spotlight').forEach(function (card) {
      var glow = $('.card__glow', card);
      var box = null;
      card.addEventListener('mouseenter', function () { box = card.getBoundingClientRect(); });
      card.addEventListener('mousemove', function (e) {
        if (!box) box = card.getBoundingClientRect();
        var px = (e.clientX - box.left) / box.width;
        var py = (e.clientY - box.top) / box.height;
        if (glow) glow.style.transform =
          'translate3d(' + ((px - 0.5) * box.width).toFixed(1) + 'px,' +
                           ((py - 0.5) * box.height).toFixed(1) + 'px,0) translate(-50%,-50%)';
        if (card.classList.contains('tilt')) {
          card.style.transform =
            'perspective(900px) rotateX(' + ((0.5 - py) * 8).toFixed(2) + 'deg) rotateY(' +
            ((px - 0.5) * 8).toFixed(2) + 'deg) translateY(-6px)';
        }
      });
      card.addEventListener('mouseleave', function () { box = null; card.style.transform = ''; });
    });
  }

  /* ---------------------------------------------------------
     10. ACCORDION
     --------------------------------------------------------- */
  $$('.acc').forEach(function (item) {
    var head = $('.acc__head', item);
    var panel = $('.acc__panel', item);
    var inner = $('.acc__inner', item);
    if (!head || !panel || !inner) return;

    head.addEventListener('click', function () {
      var open = item.classList.contains('is-open');

      $$('.acc.is-open').forEach(function (other) {
        if (other === item) return;
        other.classList.remove('is-open');
        $('.acc__head', other).setAttribute('aria-expanded', 'false');
        $('.acc__panel', other).style.height = '0px';
      });

      item.classList.toggle('is-open', !open);
      head.setAttribute('aria-expanded', String(!open));
      panel.style.height = open ? '0px' : inner.offsetHeight + 'px';
    });
  });

  /* ---------------------------------------------------------
     11. TESTIMONIAL CAROUSEL
     --------------------------------------------------------- */
  var quotes = $$('.quote');
  if (quotes.length > 1) {
    var dotsWrap = $('#qDots');
    var idx = 0, timer = null;

    quotes.forEach(function (_, n) {
      var b = document.createElement('button');
      b.className = 'qdot' + (n === 0 ? ' is-active' : '');
      b.type = 'button';
      b.setAttribute('aria-label', 'Quote ' + (n + 1));
      b.addEventListener('click', function () { go(n); restart(); });
      if (dotsWrap) dotsWrap.appendChild(b);
    });
    var dots = $$('.qdot');

    function go(n) {
      idx = (n + quotes.length) % quotes.length;
      quotes.forEach(function (q, k) { q.classList.toggle('is-active', k === idx); });
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === idx); });
    }
    function restart() {
      clearInterval(timer);
      if (!reduced) timer = setInterval(function () { go(idx + 1); }, 6500);
    }

    var next = $('#qNext'), prev = $('#qPrev'), wrap = $('#quotes');
    if (next) next.addEventListener('click', function () { go(idx + 1); restart(); });
    if (prev) prev.addEventListener('click', function () { go(idx - 1); restart(); });
    if (wrap && fine) {
      wrap.addEventListener('mouseenter', function () { clearInterval(timer); });
      wrap.addEventListener('mouseleave', restart);
    }

    // Swipe on touch
    if (wrap) {
      var sx = 0, sy = 0;
      wrap.addEventListener('touchstart', function (e) {
        sx = e.changedTouches[0].clientX; sy = e.changedTouches[0].clientY;
      }, { passive: true });
      wrap.addEventListener('touchend', function (e) {
        var dx = e.changedTouches[0].clientX - sx;
        var dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) { go(idx + (dx < 0 ? 1 : -1)); restart(); }
      }, { passive: true });
    }

    // Pause when off-screen — no timers running behind the fold.
    if (wrap) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? restart() : clearInterval(timer);
      }, { threshold: 0.2 }).observe(wrap);
    } else {
      restart();
    }
  }

  /* ---------------------------------------------------------
     12. CONTACT FORM (prototype — sends nothing)
     --------------------------------------------------------- */
  var form = $('#ctaForm');
  if (form) {
    var note = $('#formNote');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var inputs = $$('input', form);
      var ok = true;

      inputs.forEach(function (input) {
        if (!input.required) return;          // optional fields are never flagged
        var field = input.parentElement;
        var valid = input.value.trim() !== '' &&
                    (input.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value));
        field.classList.toggle('is-bad', !valid);
        if (!valid) {
          ok = false;
          if (!reduced && field.animate) {
            field.animate(
              [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' },
               { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
              { duration: 300, easing: 'ease-out' }
            );
          }
        }
      });

      if (!note) return;
      note.classList.remove('is-shown');
      setTimeout(function () {
        note.textContent = ok
          ? 'Prototype only — nothing was sent. A partner would respond within one working day.'
          : 'Please add a name and a valid work email.';
        note.style.color = ok ? '' : '#e0575c';
        note.classList.add('is-shown');
      }, 60);

      if (ok) form.reset();
    });
  }

  /* ---------------------------------------------------------
     13. ADMIN LOT EDITOR (prototype)
     Edit reveals Customize + Add.
       Add       — inline sheet of 15 units, IDs generated and
                   locked, three status buttons per unit.
       Customize — the same sheet as a pop-up, Ready locked.
     Both views render from one state object, so a status set
     in either place shows up in the other.
     --------------------------------------------------------- */
  var adminBar = $('#adminBar');
  if (adminBar && LOTS) {
    var ID_LETTERS = 'abcdefghijklmnopqrstuvwxyz';
    var ID_DIGITS  = '0123456789';
    var UNITS = 15;
    var ADMIN_PIN = '1234';                                // prototype gate

    // three letters + three digits, either order — abd123 / 243ght
    function newCode() {
      var l = '', d = '', i;
      for (i = 0; i < 3; i++) l += ID_LETTERS.charAt(Math.floor(Math.random() * 26));
      for (i = 0; i < 3; i++) d += ID_DIGITS.charAt(Math.floor(Math.random() * 10));
      return Math.random() < 0.5 ? l + d : d + l;
    }

    function today() {
      var d = new Date();
      return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }

    function blankSheet() {
      var out = [];
      for (var i = 0; i < UNITS; i++) {
        var r = LOTS.blankRow();
        r.date = today();
        r.code = newCode();
        out.push(r);
      }
      return out;
    }

    /* ---- state ----
       Everything lives in the shared store (lots.js), so an edit
       here is the same data the lot pages read. */
    var store = LOTS.state;
    if (!store.draft || !store.draft.length) store.draft = blankSheet();

    function persist() { return LOTS.save(); }

    var currentLot = LOTS.ids()[0] || '1';

    /* Customize edits a working copy per lot. Nothing reaches the store —
       or the lot cards, or the lot pages — until Save is pressed, and an
       unsaved sheet is kept so reopening the lot restores it. */
    var working = {};

    function copyRows(list) {
      return list.map(function (r) {
        var c = {};
        LOTS.fields.forEach(function (f) { c[f] = r[f] || ''; });
        return c;
      });
    }

    function workingFor(id) {
      if (!working[id]) working[id] = copyRows(LOTS.units(id));
      return working[id];
    }

    var VIEWS = [
      { rows: $('#draftRows'), tally: $('#draftTally'), saved: $('#draftSaved'),
        saveBtn: $('#draftSave'), dirty: false, label: 'Save draft',
        data: function () { return store.draft; },
        commit: function () { return persist(); } },

      { rows: $('#customRows'), tally: $('#customTally'), saved: $('#customSaved'),
        saveBtn: $('#customSave'), dirty: false, label: 'Save changes',
        data: function () { return workingFor(currentLot); },
        commit: function () {
          // setUnits copies the rows into the store, so the working array
          // stays the live editing surface. Replacing it here would orphan
          // the row objects the rendered cells already hold.
          return LOTS.setUnits(currentLot, workingFor(currentLot));
        } }
    ];

    /* ---- dirty / save state ---- */
    function setDirty(view, on) {
      view.dirty = on;
      var b = view.saveBtn;
      if (!b) return;
      b.disabled = !on;
      b.classList.toggle('is-idle', !on);
      b.querySelector('.btn__label').textContent = on ? view.label : 'Saved';
    }

    function markDirty(view) {
      setDirty(view, true);
      renderTally(view);
      if (view.saved) view.saved.classList.remove('is-shown');
    }

    function saveView(view) {
      if (view.commit()) {
        setDirty(view, false);
        syncLotCards();
        paintLotPicker();
        flashSaved(view);
      } else {
        warn(view, 'Storage is full — remove a photo and try again.');
      }
    }

    /* ---- editable sheet ----------------------------------
       A real table so the columns line up with the lot pages.
       Cells write straight into the model; nothing is rebuilt
       on input, so typing never restarts a row animation. */
    function buildEditor(view) {
      var table = document.createElement('table');
      table.className = 'esheet';

      var thead = document.createElement('thead');
      var htr = document.createElement('tr');
      COLUMNS.forEach(function (c) {
        var th = document.createElement('th');
        th.scope = 'col';
        th.textContent = c.label;
        htr.appendChild(th);
      });
      var thAct = document.createElement('th');
      thAct.scope = 'col';
      thAct.className = 'esheet__actcol';
      thAct.innerHTML = '<span class="visually-hidden">Remove row</span>';
      htr.appendChild(thAct);
      thead.appendChild(htr);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      view.data().forEach(function (row, i) { tbody.appendChild(buildEditRow(view, row, i)); });
      table.appendChild(tbody);
      return table;
    }

    function buildEditRow(view, row, index) {
      var tr = document.createElement('tr');
      tr.style.setProperty('--d', (index * 0.022).toFixed(3) + 's');

      COLUMNS.forEach(function (col) {
        var td = document.createElement('td');

        if (col.type === 'photo') {
          td.className = 'ephoto';
          td.appendChild(buildPhotoCell(view, row, td));
        } else if (col.type === 'stage') {
          var sel = document.createElement('select');
          sel.className = 'ecell ecell--stage ' + stageClass(row[col.key]);
          STAGES.forEach(function (s) {
            var o = document.createElement('option');
            o.value = s;
            o.textContent = s === '' ? '—' : s;
            if (s === row[col.key]) o.selected = true;
            sel.appendChild(o);
          });
          sel.addEventListener('change', function () {
            row[col.key] = sel.value;
            sel.className = 'ecell ecell--stage ' + stageClass(sel.value);
            markDirty(view);
          });
          td.appendChild(sel);
        } else {
          var input = document.createElement('input');
          input.className = 'ecell ecell--' + col.key;
          // quantity stays a text field so "240", "240 pcs" or "2 dz" all type
          // cleanly; the numeric keypad still comes up on a phone
          input.type = col.type === 'date' ? 'date' : 'text';
          if (col.type === 'qty') { input.inputMode = 'numeric'; input.placeholder = '0'; }
          input.value = row[col.key] || '';
          input.setAttribute('aria-label', col.label + ', row ' + (index + 1));
          if (col.key === 'remark') input.placeholder = 'Note';
          input.addEventListener('input', function () {
            row[col.key] = input.value;
            markDirty(view);
          });
          td.appendChild(input);
        }

        tr.appendChild(td);
      });

      var tdAct = document.createElement('td');
      tdAct.className = 'esheet__actcol';
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'erow-del';
      del.setAttribute('aria-label', 'Remove row ' + (index + 1));
      del.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
      del.addEventListener('click', function () {
        var list = view.data();
        var i = Array.prototype.indexOf.call(tr.parentNode.children, tr);
        list.splice(i, 1);
        tr.remove();
        markDirty(view);
      });
      tdAct.appendChild(del);
      tr.appendChild(tdAct);

      return tr;
    }

    /* ---- photo cell -------------------------------------- */
    function buildPhotoCell(view, row, td) {
      var wrap = document.createElement('div');
      wrap.className = 'photocell';

      var file = document.createElement('input');
      file.type = 'file';
      file.accept = 'image/*';
      file.hidden = true;

      function paint() {
        $$('.photocell__btn, .photocell__set', wrap).forEach(function (n) { n.remove(); });

        if (row.photo) {
          // thumbnail plus always-visible actions — a hover-only control is
          // invisible on touch, so Replace and Remove are spelled out
          var set = document.createElement('span');
          set.className = 'photocell__set';

          var thumb = document.createElement('button');
          thumb.type = 'button';
          thumb.className = 'photocell__thumb';
          thumb.setAttribute('aria-label', 'Replace photo');
          var img = document.createElement('img');
          img.src = row.photo;
          img.alt = 'Order photo';
          thumb.appendChild(img);
          thumb.addEventListener('click', function () { file.click(); });
          set.appendChild(thumb);

          var acts = document.createElement('span');
          acts.className = 'photocell__acts';

          var rep = document.createElement('button');
          rep.type = 'button';
          rep.className = 'photocell__act';
          rep.textContent = 'Replace';
          rep.addEventListener('click', function () { file.click(); });

          var rm = document.createElement('button');
          rm.type = 'button';
          rm.className = 'photocell__act photocell__act--del';
          rm.textContent = 'Remove';
          rm.addEventListener('click', function () {
            row.photo = '';
            paint();
            markDirty(view);
          });

          acts.appendChild(rep);
          acts.appendChild(rm);
          set.appendChild(acts);
          wrap.appendChild(set);
        } else {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'photocell__btn';
          btn.innerHTML =
            '<svg viewBox="0 0 24 24" aria-hidden="true">' +
            '<path d="M12 16V5m0 0L8 9m4-4l4 4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>' +
            '<span>Upload</span>';
          btn.addEventListener('click', function () { file.click(); });
          wrap.appendChild(btn);
        }
      }

      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        if (!f) return;
        if (!/^image\//.test(f.type)) { warn(view, 'That file is not an image.'); return; }

        shrinkImage(f, function (dataUrl, err) {
          if (err) { warn(view, 'Could not read that image.'); return; }
          row.photo = dataUrl;
          paint();
          markDirty(view);        // like every other cell — committed on Save
          file.value = '';
        });
      });

      wrap.appendChild(file);
      paint();
      return wrap;
    }

    /* Downscale before storing — full-size data URIs blow the
       localStorage quota after only a handful of photos. */
    function shrinkImage(fileObj, done) {
      var MAX = 320;
      var reader = new FileReader();
      reader.onerror = function () { done(null, true); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { done(null, true); };
        img.onload = function () {
          var w = img.width, h = img.height;
          var scale = Math.min(1, MAX / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * scale));
          var ch = Math.max(1, Math.round(h * scale));
          var canvas = document.createElement('canvas');
          canvas.width = cw; canvas.height = ch;
          try {
            canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
            done(canvas.toDataURL('image/jpeg', 0.72), null);
          } catch (e) { done(null, true); }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(fileObj);
    }

    /* ---- tally / save feedback ---- */
    function renderTally(view) {
      if (!view.tally) return;
      var list = view.data();
      var n = { rows: list.length, qty: 0, photo: 0, cutting: 0, sewing: 0, finishing: 0 };
      list.forEach(function (r) {
        var q = parseFloat(String(r.qty).replace(/[^\d.-]/g, ''));
        if (!isNaN(q)) n.qty += q;
        if (r.photo) n.photo++;
        if (LOTS.isDone(r.cutting))   n.cutting++;
        if (LOTS.isDone(r.sewing))    n.sewing++;
        if (LOTS.isDone(r.finishing)) n.finishing++;
      });

      view.tally.innerHTML = '';
      [['Orders', n.rows], ['Qty', n.qty], ['Photos', n.photo],
       ['Cutting', n.cutting], ['Sewing', n.sewing], ['Finishing', n.finishing]
      ].forEach(function (pair) {
        var s = document.createElement('span');
        s.textContent = pair[0] + ' ' + pair[1];
        view.tally.appendChild(s);
      });
    }

    function renderView(view) {
      if (!view.rows) return;
      view.rows.innerHTML = '';
      view.rows.appendChild(buildEditor(view));
      renderTally(view);
    }

    function renderAll() { VIEWS.forEach(renderView); }

    var savedTimer;
    function flashSaved(view, msg) {
      if (!view || !view.saved) return;
      view.saved.textContent = msg || 'Saved';
      view.saved.classList.add('is-shown');
      view.saved.classList.toggle('is-warn', !!msg);
      clearTimeout(savedTimer);
      savedTimer = setTimeout(function () { view.saved.classList.remove('is-shown'); }, msg ? 3200 : 1800);
    }

    function warn(view, msg) { flashSaved(view, msg); }

    function syncLotCards() { paintLotCards($('.lotcards')); }

    renderAll();
    syncLotCards();
    paintLotPicker();
    VIEWS.forEach(function (v) { setDirty(v, false); });

    VIEWS.forEach(function (v) {
      if (v.saveBtn) v.saveBtn.addEventListener('click', function () { saveView(v); });
    });

    // Ctrl/Cmd+S saves whichever sheet is open
    addEventListener('keydown', function (e) {
      if (!(e.key === 's' && (e.ctrlKey || e.metaKey))) return;
      var open = !customModal.hidden ? VIEWS[1] : (!panel.hidden ? VIEWS[0] : null);
      if (open && open.dirty) { e.preventDefault(); saveView(open); }
    });

    /* Rebuild the Customize menu so lots created with Add appear there. */
    function paintLotPicker() {
      var host = $('#lotDrop');
      if (!host) return;
      $$('button[data-lot]', host).forEach(function (b) { b.remove(); });
      LOTS.ids().forEach(function (id) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'menuitem');
        b.dataset.lot = id;
        b.textContent = LOTS.label(id);
        var s = document.createElement('span');
        s.textContent = LOTS.product(id);
        b.appendChild(s);
        b.addEventListener('click', function () { chooseLot(id); });
        host.appendChild(b);
      });
    }

    function chooseLot(id) {
      currentLot = String(id);
      setDirty(VIEWS[1], !!working[currentLot] && VIEWS[1].dirty);
      $('#customTitle').textContent = 'Customize ' + LOTS.label(currentLot);
      closeDrop();
      renderView(VIEWS[1]);
      openDialog(customModal);
    }

    /* ---- generic modal open/close ---- */
    var lastFocus = null;

    function openDialog(el) {
      lastFocus = document.activeElement;
      el.hidden = false;
      document.body.classList.add('is-locked');
      requestAnimationFrame(function () {
        el.classList.add('is-open');
        var p = $('.modal__panel', el);
        if (p) p.focus();
      });
    }

    function closeDialog(el) {
      if (!el || el.hidden) return;
      el.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      setTimeout(function () { el.hidden = true; }, 320);
      if (lastFocus) lastFocus.focus();
    }

    /* ---- PIN gate ---------------------------------------
       Edit opens this; edit mode only unlocks on the right PIN.
       Prototype only — a real gate belongs on the server.  */
    var pinModal = $('#pinModal');
    var pinForm  = $('#pinForm');
    var pinMsg   = $('#pinMsg');
    var pinInputs = $$('#pinBoxes input');
    var pinPending = null;

    function resetPin() {
      pinInputs.forEach(function (i) { i.value = ''; i.classList.remove('is-filled'); });
      pinForm.classList.remove('is-bad');
      pinMsg.classList.remove('is-shown');
    }

    function askPin(onOk) {
      pinPending = onOk;
      resetPin();
      openDialog(pinModal);
      setTimeout(function () { pinInputs[0].focus(); }, 80);
    }

    pinInputs.forEach(function (input, i) {
      input.addEventListener('input', function () {
        input.value = input.value.replace(/\D/g, '').slice(0, 1);
        input.classList.toggle('is-filled', input.value !== '');
        pinForm.classList.remove('is-bad');
        pinMsg.classList.remove('is-shown');
        if (input.value && i < pinInputs.length - 1) pinInputs[i + 1].focus();
        if (i === pinInputs.length - 1 && input.value) submitPin();
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !input.value && i > 0) pinInputs[i - 1].focus();
        if (e.key === 'ArrowLeft' && i > 0) pinInputs[i - 1].focus();
        if (e.key === 'ArrowRight' && i < pinInputs.length - 1) pinInputs[i + 1].focus();
      });
      input.addEventListener('paste', function (e) {
        var text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        if (!text) return;
        e.preventDefault();
        pinInputs.forEach(function (box, k) {
          if (k >= i && text[k - i]) { box.value = text[k - i]; box.classList.add('is-filled'); }
        });
        submitPin();
      });
    });

    function submitPin() {
      var entered = pinInputs.map(function (i) { return i.value; }).join('');
      if (entered.length < 4) return;

      if (entered === ADMIN_PIN) {
        closeDialog(pinModal);
        var cb = pinPending; pinPending = null;
        if (cb) setTimeout(cb, 180);
        return;
      }

      pinForm.classList.add('is-bad');
      pinMsg.textContent = 'That PIN is not recognised.';
      pinMsg.classList.add('is-shown');
      if (!reduced && pinForm.animate) {
        pinForm.animate(
          [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' },
           { transform: 'translateX(7px)' }, { transform: 'translateX(0)' }],
          { duration: 320, easing: 'ease-out' }
        );
      }
      setTimeout(function () {
        pinInputs.forEach(function (i) { i.value = ''; i.classList.remove('is-filled'); });
        pinInputs[0].focus();
      }, 340);
    }

    pinForm.addEventListener('submit', function (e) { e.preventDefault(); submitPin(); });
    $('#pinClose').addEventListener('click', function () { closeDialog(pinModal); });

    /* ---- Edit: gated by the PIN ---- */
    var editBtn = $('#adminEdit');

    function setEditing(on) {
      adminBar.classList.toggle('is-editing', on);
      editBtn.setAttribute('aria-expanded', String(on));
      editBtn.querySelector('.btn__label').textContent = on ? 'Done' : 'Edit';
      if (!on) { closeDrop(); closeDialog(customModal); setPanel(false); }
    }

    editBtn.addEventListener('click', function () {
      if (adminBar.classList.contains('is-editing')) { setEditing(false); return; }
      askPin(function () { setEditing(true); });
    });

    /* ---- Add: inline sheet ---- */
    var panel = $('#draftPanel'), addBtn = $('#adminAdd');

    function setPanel(open) {
      panel.hidden = !open;
      addBtn.setAttribute('aria-expanded', String(open));
      addBtn.querySelector('.btn__label').textContent = open ? 'Hide sheet' : 'Add';
      if (open) { closeDrop(); renderView(VIEWS[0]); }
    }

    addBtn.addEventListener('click', function () { setPanel(panel.hidden); });

    $('#draftReset').addEventListener('click', function () {
      store.draft = blankSheet();
      renderView(VIEWS[0]);
      markDirty(VIEWS[0]);
    });

    $('#draftAddRow').addEventListener('click', function () {
      var r = LOTS.blankRow();
      r.date = today();
      r.code = newCode();
      store.draft.push(r);
      appendRow(VIEWS[0], r);
      markDirty(VIEWS[0]);
    });

    var customAdd = $('#customAddRow');
    if (customAdd) {
      customAdd.addEventListener('click', function () {
        var list = LOTS.units(currentLot);
        var r = LOTS.blankRow();
        r.date = today();
        r.code = newCode();
        list.push(r);
        appendRow(VIEWS[1], r);
        markDirty(VIEWS[1]);
      });
    }

    /* Append without redrawing the sheet, so existing rows keep their place. */
    function appendRow(view, row) {
      var body = $('.esheet tbody', view.rows);
      if (!body) { renderView(view); return; }
      var tr = buildEditRow(view, row, body.children.length);
      body.appendChild(tr);
      var input = $('input', tr);
      if (input) input.focus();
    }

    /* Create lot — the draft becomes a real lot: a new card, a new
       entry in the picker, and its own page at lot.html?lot=N. */
    $('#draftCreate').addEventListener('click', function () {
      var id = LOTS.addLot(store.draft);
      store.draft = blankSheet();
      persist();
      setDirty(VIEWS[0], false);

      syncLotCards();
      paintLotPicker();
      renderView(VIEWS[0]);

      var card = $('[data-lot-card="' + id + '"]');
      if (card) {
        card.classList.add('is-in');
        card.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
        if (!reduced && card.animate) {
          card.animate(
            [{ transform: 'scale(.94)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
            { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' }
          );
        }
      }

      var note = $('#draftSaved');
      if (note) {
        note.textContent = LOTS.label(id) + ' created';
        note.classList.add('is-shown');
        setTimeout(function () { note.classList.remove('is-shown'); }, 2600);
      }
    });

    /* ---- Customize: lot picker, then the modal ---- */
    var customModal = $('#customModal');
    var customBtn = $('#adminCustomize');
    var drop = $('#lotDrop');

    function openDrop() {
      drop.hidden = false;
      drop.style.left = customBtn.offsetLeft + 'px';   // .adminbar__more clips, so anchor here
      customBtn.setAttribute('aria-expanded', 'true');
    }
    function closeDrop() {
      drop.hidden = true;
      customBtn.setAttribute('aria-expanded', 'false');
    }

    customBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      drop.hidden ? openDrop() : closeDrop();
    });

    document.addEventListener('click', function (e) {
      if (!drop.hidden && !drop.contains(e.target) && e.target !== customBtn) closeDrop();
    });

    $('#customClose').addEventListener('click', function () { closeDialog(customModal); });
    $$('[data-modal-close]').forEach(function (el) {
      el.addEventListener('click', function () { closeDialog(el.closest('.modal')); });
    });

    addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!drop.hidden) { closeDrop(); return; }
      if (!pinModal.hidden) closeDialog(pinModal);
      else closeDialog(customModal);
    });
  }

  /* ---------------------------------------------------------
     14. SAME-PAGE ANCHORS
     --------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = $(id);
    if (!target) return;
    e.preventDefault();
    scrollTo({ top: target.getBoundingClientRect().top + scrollY - 66, behavior: reduced ? 'auto' : 'smooth' });
  });

})();
