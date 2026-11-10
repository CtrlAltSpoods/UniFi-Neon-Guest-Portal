/* ==================================================================
   Holiday themes for the guest portal.
   The server decides which theme is active (holidays.js) and passes
   its id in the page config. NeonThemes.apply() builds the decorations.

   Add a theme: write a builder in THEMES below, add its palette in
   themes.css, and its date window in holidays.js.
=================================================================== */
(function () {
  'use strict';

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function div(cls, html, parent) {
    var d = document.createElement('div'); d.className = cls;
    if (html) d.innerHTML = html;
    if (parent) parent.appendChild(d);
    return d;
  }

  /* ---------------- SVG artwork ---------------- */

  function poppySVG() {
    var petal = 'M0 4 C-30 2 -36 -36 -6 -42 C4 -44 12 -43 16 -39 C38 -28 26 3 0 4Z';
    var back = [20, 200].map(function (r) { return '<path d="' + petal + '" transform="rotate(' + r + ')" fill="#b40c18"/>'; }).join('');
    var front = [110, 290].map(function (r) { return '<path d="' + petal + '" transform="rotate(' + r + ') scale(.95)" fill="#e8121f" stroke="#ff6b6b" stroke-width="1"/>'; }).join('');
    return '<svg viewBox="-50 -50 100 100" aria-hidden="true" style="filter:drop-shadow(0 0 6px rgba(255,40,50,.7))">' +
      back + front +
      '<circle r="10" fill="#140306"/><circle r="10" fill="none" stroke="#3a0a10" stroke-width="2" stroke-dasharray="2 3"/>' +
      '<circle r="3.6" fill="#55602a"/></svg>';
  }

  function santaSVG() {
    function deer(x, y) {
      return '<g>' +
        '<g class="leg" ><line x1="' + (x - 15) + '" y1="' + (y + 5) + '" x2="' + (x - 15) + '" y2="' + (y + 22) + '"/></g>' +
        '<g class="leg b"><line x1="' + (x - 9) + '" y1="' + (y + 6) + '" x2="' + (x - 9) + '" y2="' + (y + 23) + '"/></g>' +
        '<g class="leg b"><line x1="' + (x + 12) + '" y1="' + (y + 6) + '" x2="' + (x + 12) + '" y2="' + (y + 23) + '"/></g>' +
        '<g class="leg" ><line x1="' + (x + 18) + '" y1="' + (y + 5) + '" x2="' + (x + 18) + '" y2="' + (y + 22) + '"/></g>' +
        '<ellipse cx="' + x + '" cy="' + y + '" rx="24" ry="9" fill="#2a1408"/>' +
        '<path d="M' + (x + 16) + ' ' + (y - 5) + ' L' + (x + 26) + ' ' + (y - 18) + ' L' + (x + 32) + ' ' + (y - 14) + ' L' + (x + 22) + ' ' + (y + 1) + 'Z" fill="#2a1408"/>' +
        '<ellipse cx="' + (x + 34) + '" cy="' + (y - 18) + '" rx="9" ry="5" fill="#2a1408"/>' +
        '<path d="M' + (x + 28) + ' ' + (y - 22) + ' l-3 -12 M' + (x + 27) + ' ' + (y - 29) + ' l-7 -3 M' + (x + 31) + ' ' + (y - 22) + ' l3 -12 M' + (x + 33) + ' ' + (y - 30) + ' l6 -3" fill="none"/>' +
        '<path d="M' + (x - 24) + ' ' + (y - 2) + ' l-6 -4" />' +
        '</g>';
    }
    return '<svg viewBox="0 0 360 120" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="neon-glow">' +
      '<path d="M150 72 Q220 52 262 58 M150 72 Q260 62 332 50" stroke-width="1.4" opacity=".8"/>' +
      deer(250, 64) + deer(320, 54) +
      '<ellipse cx="66" cy="54" rx="18" ry="15" fill="#5a3a1a"/>' +
      '<circle cx="100" cy="54" r="17" fill="#d1122e"/>' +
      '<circle cx="104" cy="31" r="9" fill="#ffd9c2"/>' +
      '<path d="M96 34 Q104 48 113 34" fill="#fff" stroke="#fff"/>' +
      '<path d="M95 27 Q102 10 120 14 L112 25Z" fill="#d1122e"/><circle cx="121" cy="14" r="3.5" fill="#fff" stroke="#fff"/>' +
      '<path d="M114 50 L128 36" />' +
      '<path d="M44 92 L36 58 L128 58 Q150 58 148 80 L142 92 Z" fill="#7a0c1e"/>' +
      '<path d="M24 102 H150 Q172 102 170 84" stroke-width="3"/>' +
      '<path d="M60 92 v10 M130 92 v10"/>' +
      '</svg>';
  }

  function presentsSVG(flip) {
    var boxes = [
      [10, 40, 70, 60, '#d1122e', '#ffd34d'], [86, 58, 50, 42, '#169c4a', '#ff3550'],
      [140, 28, 58, 72, '#16b8d8', '#fff'], [204, 62, 46, 38, '#ffb43b', '#d1122e']
    ];
    if (flip) boxes = boxes.reverse().map(function (b, i) { b = b.slice(); b[0] = [10, 64, 120, 194][i]; return b; });
    var s = boxes.map(function (b) {
      var x = b[0], y = b[1], w = b[2], h = b[3], c = b[4], r = b[5], cx = x + w / 2;
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" fill="' + c + '" stroke="' + r + '" stroke-width="1.5"/>' +
        '<rect x="' + (cx - 4) + '" y="' + y + '" width="8" height="' + h + '" fill="' + r + '"/>' +
        '<rect x="' + x + '" y="' + (y + h * 0.35) + '" width="' + w + '" height="7" fill="' + r + '"/>' +
        '<path d="M' + cx + ' ' + y + ' q-14 -16 -18 -4 q4 8 18 4 q14 -16 18 -4 q-4 8 -18 4" fill="none" stroke="' + r + '" stroke-width="3"/>';
    }).join('');
    return '<svg viewBox="0 0 260 100" aria-hidden="true" style="filter:drop-shadow(0 0 6px rgba(255,255,255,.35)) drop-shadow(0 0 14px rgba(255,60,90,.35))">' + s + '</svg>';
  }

  function treeSVG() {
    var orn = [[50, 52, '#ff3550'], [38, 78, '#ffd34d'], [62, 84, '#16f2ff'], [30, 108, '#ff8fd6'], [56, 112, '#ffd34d'], [72, 112, '#ff3550'], [44, 132, '#16f2ff'], [66, 136, '#ff8fd6']]
      .map(function (o, i) { return '<circle class="orn" style="animation-delay:' + (i % 3) * 0.6 + 's" cx="' + o[0] + '" cy="' + o[1] + '" r="4" fill="' + o[2] + '" stroke="none"/>'; }).join('');
    return '<svg viewBox="0 0 100 165" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" class="neon-glow">' +
      '<path d="M50 18 L74 62 H60 L84 100 H66 L94 144 H6 L34 100 H16 L40 62 H26 Z" fill="#06240f"/>' +
      '<path d="M44 144 v16 h12 v-16" />' + orn +
      '<path d="M50 4 l4 9 l10 1 l-8 6 l3 10 l-9 -6 l-9 6 l3 -10 l-8 -6 l10 -1z" fill="#ffd34d" stroke="#ffd34d" stroke-width="1"/>' +
      '</svg>';
  }

  function lightsSVG() {
    var W = Math.max(360, window.innerWidth), span = W < 700 ? 130 : 190, sag = 26, top = 6, out = '', bulbs = '';
    var colors = ['#ff3550', '#3dff86', '#ffd34d', '#16f2ff', '#ff8fd6'], k = 0;
    for (var x0 = -20; x0 < W + 20; x0 += span) {
      var x1 = x0 + span;
      out += 'M' + x0 + ' ' + top + ' Q' + (x0 + span / 2) + ' ' + (top + sag * 2) + ' ' + x1 + ' ' + top + ' ';
      for (var t = 0.12; t < 0.95; t += 0.19) {
        var bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * (x0 + span / 2) + t * t * x1;
        var by = (1 - t) * (1 - t) * top + 2 * (1 - t) * t * (top + sag * 2) + t * t * top;
        var c = colors[k++ % colors.length];
        bulbs += '<g class="bulb' + (k % 2 ? ' alt' : '') + '"><rect x="' + (bx - 2.5) + '" y="' + (by - 1) + '" width="5" height="4" fill="#333"/>' +
          '<ellipse cx="' + bx + '" cy="' + (by + 8) + '" rx="4.5" ry="7" fill="' + c + '" style="filter:drop-shadow(0 0 5px ' + c + ') drop-shadow(0 0 10px ' + c + ')"/></g>';
      }
    }
    return '<svg viewBox="0 0 ' + W + ' 70" preserveAspectRatio="xMidYMin slice" aria-hidden="true">' +
      '<path d="' + out + '" fill="none" stroke="#1c3a20" stroke-width="2"/>' + bulbs + '</svg>';
  }

  function starPath(cx, cy, R, n) {
    var r = R * 0.45, d = '';
    for (var i = 0; i < n * 2; i++) {
      var a = -Math.PI / 2 + i * Math.PI / n, rad = i % 2 ? r : R;
      d += (i ? 'L' : 'M') + (cx + rad * Math.cos(a)).toFixed(1) + ' ' + (cy + rad * Math.sin(a)).toFixed(1);
    }
    return d + 'Z';
  }
  function southernCrossSVG() {
    var stars = [[50, 10, 9, 7], [46, 108, 10, 7], [12, 54, 8, 7], [84, 44, 7.5, 7], [64, 76, 4.5, 5]];
    return '<svg viewBox="0 0 100 122" aria-hidden="true">' +
      '<path d="M50 10 L46 108 M12 54 L84 44" stroke="rgba(255,255,255,.18)" stroke-width="1" stroke-dasharray="2 4"/>' +
      stars.map(function (s, i) {
        return '<path class="st" style="animation-delay:' + i * 0.5 + 's; filter:drop-shadow(0 0 4px #fff) drop-shadow(0 0 10px #ffd34d)" d="' + starPath(s[0], s[1], s[2], s[3]) + '" fill="#fff"/>';
      }).join('') + '</svg>';
  }

  function horseSVG(silk) {
    function leg(x, y, cls) {
      return '<g class="leg ' + cls + '"><path d="M' + x + ' ' + y + ' l3 18 l-5 16 l4 2"/></g>';
    }
    return '<svg viewBox="0 0 220 140" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="neon-glow"><g class="bob">' +
      leg(70, 80, '') + leg(80, 82, 'b') + leg(130, 82, 'b') + leg(140, 80, '') +
      '<path d="M54 64 Q28 58 16 86 Q36 74 54 74" fill="#120419"/>' +
      '<ellipse cx="100" cy="70" rx="48" ry="19" fill="#120419"/>' +
      '<path d="M128 60 Q140 40 152 22 L166 26 Q160 50 146 76 Z" fill="#120419"/>' +
      '<path d="M150 20 L184 32 Q190 38 182 43 L160 39 Z" fill="#120419"/>' +
      '<path d="M154 20 l4 -10 l4 10"/>' +
      '<path d="M174 34 Q150 40 132 44" stroke-width="1.4"/>' +
      '<rect x="84" y="56" width="26" height="16" rx="2" fill="#120419" stroke-width="2"/>' +
      '<path d="M98 52 L112 30 L128 40" fill="none" stroke="' + silk + '" stroke-width="7"/>' +
      '<circle cx="117" cy="22" r="6" fill="' + silk + '" stroke="' + silk + '"/>' +
      '<path d="M98 52 l12 10 l-8 6"/>' +
      '</g></svg>';
  }

  function bunnySVG() {
    return '<svg viewBox="0 0 120 100" aria-hidden="true" style="overflow:visible; filter:drop-shadow(0 0 6px #ff8fd6) drop-shadow(0 0 14px rgba(255,143,214,.6))"><g class="hop">' +
      '<ellipse cx="80" cy="18" rx="5.5" ry="17" transform="rotate(-12 80 32)" fill="#fff"/>' +
      '<ellipse cx="80" cy="19" rx="2.5" ry="12" transform="rotate(-12 80 32)" fill="#ffb3e3"/>' +
      '<ellipse cx="91" cy="20" rx="5.5" ry="17" transform="rotate(14 91 34)" fill="#f4f0ff"/>' +
      '<ellipse cx="50" cy="62" rx="30" ry="22" fill="#fff"/>' +
      '<circle cx="84" cy="46" r="15" fill="#fff"/>' +
      '<circle cx="19" cy="57" r="8" fill="#fff"/>' +
      '<circle cx="90" cy="43" r="2.4" fill="#2a1030"/><circle cx="98" cy="49" r="2" fill="#ff79c9"/>' +
      '<ellipse cx="44" cy="82" rx="17" ry="6" fill="#f4f0ff"/><ellipse cx="74" cy="80" rx="7" ry="4" fill="#f4f0ff"/>' +
      '</g></svg>';
  }

  var EGG = 'M15 1 C24 1 29 17 29 25 C29 34 23 39 15 39 C7 39 1 34 1 25 C1 17 6 1 15 1Z';
  function eggSVG(i) {
    var pal = [['#ff9fd9', '#fff3a6'], ['#9ff3dc', '#ff8fd6'], ['#c3a6ff', '#a6f0ff'], ['#ffd27f', '#9fd2ff'], ['#a6ff9f', '#ff9fb4'], ['#9fd2ff', '#fff3a6'], ['#ffb38a', '#c3a6ff']][i % 7];
    var id = 'eggclip' + i, deco;
    switch (i % 3) {
      case 0: deco = '<polyline points="0,20 5,15 10,20 15,15 20,20 25,15 30,20" fill="none" stroke="' + pal[1] + '" stroke-width="3"/><rect y="28" width="30" height="3" fill="#fff" opacity=".8"/>'; break;
      case 1: deco = '<g fill="' + pal[1] + '"><circle cx="8" cy="14" r="2.6"/><circle cx="20" cy="10" r="2.6"/><circle cx="15" cy="22" r="2.6"/><circle cx="6" cy="29" r="2.6"/><circle cx="23" cy="30" r="2.6"/></g>'; break;
      default: deco = '<rect y="12" width="30" height="4" fill="' + pal[1] + '"/><rect y="21" width="30" height="4" fill="#fff" opacity=".85"/><rect y="30" width="30" height="4" fill="' + pal[1] + '"/>';
    }
    return '<svg viewBox="0 0 30 40"><defs><clipPath id="' + id + '"><path d="' + EGG + '"/></clipPath></defs>' +
      '<path d="' + EGG + '" fill="' + pal[0] + '"/><g clip-path="url(#' + id + ')">' + deco + '</g>' +
      '<path d="' + EGG + '" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1.2"/>' +
      '<ellipse cx="10" cy="11" rx="3" ry="5" fill="#fff" opacity=".45"/></svg>';
  }

  function crownSVG() {
    return '<svg viewBox="0 0 100 72" aria-hidden="true" style="filter:drop-shadow(0 0 5px #ffd34d) drop-shadow(0 0 14px rgba(255,211,77,.6))">' +
      '<path d="M10 62 L4 18 L28 40 L50 6 L72 40 L96 18 L90 62 Z" fill="#3a2600" stroke="#ffd34d" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<rect x="9" y="55" width="82" height="9" rx="3" fill="#ffd34d"/>' +
      '<circle cx="4" cy="16" r="4.5" fill="#fff4c2"/><circle cx="50" cy="5" r="5" fill="#fff4c2"/><circle cx="96" cy="16" r="4.5" fill="#fff4c2"/>' +
      '<circle cx="30" cy="50" r="4" fill="#ff3b5c"/><circle cx="50" cy="48" r="5" fill="#16f2ff"/><circle cx="70" cy="50" r="4" fill="#3dff86"/></svg>';
  }
  function santaHatSVG() {
    return '<svg viewBox="0 0 100 82" aria-hidden="true" style="filter:drop-shadow(0 0 6px rgba(255,53,80,.8))">' +
      '<path d="M8 62 Q26 12 66 8 Q92 8 94 42 Q82 28 70 30 Q50 34 44 62Z" fill="#e0142f" stroke="#ff6b7d" stroke-width="2"/>' +
      '<rect x="0" y="56" width="74" height="18" rx="9" fill="#fff"/><circle cx="93" cy="44" r="10" fill="#fff"/></svg>';
  }
  function hardHatSVG() {
    return '<svg viewBox="0 0 100 60" aria-hidden="true" style="filter:drop-shadow(0 0 6px rgba(255,138,31,.85))">' +
      '<path d="M14 44 Q14 8 50 8 Q86 8 86 44 Z" fill="#ff8a1f" stroke="#ffd08a" stroke-width="2"/>' +
      '<path d="M44 9 h12 v35 h-12z" fill="#ffb15c"/>' +
      '<path d="M2 44 H98 Q98 53 90 53 H10 Q2 53 2 44Z" fill="#ff7a00" stroke="#ffd08a" stroke-width="2"/></svg>';
  }
  function horseshoeSVG() {
    return '<svg viewBox="0 0 80 80" aria-hidden="true" style="filter:drop-shadow(0 0 5px #ffd34d) drop-shadow(0 0 12px rgba(255,211,77,.6))">' +
      '<path d="M18 70 L14 40 Q12 10 40 10 Q68 10 66 40 L62 70" fill="none" stroke="#ffd34d" stroke-width="11" stroke-linecap="round"/>' +
      '<g fill="#3a2600"><circle cx="17" cy="34" r="2.2"/><circle cx="20" cy="52" r="2.2"/><circle cx="63" cy="34" r="2.2"/><circle cx="60" cy="52" r="2.2"/><circle cx="28" cy="18" r="2.2"/><circle cx="52" cy="18" r="2.2"/></g></svg>';
  }
  function bunnyEarsSVG() {
    return '<svg viewBox="0 0 60 72" aria-hidden="true" style="filter:drop-shadow(0 0 6px #ff8fd6)">' +
      '<ellipse cx="20" cy="34" rx="9" ry="30" transform="rotate(-12 20 64)" fill="#fff"/><ellipse cx="20" cy="36" rx="4" ry="22" transform="rotate(-12 20 64)" fill="#ffb3e3"/>' +
      '<ellipse cx="42" cy="34" rx="9" ry="30" transform="rotate(14 42 64)" fill="#fff"/><ellipse cx="42" cy="36" rx="4" ry="22" transform="rotate(14 42 64)" fill="#ffb3e3"/></svg>';
  }
  function craneSVG() {
    var lattice = '';
    for (var y = 300; y > 44; y -= 16) lattice += 'M40 ' + y + ' L56 ' + (y - 16) + ' M56 ' + y + ' L40 ' + (y - 16) + ' ';
    for (var x = 60; x < 290; x += 16) lattice += 'M' + x + ' 34 L' + (x + 16) + ' 22 ';
    return '<svg viewBox="0 0 300 300" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" class="neon-glow">' +
      '<path d="M40 300 V36 M56 300 V36 M0 22 H292 M0 34 H292 M48 22 L48 0 M48 0 L292 22 M48 0 L0 22"/>' +
      '<path d="' + lattice + '" stroke-width="1.2" opacity=".75"/>' +
      '<rect x="2" y="34" width="30" height="22" fill="#2a1400"/>' +
      '<rect x="56" y="34" width="22" height="18" fill="#2a1400"/>' +
      '<g class="hook"><path d="M146 34 h8 M150 34 V132"/><path d="M150 132 q0 12 -8 10" stroke-width="3"/>' +
      '<rect x="110" y="138" width="80" height="34" rx="4" fill="#1a0c00" stroke-width="2.5"/>' +
      '<text x="150" y="163" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="20" fill="currentColor" stroke="none" letter-spacing="2">8·8·8</text></g>' +
      '<circle class="lamp" cx="292" cy="22" r="4" fill="#ff3b5c" stroke="none"/><circle class="lamp" cx="48" cy="0" r="4" fill="#ff3b5c" stroke="none" style="animation-delay:.7s"/>' +
      '</svg>';
  }
  function buntingSVG() {
    var W = Math.max(360, window.innerWidth), out = '', cols = ['#b46bff', '#ffd34d', '#fff', '#7b3dff'], i = 0;
    for (var x = 0; x < W; x += 34) {
      var y = 4 + 16 * Math.sin(Math.PI * ((x % (W / 2)) / (W / 2)));
      out += '<path d="M' + x + ' ' + y + ' l26 0 l-13 24z" fill="' + cols[i++ % 4] + '" opacity=".9"/>';
    }
    return '<svg viewBox="0 0 ' + W + ' 60" preserveAspectRatio="xMidYMin slice" aria-hidden="true" style="filter:drop-shadow(0 0 5px rgba(255,211,77,.5))">' + out + '</svg>';
  }

  /* ---------------- particles: snow, petals, wattle, sparkle, fireworks ---------------- */
  function Particles(canvas, opts) {
    var ctx = canvas.getContext('2d'), W = 0, H = 0, list = [], rockets = [], sparks = [], running = true, nextRocket = 0;
    var mode = opts.mode, colors = opts.colors || ['#fff'];
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = mode ? Math.round(Math.min(opts.max || 140, W * H / (opts.density || 9000))) : 0;
      list = []; for (var i = 0; i < n; i++) list.push(make(true));
    }
    function make(any) {
      var p = { x: rnd(0, W), y: any ? rnd(-H, H) : rnd(-60, -10), a: rnd(0, Math.PI * 2), c: pick(colors) };
      if (mode === 'snow') { p.r = rnd(1, 3.6); p.vy = rnd(.5, 1.6); p.sw = rnd(.4, 1.4); p.o = rnd(.5, .95); }
      else if (mode === 'petals') { p.r = rnd(3, 6); p.vy = rnd(.5, 1.2); p.sw = rnd(.6, 1.6); p.spin = rnd(-.04, .04); p.o = rnd(.6, .95); }
      else if (mode === 'wattle') { p.r = rnd(2.8, 5.5); p.vy = rnd(.4, 1); p.sw = rnd(.5, 1.2); p.o = rnd(.6, 1); }
      else if (mode === 'sparkle') { p.r = rnd(.8, 2.2); p.vy = -rnd(.15, .5); p.sw = rnd(.2, .6); p.o = 0; p.y = any ? rnd(0, H) : H + 10; p.t = rnd(0, 6); }
      return p;
    }
    function burst(x, y, n, palette) {
      for (var i = 0; i < n; i++) {
        var a = rnd(0, Math.PI * 2), s = rnd(1.2, 4.6);
        sparks.push({ x: x, y: y, px: x, py: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(50, 95), age: 0, c: pick(palette) });
      }
    }
    function frame(ts) {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < list.length; i++) {
        var p = list[i]; p.a += 0.02;
        p.y += p.vy; p.x += Math.sin(p.a) * p.sw * 0.5;
        ctx.globalAlpha = p.o;
        if (mode === 'snow') {
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        } else if (mode === 'petals') {
          p.a += p.spin;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, 6.283); ctx.fill(); ctx.restore();
        } else if (mode === 'wattle') {
          ctx.fillStyle = p.c; ctx.shadowColor = '#ffd21a'; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
        } else if (mode === 'sparkle') {
          p.t += 0.05; p.o = 0.5 + 0.5 * Math.sin(p.t);
          ctx.globalAlpha = p.o; ctx.fillStyle = p.c; ctx.fillRect(p.x - p.r, p.y - .3, p.r * 2, .6 + p.r * .3); ctx.fillRect(p.x - .3, p.y - p.r, .6 + p.r * .3, p.r * 2);
        }
        if ((p.vy > 0 && p.y > H + 10) || (p.vy < 0 && p.y < -10)) list[i] = make(false);
      }
      ctx.globalAlpha = 1;

      if (opts.fireworks || sparks.length) {
        if (!ts) ts = 0;
        if (opts.fireworks && opts.fireworks.length && ts > nextRocket) {
          nextRocket = ts + rnd(500, 1400);
          rockets.push({ x: rnd(W * .08, W * .92), y: H * .82, ty: rnd(H * .08, H * .42), v: rnd(6, 9), c: pick(opts.fireworks) });
        }
        ctx.globalCompositeOperation = 'lighter';
        for (var r = rockets.length - 1; r >= 0; r--) {
          var k = rockets[r]; k.y -= k.v; k.v *= 0.985;
          ctx.fillStyle = k.c; ctx.fillRect(k.x - 1, k.y, 2, 8);
          if (k.y <= k.ty || k.v < 2) { burst(k.x, k.y, W < 600 ? 45 : 70, [k.c, k.c, '#fff', pick(opts.fireworks)]); rockets.splice(r, 1); }
        }
        ctx.lineWidth = 1.8;
        for (var s = sparks.length - 1; s >= 0; s--) {
          var q = sparks[s]; q.px = q.x; q.py = q.y;
          q.vx *= 0.975; q.vy = q.vy * 0.975 + 0.05; q.x += q.vx; q.y += q.vy; q.age++;
          ctx.globalAlpha = Math.max(0, 1 - q.age / q.life); ctx.strokeStyle = q.c;
          ctx.beginPath(); ctx.moveTo(q.px - q.vx * 2, q.py - q.vy * 2); ctx.lineTo(q.x, q.y); ctx.stroke();
          if (q.age >= q.life) sparks.splice(s, 1);
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      requestAnimationFrame(frame);
    }
    window.addEventListener('resize', size); size();
    requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', function () { var was = running; running = !document.hidden; if (running && !was) requestAnimationFrame(frame); });
    return { burst: function (x, y, palette) { burst(x, y, 70, palette); burst(x - 90, y + 40, 50, palette); burst(x + 90, y + 40, 50, palette); } };
  }

  /* ---------------- Easter egg hunt ---------------- */
  function eggHunt(layer, banner, fx) {
    var TOTAL = 6, found = 0, eggs = [];
    var count = document.createElement('span'); count.className = 'count'; banner.appendChild(count);
    function update() {
      count.textContent = found + '/' + eggs.length + ' found';
      if (eggs.length && found === eggs.length) {
        banner.firstChild.textContent = 'You found every egg — Happy Easter!';
        count.textContent = '★ ' + found + '/' + eggs.length;
        if (fx && fx.fx) fx.fx.burst(window.innerWidth / 2, window.innerHeight * 0.25, ['#ff9fd9', '#9ff3dc', '#fff3a6', '#c3a6ff']);
      }
    }
    function blocked() {
      return ['.logo', '.frame', '.banner', 'footer'].map(function (s) { var e = document.querySelector(s); return e && e.offsetParent !== null ? e.getBoundingClientRect() : null; })
        .filter(Boolean);
    }
    function place() {
      var W = window.innerWidth, H = window.innerHeight, rects = blocked(), spots = [], tries = 0;
      while (spots.length < TOTAL && tries++ < 600) {
        var x = rnd(W * .05, W * .95), y = rnd(H * .06, H * .96), ok = true;
        for (var i = 0; i < rects.length && ok; i++) { var r = rects[i]; if (x > r.left - 18 && x < r.right + 18 && y > r.top - 24 && y < r.bottom + 24) ok = false; }
        for (var j = 0; j < spots.length && ok; j++) if (Math.hypot(spots[j][0] - x, spots[j][1] - y) < 52) ok = false;
        if (ok) spots.push([x, y]);
      }
      return spots;
    }
    function build() {
      var spots = place();
      if (!eggs.length) {
        spots.forEach(function (s, i) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'egg'; b.setAttribute('aria-label', 'Hidden Easter egg');
          b.style.setProperty('--r', rnd(-25, 25).toFixed(0) + 'deg');
          b.innerHTML = eggSVG(i);
          b.addEventListener('click', function () {
            if (b.classList.contains('found')) return;
            b.classList.add('found'); found++;
            var rc = b.getBoundingClientRect();
            for (var k = 0; k < 10; k++) {
              var sp = document.createElement('i'); sp.className = 'egg-spark';
              sp.style.left = (rc.left + rc.width / 2) + 'px'; sp.style.top = (rc.top + rc.height / 2) + 'px';
              sp.style.background = pick(['#fff', '#ffcf6e', '#ff9fd9', '#9ff3dc']);
              var a = k / 10 * 6.283; sp.style.setProperty('--dx', Math.cos(a) * 40 + 'px'); sp.style.setProperty('--dy', Math.sin(a) * 40 + 'px');
              layer.appendChild(sp); setTimeout(function (e) { e.remove(); }.bind(null, sp), 900);
            }
            if (navigator.vibrate) navigator.vibrate(30);
            update();
          });
          layer.appendChild(b); eggs.push(b);
        });
      }
      eggs.forEach(function (b, i) { var s = spots[i]; if (!s) { b.style.display = 'none'; return; } b.style.display = ''; b.style.left = s[0] + 'px'; b.style.top = s[1] + 'px'; });
      update();
    }
    setTimeout(build, 1400); // after the card has risen into place
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(build, 250); });
  }

  /* ---------------- theme builders ---------------- */
  var THEMES = {
    christmas: function (L) {
      div('lights', lightsSVG(), L.front);
      div('santa', santaSVG(), L.back);
      div('presents l', presentsSVG(false), L.front);
      div('presents r', presentsSVG(true), L.front);
      div('tree', treeSVG(), L.front);
      L.deco(santaHatSVG(), { w: 15, rot: -16, dx: -3, lift: 3 });
      return { particles: { mode: 'snow', max: 170, density: 6500 }, rain: false };
    },
    newyear: function () {
      return { particles: { mode: 'sparkle', colors: ['#ffd34d', '#fff', '#ff8fd6'], max: 60, density: 16000, fireworks: ['#ff2bd6', '#16f2ff', '#ffd34d', '#3dff86', '#ff8a1f', '#b46bff', '#ffffff'] }, rain: false };
    },
    australiaday: function (L) {
      div('cross', southernCrossSVG(), L.back);
      return { particles: { mode: 'wattle', colors: ['#ffd21a', '#ffe35a', '#ffc400'], max: 110, density: 9000 }, rain: false };
    },
    adelaidecup: function (L) {
      div('horse', horseSVG('#ff2bd6'), L.front);
      div('horse h2', horseSVG('#ffd34d'), L.front);
      L.deco(horseshoeSVG(), { w: 11, rot: -14, dx: -2, lift: 2 });
      return { particles: { mode: 'sparkle', colors: ['#ffd34d', '#fff'], max: 60, density: 16000 }, rain: true };
    },
    easter: function (L) {
      div('bunny-run', bunnySVG(), L.front);
      L.deco(bunnyEarsSVG(), { w: 9, rot: -10, dx: 0, lift: 1 });
      eggHunt(L.front, L.banner, L);
      return { particles: { mode: 'sparkle', colors: ['#ff9fd9', '#9ff3dc', '#fff3a6', '#c3a6ff'], max: 70, density: 14000 }, rain: false, fxRef: true };
    },
    anzac: function (L) { return remembrance(L); },
    remembrance: function (L) { return remembrance(L); },
    kings: function (L) {
      div('bunting', buntingSVG(), L.front);
      L.deco(crownSVG(), { w: 15, rot: -14, dx: -3, lift: 2 });
      return { particles: { mode: 'sparkle', colors: ['#ffd34d', '#fff4c2', '#c9a0ff'], max: 70, density: 13000 }, rain: true };
    },
    labour: function (L) {
      div('crane l', craneSVG(), L.mid);
      div('crane r', craneSVG(), L.mid);
      L.deco(hardHatSVG(), { w: 15, rot: -12, dx: -3, lift: 1 });
      return { rain: true };
    }
  };

  function remembrance(L) {
    var field = div('poppies', '', L.front), n = Math.max(7, Math.round(window.innerWidth / 70));
    for (var i = 0; i < n; i++) {
      var s = rnd(26, 46), stem = div('poppy-stem', '', field);
      stem.style.left = (i / n * 100 + rnd(-2, 2)) + '%';
      stem.style.width = s + 'px';
      stem.style.animationDelay = (-rnd(0, 4)) + 's';
      stem.innerHTML = '<svg viewBox="0 0 40 90" style="overflow:visible"><path d="M20 30 Q' + rnd(14, 26) + ' 60 20 90" stroke="#2f7a3a" stroke-width="2.5" fill="none"/>' +
        '<g transform="translate(20 22) scale(.36)">' + poppySVG().replace(/^<svg[^>]*>|<\/svg>$/g, '') + '</g></svg>';
    }
    var icon = document.createElement('span'); icon.innerHTML = poppySVG(); L.banner.insertBefore(icon.firstChild, L.banner.firstChild);
    return { particles: { mode: 'petals', colors: ['#e8121f', '#b40c18', '#ff3340'], max: 40, density: 22000 }, rain: false };
  }

  /* ---------------- entry point ---------------- */
  window.NeonThemes = {
    apply: function (cfg, opts) {
      var id = cfg && cfg.theme;
      if (!id || id === 'none' || !THEMES[id]) return { rain: true };
      document.body.classList.add('t-' + id);
      document.body.setAttribute('data-theme', id);

      var scene = document.querySelector('.scene');
      function layer(after) { var d = div('fx'); after.parentNode.insertBefore(d, after.nextSibling); return d; }
      var L = {
        back: layer(document.querySelector('.moon')),
        mid: layer(document.getElementById('layerMid')),
        front: layer(document.getElementById('street'))
      };

      // greeting banner between the logo and the card
      var banner = document.createElement('div');
      banner.className = 'banner' + (cfg.banner ? ' on' : '');
      banner.setAttribute('role', 'status');
      banner.appendChild(document.createTextNode(cfg.banner || ''));
      var frame = document.querySelector('.frame'); frame.parentNode.insertBefore(banner, frame);
      L.banner = banner;

      // decoration perched on the first letter of the logo
      var logo = document.querySelector('.logo');
      L.deco = function (svg, o) {
        var leftPct = (300 - (opts.topLen || 540) / 2) / 600 * 100;
        var d = div('logo-deco', svg, logo);
        d.style.width = o.w + '%';
        d.style.left = (leftPct + (o.dx || 0)) + '%';
        d.style.bottom = (100 - 38 + (o.lift || 0)) + '%';
        d.style.transform = 'rotate(' + (o.rot || 0) + 'deg)';
      };

      var res = THEMES[id](L) || {};
      if (res.particles && !opts.reduce) {
        var cv = document.createElement('canvas'); cv.id = 'fxCanvas';
        var rain = document.getElementById('rain'); rain.parentNode.insertBefore(cv, rain.nextSibling);
        var fx = Particles(cv, res.particles);
        if (id === 'easter') L.fx = fx;
      }
      return { rain: res.rain !== false };
    }
  };
})();
