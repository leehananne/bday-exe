/* BDAY.EXE preview helpers: shapes, pixel avatars, placeholder QR, demo timers, reactions, nudges.
   Plain DOM, no React. Call BDAY.mount(rootElement) once from a preview. */
(function () {
  var SHAPES = {
    a: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 22 21H2z"/></svg>',
    b: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 22 12 12 22 2 12z"/></svg>',
    c: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/></svg>',
    d: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18"/></svg>'
  };
  var NAMES = { a: 'triangle', b: 'diamond', c: 'circle', d: 'square' };

  /* 8x8 pixel avatars. 1 = main colour, 2 = second colour, k = dark, w = white */
  var AV = [
    { n: 'Cake', c1: 'favourite', c2: 'answer-a', g: ['...2....', '...1....', '.wwwwww.', '.w2ww2w.', '.111111.', '.k1kk1k.', '.111111.', 'kkkkkkkk'] },
    { n: 'Ghost', c1: 'on-answer', c2: 'answer-b', g: ['..1111..', '.111111.', '11k11k11', '11k11k11', '11111111', '11122111', '11111111', '1.11.11.'] },
    { n: 'Alien', c1: 'answer-d', c2: 'favourite', g: ['k......k', '.k1111k.', '11111111', '1kk11kk1', '1k2112k1', '11111111', '.11kk11.', '..1111..'] },
    { n: 'Frog', c1: 'answer-d', c2: 'on-answer', g: ['.22..22.', '2kk22kk2', '22222222', '11111111', '1kkkkkk1', '11111111', '.111111.', '1.1..1.1'] },
    { n: 'Star', c1: 'favourite', c2: 'answer-a', g: ['...11...', '...11...', '11111111', '.1k11k1.', '..1111..', '.112211.', '.11..11.', '11....11'] },
    { n: 'Cat', c1: 'answer-c', c2: 'favourite', g: ['1......1', '11....11', '11111111', '1k1111k1', '11122111', '1k1kk1k1', '.111111.', '..1..1..'] },
    { n: 'Robot', c1: 'answer-b', c2: 'answer-a', g: ['...22...', '...k....', '11111111', '1ww11ww1', '1wk11kw1', '11111111', '1kkkkkk1', '.11..11.'] },
    { n: 'Floppy', c1: 'answer-a', c2: 'on-answer', g: ['11111111', '1kkkkk11', '1kkk2k11', '1kkkkk11', '11111111', '1222222.', '1222222.', '11111111'] }
  ];
  function avatar(i) {
    var a = AV[((i % AV.length) + AV.length) % AV.length], s = '';
    for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) {
      var ch = a.g[y][x], col = ch === '1' ? a.c1 : ch === '2' ? a.c2 : ch === 'k' ? 'on-favourite' : ch === 'w' ? 'on-answer' : null;
      if (col) s += '<rect x="' + x + '" y="' + y + '" width="1.02" height="1.02" style="fill:var(--' + col + ')"/>';
    }
    return '<svg viewBox="0 0 8 8" shape-rendering="crispEdges" role="img" aria-label="' + a.n + ' avatar">' + s + '</svg>';
  }

  /* Placeholder QR: right shape, NOT scannable. Real build: generate from the join URL. */
  function qr(seed, size) {
    var n = 25, m = [], r = seed || 24, s = '';
    function rnd() { r = (r * 9301 + 49297) % 233280; return r / 233280; }
    for (var y = 0; y < n; y++) { m[y] = []; for (var x = 0; x < n; x++) m[y][x] = rnd() > 0.52; }
    function finder(ox, oy) {
      for (var y = -1; y < 8; y++) for (var x = -1; x < 8; x++) {
        var X = ox + x, Y = oy + y; if (X < 0 || Y < 0 || X >= n || Y >= n) continue;
        var ring = Math.max(Math.abs(x - 3), Math.abs(y - 3));
        m[Y][X] = ring === 3 || ring <= 1;
        if (x === -1 || y === -1 || x === 7 || y === 7) m[Y][X] = false;
      }
    }
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
    for (var yy = 0; yy < n; yy++) for (var xx = 0; xx < n; xx++) if (m[yy][xx]) s += 'M' + xx + ' ' + yy + 'h1v1h-1z';
    var px = size || 220;
    return '<svg width="' + px + '" height="' + px + '" viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges" role="img" aria-label="QR code to join (placeholder)"><path d="' + s + '" style="fill:var(--qr-ink)"/></svg>';
  }

  function countdown(el) {
    var total = +el.getAttribute('data-bx-countdown') || 20, start = el.hasAttribute('data-start') ? +el.getAttribute('data-start') : total, left = start;
    var secs = el.querySelector('.bx-timer__secs, [data-bx-secs]'), fill = el.querySelector('.bx-progress__fill');
    function paint() {
      if (secs) secs.textContent = (left < 10 ? '0' : '') + left;
      if (fill) fill.style.width = (left / total * 100) + '%';
      el.classList.toggle('is-urgent', left <= 5 && left > 0);
      el.classList.toggle('is-done', left === 0);
    }
    paint();
    if (el.hasAttribute('data-static')) return;
    setInterval(function () { left = left <= 0 ? start : left - 1; paint(); }, 1000);
  }

  var FEED = [['😂', 'Priya'], ['💀', 'Marcus'], [':P', 'Jo'], ['🎂', 'Wei Ling'], ['🔥', 'Dev'], ['(Y)', 'Sam'], ['😭', 'Hana'], ['🤡', 'Ollie'], ['💅', 'Bea'], [';)', 'Kai']];
  function reactions(stage) {
    var i = 0, w = stage.clientWidth || 300;
    function spawn() {
      var f = FEED[i % FEED.length], d = document.createElement('div');
      d.className = 'bx-float';
      d.style.left = (12 + ((i * 97) % Math.max(40, w - 180))) + 'px';
      d.innerHTML = '<span class="bx-avatar bx-avatar--sm">' + avatar(i) + '</span><span class="e">' + f[0] + '</span>' + f[1];
      stage.appendChild(d); i++;
      setTimeout(function () { d.remove(); }, 2500);
    }
    spawn(); setInterval(spawn, 700);
  }

  function nudge(el) {
    var every = +el.getAttribute('data-bx-nudge') || 3000;
    setInterval(function () { el.classList.remove('bx-anim-nudge'); void el.offsetWidth; el.classList.add('bx-anim-nudge'); }, every);
  }

  function confetti(el) {
    var cols = ['answer-a', 'answer-b', 'answer-c', 'answer-d', 'favourite'], s = '';
    for (var i = 0; i < 40; i++) s += '<i style="left:' + ((i * 37) % 100) + '%;background:var(--' + cols[i % 5] + ');animation-delay:-' + ((i * 0.31) % 4).toFixed(2) + 's;animation-duration:' + (3 + (i % 5) * 0.4) + 's"></i>';
    el.innerHTML = s;
  }

  function rain(el) {
    var s = '';
    for (var i = 0; i < 22; i++) s += '<i class="' + (i % 3 === 0 ? 'ingot' : '') + '" style="left:' + ((i * 43) % 96) + '%;animation-delay:-' + ((i * 0.37) % 3).toFixed(2) + 's;animation-duration:' + (2.4 + (i % 4) * 0.3) + 's"></i>';
    el.innerHTML = s;
  }

  function mount(root) {
    root = root || document;
    root.querySelectorAll('[data-bx-shape]').forEach(function (e) { var k = e.getAttribute('data-bx-shape'); e.innerHTML = SHAPES[k] + '<span class="bx-sr">' + k.toUpperCase() + ', ' + NAMES[k] + '</span>'; });
    root.querySelectorAll('[data-bx-avatar]').forEach(function (e) { e.innerHTML = avatar(+e.getAttribute('data-bx-avatar')); });
    root.querySelectorAll('[data-bx-qr]').forEach(function (e) { e.innerHTML = qr(+e.getAttribute('data-bx-qr'), +e.getAttribute('data-size') || 220); });
    root.querySelectorAll('[data-bx-countdown]').forEach(countdown);
    root.querySelectorAll('[data-bx-react-stage]').forEach(reactions);
    root.querySelectorAll('[data-bx-nudge]').forEach(nudge);
    root.querySelectorAll('[data-bx-confetti]').forEach(confetti);
    root.querySelectorAll('[data-bx-rain]').forEach(rain);
  }

  window.BDAY = { mount: mount, avatar: avatar, qr: qr, shapes: SHAPES, avatars: AV.map(function (a) { return a.n; }) };
})();
