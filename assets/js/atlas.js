/*
 * Standards atlas.
 *
 * Everything is server-rendered and every card is a real anchor, so the page is
 * already a complete linked index before this file runs. What it adds is the
 * navigation: one folder on screen at a time, a connector to the folder you
 * picked, a search that jumps straight to a standard, and keyboard movement.
 *
 * Two rules kept throughout. A card never changes its order, so the folder you
 * came back to looks the way you left it. And no state lives only in
 * JavaScript: the folder and the open standard are both in the URL, so any view
 * can be linked to.
 */
(function () {
  'use strict';

  var atlas = document.getElementById('atlas');
  if (!atlas) return;

  var stage = document.getElementById('stage');
  var lane = stage.querySelector('.lane');
  var branches = document.getElementById('branches');
  var trail = document.getElementById('trail');
  var panel = document.getElementById('panel');
  var panelBody = document.getElementById('panel-body');
  var panelClose = document.getElementById('panel-close');
  var hunt = document.getElementById('hunt-input');
  var huntList = document.getElementById('hunt-list');
  var huntBox = hunt.parentNode;
  var wire = document.getElementById('wire');
  var wirePath = document.getElementById('wire-path');

  var tiles = slice(atlas.querySelectorAll('.tile'));
  var sections = slice(branches.querySelectorAll('.branch'));
  var cards = slice(branches.querySelectorAll('.card'));

  var byId = {};
  cards.forEach(function (c) { byId[c.dataset.id] = c; });

  var titleOf = {};
  tiles.forEach(function (t) { titleOf[t.dataset.section] = t.querySelector('.tile__name').textContent; });

  var current = null;   // active section key
  var open = null;      // open card
  var hits = [];        // current search results
  var hitAt = -1;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function ease() { return reduce.matches ? 'auto' : 'smooth'; }

  // JavaScript is here, so the one-folder-at-a-time layout can take over. Until
  // this line the stylesheet shows every folder stacked, which is what a reader
  // without JavaScript gets.
  atlas.classList.add('is-live');

  // ---- folders --------------------------------------------------------------

  function showSection(key, opts) {
    if (!key || !titleOf[key]) return;
    var changed = current !== key;
    current = key;

    tiles.forEach(function (t) { t.classList.toggle('is-on', t.dataset.section === key); });
    sections.forEach(function (s) { s.classList.toggle('is-on', s.dataset.section === key); });

    if (changed) {
      branches.scrollTop = 0;
      var live = document.getElementById('branch-' + key);
      if (live) {
        live.classList.remove('is-fresh');
        // restart the entrance animation for the folder just picked
        void live.offsetWidth;
        live.classList.add('is-fresh');
        // and take the class off once it has played: an animated transform
        // leaves a containing block behind, which quietly changes what the
        // cards measure their position against. The heading is still sliding
        // while that runs, so the connector has to be drawn again at the end
        // or it points at where the heading was, not where it landed.
        window.setTimeout(function () {
          live.classList.remove('is-fresh');
          drawWire();
        }, 450);
      }
    }

    paintTrail();
    drawWire();
    if (opts && opts.focus) {
      var first = visibleCards()[0];
      if (first) first.focus({ preventScroll: true });
    }
    if (changed && open && open.dataset.section !== key) closePanel();
    remember();
  }

  function paintTrail() {
    var b = ['<button type="button" class="trail__root" data-goto-root>Standards</button>'];
    if (current) {
      b.push('<span class="trail__sep" aria-hidden="true">/</span>');
      b.push('<span class="trail__step" data-section="' + esc(current) + '">' + esc(titleOf[current]) + '</span>');
    }
    if (open) {
      if (open.dataset.group) {
        b.push('<span class="trail__sep" aria-hidden="true">/</span>');
        b.push('<span class="trail__step trail__step--quiet">' + esc(open.dataset.group) + '</span>');
      }
      b.push('<span class="trail__sep" aria-hidden="true">/</span>');
      b.push('<span class="trail__step trail__step--now">' + esc(open.dataset.title) + '</span>');
    }
    trail.innerHTML = b.join('');
  }

  trail.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-goto-root]') : null;
    if (t) { closePanel(); showSection(current || tiles[0].dataset.section); }
  });

  tiles.forEach(function (tile) {
    tile.addEventListener('click', function (e) {
      e.preventDefault();
      showSection(tile.dataset.section);
    });
  });

  // ---- the connector --------------------------------------------------------

  function drawWire() {
    var tile = current ? document.getElementById('tile-' + current) : null;
    // The heading text, not the header box. The box carries its own top padding
    // for the sticky edge, so anchoring to it lands the curve above the words.
    var head = current ? document.querySelector('#branch-' + current + ' .branch__title') : null;
    if (!tile || !head || stage.clientWidth < 860) { wire.style.opacity = 0; return; }

    var s = stage.getBoundingClientRect();
    var a = tile.getBoundingClientRect();
    var b = head.getBoundingClientRect();

    var x1 = a.right - s.left;
    var y1 = a.top + a.height / 2 - s.top;
    var x2 = b.left - s.left - 8;   // stop short of the text rather than touch it
    var y2 = b.top + b.height / 2 - s.top;
    var mid = x1 + (x2 - x1) * 0.55;

    wire.setAttribute('viewBox', '0 0 ' + s.width + ' ' + s.height);
    wire.setAttribute('width', s.width);
    wire.setAttribute('height', s.height);
    wirePath.setAttribute('d', 'M' + x1 + ',' + y1 + ' C' + mid + ',' + y1 + ' ' + mid + ',' + y2 + ' ' + x2 + ',' + y2);
    wire.style.opacity = 1;
  }

  // Redraw when the stage changes size. A ResizeObserver rather than a resize
  // listener because the stage also narrows when the panel opens, which the
  // window never hears about.
  if (window.ResizeObserver) {
    new window.ResizeObserver(drawWire).observe(stage);
  } else {
    window.addEventListener('resize', drawWire);
  }

  // The rail is the only scroller that moves an endpoint. The folder heading is
  // sticky at the top of its own scrollport, so scrolling the cards never moves
  // it and does not need a redraw.
  lane.addEventListener('scroll', frameOnce(drawWire), { passive: true });

  // Coalesce bursts of events into one redraw per frame, so a scroll does not
  // measure the layout more often than it can be painted.
  function frameOnce(fn) {
    var queued = false;
    return function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; fn(); });
    };
  }

  // ---- opening a standard ---------------------------------------------------

  function related(card) {
    var out = [], seenId = {};
    var outbound = list(card.dataset.related);
    outbound.concat(list(card.dataset.refs)).forEach(function (id) {
      if (seenId[id] || !byId[id] || id === card.dataset.id) return;
      seenId[id] = true;
      out.push(byId[id]);
    });
    return { all: out, outbound: outbound };
  }

  function openCard(card) {
    open = card;

    cards.forEach(function (c) { c.classList.remove('is-open', 'is-linked'); });
    card.classList.add('is-open');

    var rel = related(card);
    rel.all.forEach(function (c) { c.classList.add('is-linked'); });

    describe(card, rel);
    atlas.classList.add('has-panel');
    panel.scrollTop = 0;
    paintTrail();
    remember();
  }

  function closePanel() {
    open = null;
    cards.forEach(function (c) { c.classList.remove('is-open', 'is-linked'); });
    atlas.classList.remove('has-panel');
    panelBody.innerHTML = '';
    paintTrail();
    remember();
  }

  panelClose.addEventListener('click', function () {
    var back = open;
    closePanel();
    if (back) back.focus({ preventScroll: true });
  });

  function describe(card, rel) {
    var d = card.dataset;
    var url = card.getAttribute('href');
    var tags = (d.tags || '').split(' ').filter(Boolean);

    var to = rel.all.filter(function (c) { return rel.outbound.indexOf(c.dataset.id) !== -1; });
    var from = rel.all.filter(function (c) { return rel.outbound.indexOf(c.dataset.id) === -1; });

    function refRow(c) {
      var away = c.dataset.section !== d.section;
      return '<li><button type="button" class="ref" data-goto="' + esc(c.dataset.id) + '">' +
        '<span class="ref__dot" data-section="' + esc(c.dataset.section) + '"></span>' +
        '<span class="ref__title">' + esc(c.dataset.title) + '</span>' +
        (away ? '<span class="ref__where">' + esc(titleOf[c.dataset.section] || c.dataset.section) + '</span>' : '') +
        '</button></li>';
    }

    var b = [];
    b.push('<p class="panel__eyebrow"><span class="panel__dot" data-section="' + esc(d.section) + '"></span>' +
      esc(titleOf[d.section] || d.section) + (d.group ? ' / ' + esc(d.group) : '') + '</p>');
    b.push('<h2 class="panel__title">' + esc(d.title) + '</h2>');
    b.push('<p class="panel__summary">' + esc(d.summary) + '</p>');

    // One button, not two. It opens in a new tab and says so with the icon, so
    // the atlas keeps your place instead of being navigated away from.
    b.push('<p class="panel__actions">' +
      '<a class="btn btn--primary" href="' + url + '" target="_blank" rel="noopener">Read it' +
      '<svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true" focusable="false"><path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5A1.75 1.75 0 0 1 3.75 2Zm6.5-1h4a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0V3.56L8.28 8.78a.75.75 0 0 1-1.06-1.06L12.44 2.5H10.25a.75.75 0 0 1 0-1.5Z"/></svg>' +
      '</a></p>');

    b.push('<dl class="panel__facts">');
    b.push('<dt>Id</dt><dd><code>' + esc(d.id) + '</code></dd>');
    b.push('<dt>Status</dt><dd>' + esc(d.status) + '</dd>');
    b.push('<dt>Binds</dt><dd>' + esc(list(d.binds).join(', ') || 'anything') + '</dd>');
    b.push('<dt>Enforced</dt><dd>' + esc(d.enforced) + '</dd>');
    if (tags.length) {
      b.push('<dt>Tags</dt><dd>' + tags.map(function (t) {
        return '<span class="tag">' + esc(t) + '</span>';
      }).join(' ') + '</dd>');
    }
    b.push('</dl>');

    // Routes rather than link plumbing. The two directions are worth telling
    // apart, and naming them as directions of travel is what makes the panel
    // read as somewhere to go next rather than a metadata dump.
    if (to.length) {
      b.push('<p class="panel__label">Where this leads<span>' + to.length + '</span></p>');
      b.push('<ul class="refs">' + to.map(refRow).join('') + '</ul>');
    }
    if (from.length) {
      b.push('<p class="panel__label">What leads here<span>' + from.length + '</span></p>');
      b.push('<ul class="refs">' + from.map(refRow).join('') + '</ul>');
    }
    if (!rel.all.length) {
      b.push('<p class="panel__note">A dead end, for now. Nothing leads here and this leads nowhere else.</p>');
    } else if (rel.all.length === 1 && related(rel.all[0]).all.length === 1) {
      b.push('<p class="panel__note">This one and <strong>' + esc(rel.all[0].dataset.title) +
        '</strong> lead to each other, and nothing else reaches either.</p>');
    }

    panelBody.innerHTML = b.join('');
  }

  // Delegated, so replacing the panel body does not mean rebinding a listener
  // per reference every time a card is opened.
  panelBody.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-goto]');
    if (btn) goTo(btn.getAttribute('data-goto'));
  });

  // Jump to a standard wherever it lives: switch folder if needed, bring the
  // card into view, open it.
  function goTo(id) {
    var card = byId[id];
    if (!card) return;
    showSection(card.dataset.section);
    openCard(card);
    card.scrollIntoView({ block: 'center', behavior: ease() });
    card.focus({ preventScroll: true });
  }

  cards.forEach(function (card) {
    card.addEventListener('click', function (e) {
      // leave the browser's own open-elsewhere gestures alone
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      if (open === card) { closePanel(); return; }
      openCard(card);
    });
  });

  // ---- search ---------------------------------------------------------------

  function runSearch() {
    var q = hunt.value.trim().toLowerCase();
    hitAt = -1;

    if (!q) { hideHits(); return; }

    hits = cards.filter(function (c) {
      return (c.getAttribute('data-search') || '').indexOf(q) !== -1;
    }).sort(function (a, b) {
      // a title match beats a match buried in the summary
      var ai = a.dataset.title.toLowerCase().indexOf(q);
      var bi = b.dataset.title.toLowerCase().indexOf(q);
      if ((ai === -1) !== (bi === -1)) return ai === -1 ? 1 : -1;
      return ai - bi;
    }).slice(0, 10);

    if (!hits.length) {
      huntList.innerHTML = '<li class="hunt__none">Nothing matches <b>' + esc(hunt.value.trim()) + '</b></li>';
      showHits();
      return;
    }

    huntList.innerHTML = hits.map(function (c, i) {
      return '<li role="option" id="hit-' + i + '" aria-selected="false">' +
        '<button type="button" class="hunt__hit" data-goto="' + esc(c.dataset.id) + '">' +
        '<span class="hunt__dot" data-section="' + esc(c.dataset.section) + '"></span>' +
        '<span class="hunt__name">' + mark(c.dataset.title, q) + '</span>' +
        '<span class="hunt__where">' + esc(titleOf[c.dataset.section] || '') + '</span>' +
        '<code class="hunt__id">' + esc(c.dataset.id) + '</code>' +
        '</button></li>';
    }).join('');

    showHits();
  }

  // Also delegated. The list is rewritten on every keystroke, so binding per
  // result would attach a fresh listener for every character typed.
  huntList.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-goto]');
    if (!btn) return;
    goTo(btn.getAttribute('data-goto'));
    hunt.value = '';
    hideHits();
  });

  function mark(text, q) {
    var i = text.toLowerCase().indexOf(q);
    if (i === -1) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }

  function showHits() {
    huntList.hidden = false;
    huntBox.setAttribute('aria-expanded', 'true');
  }

  function hideHits() {
    huntList.hidden = true;
    huntList.innerHTML = '';
    huntBox.setAttribute('aria-expanded', 'false');
    hunt.removeAttribute('aria-activedescendant');
    hits = [];
    hitAt = -1;
  }

  function moveHit(step) {
    if (!hits.length) return;
    hitAt = (hitAt + step + hits.length) % hits.length;
    slice(huntList.querySelectorAll('li')).forEach(function (li, i) {
      li.classList.toggle('is-on', i === hitAt);
      li.setAttribute('aria-selected', String(i === hitAt));
    });
    var on = huntList.querySelector('li.is-on');
    if (on) {
      on.scrollIntoView({ block: 'nearest' });
      // Focus stays in the input while the highlight moves, so the highlighted
      // option has to be named for a screen reader to follow along.
      hunt.setAttribute('aria-activedescendant', on.id);
    }
  }

  hunt.addEventListener('input', runSearch);
  hunt.addEventListener('focus', function () { if (hunt.value.trim()) runSearch(); });

  hunt.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveHit(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); moveHit(-1); return; }
    if (e.key === 'Enter') {
      var pick = hits[hitAt < 0 ? 0 : hitAt];
      if (pick) { e.preventDefault(); goTo(pick.dataset.id); hunt.value = ''; hideHits(); hunt.blur(); }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (hunt.value) { hunt.value = ''; hideHits(); } else { hunt.blur(); }
    }
  });

  document.addEventListener('click', function (e) {
    if (!huntBox.contains(e.target)) hideHits();
  });

  // ---- keyboard -------------------------------------------------------------

  function visibleCards() {
    var live = document.getElementById('branch-' + current);
    return live ? slice(live.querySelectorAll('.card')) : [];
  }

  // Grid movement. Rows are read off the laid-out geometry rather than from a
  // column count, so it stays right at every breakpoint and across the group
  // headings that break the grid into several containers.
  //
  // It has to be getBoundingClientRect rather than offsetTop: the cards sit in
  // one grid per sub-group, so offsets are measured against different parents
  // and are not comparable. Viewport coordinates are.
  function step(from, key) {
    var all = visibleCards();
    var i = all.indexOf(from);
    if (i === -1) return null;

    if (key === 'ArrowRight') return all[Math.min(i + 1, all.length - 1)];
    if (key === 'ArrowLeft') return all[Math.max(i - 1, 0)];

    // Measure once. Reading a rect inside every filter and comparator asks the
    // browser for the same layout over and over on a single key press.
    var here = from.getBoundingClientRect();
    var down = key === 'ArrowDown';
    var boxes = all.map(function (c) {
      var r = c.getBoundingClientRect();
      return { el: c, top: r.top, left: r.left };
    });

    var pool = boxes.filter(function (b) {
      return down ? b.top > here.top + 4 : b.top < here.top - 4;
    });
    if (!pool.length) return null;

    var tops = pool.map(function (b) { return b.top; });
    var edge = down ? Math.min.apply(null, tops) : Math.max.apply(null, tops);

    var row = pool.filter(function (b) { return Math.abs(b.top - edge) < 4; });

    return row.reduce(function (best, b) {
      return Math.abs(b.left - here.left) < Math.abs(best.left - here.left) ? b : best;
    }, row[0]).el;
  }

  document.addEventListener('keydown', function (e) {
    var typing = e.target === hunt || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);

    if (e.key === '/' && !typing) {
      e.preventDefault();
      hunt.focus();
      hunt.select();
      return;
    }

    if (e.key === 'Escape' && !typing) {
      if (open) { var back = open; closePanel(); back.focus({ preventScroll: true }); }
      return;
    }

    if (!typing && /^[1-9]$/.test(e.key)) {
      var tile = tiles[parseInt(e.key, 10) - 1];
      if (tile) { e.preventDefault(); showSection(tile.dataset.section, { focus: true }); }
      return;
    }

    if (typing) return;

    if (/^Arrow(Up|Down|Left|Right)$/.test(e.key)) {
      var here = document.activeElement && document.activeElement.classList &&
                 document.activeElement.classList.contains('card') ? document.activeElement : null;
      if (!here) {
        var first = visibleCards()[0];
        if (first) { e.preventDefault(); first.focus(); }
        return;
      }
      var next = step(here, e.key);
      if (next) {
        e.preventDefault();
        next.focus({ preventScroll: true });
        next.scrollIntoView({ block: 'nearest', behavior: ease() });
        if (open) openCard(next);
      }
    }
  });

  // ---- the URL --------------------------------------------------------------

  function remember() {
    if (!history.replaceState) return;
    var h = open ? '#' + open.dataset.id : (current ? '#folder-' + current : '');
    history.replaceState(null, '', location.pathname + h);
  }

  function restore() {
    var h = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    if (h.indexOf('folder-') === 0 && titleOf[h.slice(7)]) { showSection(h.slice(7)); return true; }
    if (h.indexOf('branch-') === 0 && titleOf[h.slice(7)]) { showSection(h.slice(7)); return true; }
    if (byId[h]) { goTo(h); return true; }
    return false;
  }

  // ---- go -------------------------------------------------------------------

  if (!restore()) showSection(tiles[0].dataset.section);
  requestAnimationFrame(drawWire);

  function slice(x) { return Array.prototype.slice.call(x); }

  function list(v) {
    return (v || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
