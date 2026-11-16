// Animasjoner av ekte stillstandsdata. Dataene ligger i images/traces.js, skrevet av
// tools/make_traces.py fra Still Standing-depositumet. Hvert <canvas data-anim="..."> tegnes når
// lysbildet vises; data-speed er datasekunder per virkelig sekund. Med ?fragments=false (PDF-en)
// tegnes sluttbildet med en gang. Fargene leses fra CSS-variablene, så mørk modus følger med.
// Tast L på et lysbilde med animasjon, så sonifiseres de samme tallene med Web Audio (se SOUND nedenfor).
(function () {
  var T = window.TRACES;
  if (!T) return;
  var STATIC = /[?&]fragments=false\b/.test(location.search);
  var FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

  function css(name, fb) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fb;
  }
  function col() {
    return { ink: css('--r-main-color', '#363644'), accent: css('--accent', '#5a4fcf'),
             muted: css('--muted', '#718096'), purple: css('--mm-purple', '#A7A1F4'), green: css('--good', '#2f855a') };
  }
  function nb(v, dec) { return v.toFixed(dec).replace('.', ',').replace('-', '−'); }
  function mmss(s) { s = Math.max(0, Math.floor(s)); var m = Math.floor(s / 60); return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }

  function setup(c) {
    var W = +c.getAttribute('width'), H = +c.getAttribute('height'), dpr = 2;
    c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px';
    var ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    return { c: c, ctx: ctx, W: W, H: H, t: 0, cur: 0 };
  }
  function clear(s) { s.ctx.clearRect(0, 0, s.W, s.H); s.cur = 0; }

  // Tegner hodets bane sett ovenfra inne i boksen (x0, y0, w, h); inkrementelt fra s.cur.
  function pathTo(s, box, X, Y, fs, tEnd, color, scale, lw) {
    var ctx = s.ctx, n = Math.min(X.length, Math.floor(tEnd * fs) + 1);
    if (n <= s.cur) return;
    var cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
    var i0 = Math.max(0, s.cur - 1);
    ctx.moveTo(cx + X[i0] * scale, cy - Y[i0] * scale);
    for (var i = i0 + 1; i < n; i++) ctx.lineTo(cx + X[i] * scale, cy - Y[i] * scale);
    ctx.stroke(); ctx.restore();
    s.cur = n;
  }
  function extent(X, Y) {
    var m = 1;
    for (var i = 0; i < X.length; i++) { var a = Math.abs(X[i]), b = Math.abs(Y[i]); if (a > m) m = a; if (b > m) m = b; }
    return m;
  }
  // Målestokk: en strek på px piksler fra x, med etiketten under; anchor er 'left', 'center' eller 'right'.
  function scaleBar(s, x, y, px, label, anchor) {
    var ctx = s.ctx, k = col(), a = anchor || 'left';
    ctx.strokeStyle = k.muted; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + px, y); ctx.stroke();
    ctx.fillStyle = k.muted; ctx.font = '26px ' + FONT; ctx.textAlign = a; ctx.textBaseline = 'top';
    ctx.fillText(label, a === 'left' ? x : a === 'right' ? x + px : x + px / 2, y + 8);
  }

  var ANIMS = {
    // Én deltaker, sett ovenfra, med klokke.
    trace: {
      duration: function () { return T.head.duration; },
      init: function (s) { s.scale = (Math.min(s.W, s.H) * 0.46) / extent(T.head.x, T.head.y); },
      draw: function (s, t) {
        var k = col(), h = T.head;
        if (s.cur === 0) { clear(s); }
        pathTo(s, { x: 0, y: 0, w: s.W, h: s.H }, h.x, h.y, h.fs, t, k.accent, s.scale, 2.5);
        // klokke og målestokk oppå, i et felt som viskes ut først
        s.ctx.clearRect(s.W / 2 - 120, s.H - 70, 240, 70); s.ctx.clearRect(s.W - 170, 0, 170, 60);
        scaleBar(s, s.W / 2 - 5 * s.scale, s.H - 50, 10 * s.scale, '1 cm', 'center');
        s.ctx.fillStyle = k.muted; s.ctx.font = '700 40px ' + FONT; s.ctx.textAlign = 'right'; s.ctx.textBaseline = 'top';
        s.ctx.fillText(mmss(t), s.W - 16, 8);
      }
    },
    // Banen til venstre, den samlede strekningen til høyre: nesten en rett linje.
    accum: {
      duration: function () { return T.head.duration; },
      init: function (s) {
        var h = T.head;
        s.cum = h.cum; s.total = h.path_m;      // regnet ut av make_traces.py med samme fart som rapportene
        s.left = { x: 0, y: 0, w: s.H, h: s.H };
        s.scale = (s.H * 0.46) / extent(h.x, h.y);
        s.plot = { x: s.H + 120, y: 40, w: s.W - s.H - 160, h: s.H - 120 };
      },
      draw: function (s, t) {
        var k = col(), h = T.head, ctx = s.ctx, p = s.plot;
        if (s.cur === 0) {
          clear(s);
          ctx.strokeStyle = k.muted; ctx.lineWidth = 3; ctx.beginPath();
          ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + p.h); ctx.lineTo(p.x + p.w, p.y + p.h); ctx.stroke();
          ctx.fillStyle = k.muted; ctx.font = '28px ' + FONT; ctx.textBaseline = 'top';
          ctx.textAlign = 'left'; ctx.fillText('0', p.x - 4, p.y + p.h + 10);
          ctx.textAlign = 'right'; ctx.fillText(nb(h.duration / 60, 0) + ' min', p.x + p.w, p.y + p.h + 10);
          ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(nb(s.total, 1) + ' m tilbakelagt', p.x + 12, p.y + 4);
          scaleBar(s, s.left.w / 2 - 5 * s.scale, s.H - 50, 10 * s.scale, '1 cm', 'center');
        }
        var from = s.cur;
        pathTo(s, s.left, h.x, h.y, h.fs, t, k.accent, s.scale, 2.5);
        var n = s.cur;
        if (n > from) {
          ctx.strokeStyle = k.accent; ctx.lineWidth = 5; ctx.beginPath();
          var i0 = Math.max(0, from - 1);
          for (var i = i0; i < n; i++) {
            var x = p.x + (i / (h.x.length - 1)) * p.w, y = p.y + p.h - (s.cum[i] / s.total) * p.h;
            if (i === i0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
    },
    // Alle deltakerne i ett mesterskap, i virkelig tid; fargen skifter når musikken starter.
    flock: {
      duration: function () { return 60; },
      init: function (s) {
        var n = T.flock.length, cols = Math.ceil(Math.sqrt(n * s.W / s.H)), rows = Math.ceil(n / cols);
        var cell = Math.min(s.W / cols, s.H / rows);
        s.cols = cols; s.cell = cell; s.ox = (s.W - cols * cell) / 2; s.oy = (s.H - rows * cell) / 2;
        s.scale = (cell * 0.5) / 15;     // 15 mm fra midten til kanten av cellen
        s.curs = T.flock.map(function () { return 0; });
      },
      draw: function (s, t) {
        var k = col(), ctx = s.ctx;
        if (s.cur === 0) { clear(s); s.curs = T.flock.map(function () { return 0; }); s.cur = 1; }
        T.flock.forEach(function (f, j) {
          var box = { x: s.ox + (j % s.cols) * s.cell, y: s.oy + Math.floor(j / s.cols) * s.cell, w: s.cell, h: s.cell };
          var n = Math.min(f.x.length, Math.floor(t * 10) + 1), c0 = s.curs[j];
          if (n <= c0) return;
          var cx = box.x + box.w / 2, cy = box.y + box.h / 2, on = Math.floor(f.music_on * 10);
          ctx.save(); ctx.beginPath(); ctx.rect(box.x + 2, box.y + 2, box.w - 4, box.h - 4); ctx.clip();
          ctx.lineWidth = 1.6;
          var i0 = Math.max(0, c0 - 1);
          for (var i = i0 + 1; i < n; i++) {
            ctx.strokeStyle = i < on ? k.ink : k.accent; ctx.beginPath();
            ctx.moveTo(cx + f.x[i - 1] * s.scale, cy - f.y[i - 1] * s.scale);
            ctx.lineTo(cx + f.x[i] * s.scale, cy - f.y[i] * s.scale); ctx.stroke();
          }
          ctx.restore(); s.curs[j] = n;
        });
        ctx.clearRect(s.W - 170, 0, 170, 60);
        ctx.fillStyle = k.muted; ctx.font = '700 40px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillText(mmss(t), s.W - 16, 8);
        scaleBar(s, s.W - 20 - 10 * s.scale, s.H - 44, 10 * s.scale, '1 cm', 'right');
      }
    },
    // Tre bånd av brystakselerometeret ruller forbi: åndedrag, vektforskyvning, hjerteslag.
    clocks: {
      duration: function () { return 60; },
      init: function (s) {
        s.rows = [['resp', 'Åndedrag'], ['post', 'Svai'], ['card', 'Hjerteslag']];
        s.norm = {};
        s.rows.forEach(function (r) { var m = 0; T.clocks[r[0]].forEach(function (v) { if (Math.abs(v) > m) m = Math.abs(v); }); s.norm[r[0]] = m || 1; });
      },
      draw: function (s, t) {
        var k = col(), ctx = s.ctx, fs = T.clocks.fs, win = 20, rowH = (s.H - 60) / 3, x0 = 340;   // 60 px nederst til slagene og tidsmerket
        clear(s);
        s.rows.forEach(function (r, j) {
          var y0 = rowH * j + rowH / 2, amp = rowH * 0.38, v = T.clocks[r[0]], N = v.length;
          ctx.fillStyle = k.ink; ctx.font = '700 36px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(r[1], 0, y0);
          ctx.strokeStyle = j === 2 ? k.accent : k.ink; ctx.lineWidth = 3; ctx.beginPath();
          var tEnd = Math.min(t, 60), iEnd = Math.floor(tEnd * fs), i0 = Math.max(0, iEnd - win * fs);
          for (var i = i0; i <= Math.min(iEnd, N - 1); i++) {
            var x = x0 + ((i / fs - (tEnd - win)) / win) * (s.W - x0), y = y0 - (v[i] / s.norm[r[0]]) * amp;
            if (i === i0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
          if (j === 2 && T.clocks.beats) {          // et punkt under kurven for hvert slag lyden markerer
            ctx.fillStyle = k.accent;
            T.clocks.beats.forEach(function (b) {
              if (b > tEnd || b < tEnd - win) return;
              ctx.beginPath(); ctx.arc(x0 + ((b - (tEnd - win)) / win) * (s.W - x0), y0 + amp + 18, 6, 0, 2 * Math.PI); ctx.fill();
            });
          }
        });
        ctx.fillStyle = k.muted; ctx.font = '28px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText(win + ' sekunder', s.W, s.H);
      }
    },
    // Ett punkt per dag gjennom året, så medianen som en flat linje.
    year: {
      duration: function () { return 365 + 30; },
      init: function (s) {
        var q = T.year.qom.slice().sort(function (a, b) { return a - b; });
        s.median = q[Math.floor(q.length / 2)];
        s.max = q[q.length - 1];
        s.plot = { x: 70, y: 30, w: s.W - 90, h: s.H - 110 };
      },
      draw: function (s, t) {
        var k = col(), ctx = s.ctx, p = s.plot, months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        var names = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
        clear(s);
        ctx.strokeStyle = k.muted; ctx.lineWidth = 3; ctx.beginPath();
        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + p.h); ctx.lineTo(p.x + p.w, p.y + p.h); ctx.stroke();
        ctx.fillStyle = k.muted; ctx.font = '26px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        months.forEach(function (d, i) { ctx.fillText(names[i], p.x + ((d + 15) / 365) * p.w, p.y + p.h + 10); });
        ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('mm/s²', p.x + 8, p.y + 2);
        ctx.fillStyle = k.accent;
        var day = Math.min(365, Math.floor(t));
        for (var i = 0; i < T.year.day.length; i++) {
          if (T.year.day[i] > day) continue;
          var x = p.x + (T.year.day[i] / 365) * p.w, y = p.y + p.h - (T.year.qom[i] / s.max) * p.h;
          ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
        }
        if (t > 365) {
          var frac = Math.min(1, (t - 365) / 30), y = p.y + p.h - (s.median / s.max) * p.h;
          ctx.strokeStyle = k.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x + frac * p.w, y); ctx.stroke();
        }
      }
    },
    // Romlig utstrekning: den ufiltrerte banen om sitt eget midtpunkt, med medianens spredningsradius (rapport 04) som sirkel.
    range: {
      duration: function () { return T.head.duration; },
      init: function (s) {
        s.R = parseFloat(String((window.NUMBERS || {}).disp || '0').replace(',', '.'));
        s.scale = (Math.min(s.W, s.H) * 0.43) / Math.max(extent(T.head.rx, T.head.ry), s.R * 1.1);
      },
      draw: function (s, t) {
        var k = col(), h = T.head, ctx = s.ctx, cx = s.W / 2, cy = s.H / 2;
        if (s.cur === 0) {
          clear(s);
          ctx.save(); ctx.strokeStyle = k.muted; ctx.lineWidth = 3; ctx.setLineDash([14, 10]);
          ctx.beginPath(); ctx.arc(cx, cy, s.R * s.scale, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
        }
        pathTo(s, { x: 0, y: 0, w: s.W, h: s.H }, h.rx, h.ry, h.fs, t, k.accent, s.scale, 2.5);
        ctx.clearRect(s.W / 2 - 120, s.H - 70, 240, 70); ctx.clearRect(s.W - 170, 0, 170, 60);
        scaleBar(s, s.W / 2 - 5 * s.scale, s.H - 50, 10 * s.scale, '1 cm', 'center');
        ctx.fillStyle = k.muted; ctx.font = '700 40px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillText(mmss(t), s.W - 16, 8);
      }
    },
    // Én dags bevegelse gjennom økten (window.WASP fra tools/make_vepsebol.py), tegnet etter hvert, med årets median stiplet.
    wasp: {
      duration: function () { return window.WASP ? window.WASP.t_s[window.WASP.t_s.length - 1] : 1; },
      init: function (s) {
        var W = window.WASP || { y: [1], median: 1 }, top = Math.max.apply(null, W.y.concat([W.median]));
        s.ymax = Math.ceil(top / 10) * 10;
        s.box = { x: 110, y: 30, w: s.W - 300, h: s.H - 120 };
      },
      draw: function (s, t) {
        var W = window.WASP; if (!W) return;
        var k = col(), ctx = s.ctx, b = s.box, T = W.t_s[W.t_s.length - 1];
        function X(v) { return b.x + b.w * v / T; }
        function Y(v) { return b.y + b.h * (1 - v / s.ymax); }
        ctx.clearRect(0, 0, s.W, s.H);
        ctx.strokeStyle = k.muted; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.stroke();
        ctx.fillStyle = k.muted; ctx.font = '26px ' + FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
        for (var v = 0; v <= s.ymax; v += 10) ctx.fillText(String(v), b.x - 12, Y(v));
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (var m = 0; m * 60 <= T; m++) ctx.fillText(String(m), X(m * 60), b.y + b.h + 10);
        ctx.fillText('minutter', b.x + b.w / 2, b.y + b.h + 46);
        ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('mm/s²', b.x + 8, b.y - 2);
        ctx.save(); ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.moveTo(b.x, Y(W.median)); ctx.lineTo(b.x + b.w, Y(W.median)); ctx.stroke(); ctx.restore();
        ctx.textBaseline = 'middle'; ctx.fillText('årets median', b.x + b.w + 12, Y(W.median));
        ctx.strokeStyle = k.accent; ctx.lineWidth = 5; ctx.beginPath();
        var started = false;
        for (var i = 0; i < W.t_s.length && W.t_s[i] <= t; i++) {
          if (!started) { ctx.moveTo(X(W.t_s[i]), Y(W.y[i])); started = true; } else ctx.lineTo(X(W.t_s[i]), Y(W.y[i]));
        }
        ctx.stroke();
      }
    },
    // Den lille banen i hjørnet, i virkelig tid gjennom hele innlegget.
    ambient: {
      duration: function () { return T.head.duration; },
      loop: true,
      init: function (s) { s.scale = (Math.min(s.W, s.H) * 0.46) / extent(T.head.x, T.head.y); },
      draw: function (s, t) {
        if (s.cur === 0) clear(s);
        pathTo(s, { x: 0, y: 0, w: s.W, h: s.H }, T.head.x, T.head.y, T.head.fs, t, col().muted, s.scale, 1.2);
      }
    }
  };


  // ---- Sonifisering: tast L på et lysbilde med animasjon, så høres dataene mens de tegnes. ----
  // Lyden lages med Web Audio fra de samme tallene som tegningen; ingenting er spilt inn.
  var AC = null, master = null, soundOn = false;
  function audio() {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 0.6;
      var lim = AC.createDynamicsCompressor();      // en myk begrenser til slutt, så summen av stemmene aldri klipper
      lim.threshold.value = -6; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.15;
      master.connect(lim); lim.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(type, freq) {
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = 0; o.connect(g); o.start();
    return { o: o, g: g };
  }
  function blip(freq, dur, vol, type) {
    var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.001, t + dur);   // kort innsving, ellers klikker et dypt slag
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise() {            // brun støy i sløyfe, for mengden av mennesker
    var buf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), d = buf.getChannelData(0), b = 0;
    for (var i = 0; i < d.length; i++) { b = 0.98 * b + 0.02 * (Math.random() * 2 - 1); d[i] = b * 8; }
    var src = AC.createBufferSource(), g = AC.createGain();
    src.buffer = buf; src.loop = true; g.gain.value = 0; src.connect(g); src.start();
    return { o: src, g: g };
  }
  function breathVoice() {       // hvit støy gjennom et båndpassfilter: lyden av luft, til åndedraget
    var buf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    src.buffer = buf; src.loop = true; f.type = 'bandpass'; f.frequency.value = 800; f.Q.value = 0.9; g.gain.value = 0;
    src.connect(f); f.connect(g); src.start();
    return { o: src, f: f, g: g };
  }
  function set(param, v, tc) { param.setTargetAtTime(v, AC.currentTime, tc || 0.03); }

  // Én bane: tonehøyde fra hodets posisjon framover og bakover, panorering fra side til side, styrke fra farten.
  var traceSound = {
    start: function (s) {
      var v = tone('sine', 220), p = AC.createStereoPanner ? AC.createStereoPanner() : null;
      if (p) { v.g.connect(p); p.connect(master); } else { v.g.connect(master); }
      s.snd = { v: v, p: p };
    },
    frame: function (s, t) {
      var h = T.head, i = Math.min(h.x.length - 1, Math.floor(t * h.fs));
      if (i < 1) return;
      var dx = h.x[i] - h.x[i - 1], dy = h.y[i] - h.y[i - 1], sp = Math.sqrt(dx * dx + dy * dy) * h.fs;   // mm/s i datatid
      set(s.snd.v.g.gain, Math.min(0.4, sp / 40));
      set(s.snd.v.o.frequency, 220 * Math.pow(2, h.y[i] / 20));
      if (s.snd.p) set(s.snd.p.pan, Math.max(-1, Math.min(1, h.x[i] / 15)));
    },
    stop: function (s) { try { s.snd.v.o.stop(); } catch (e) {} s.snd = null; }
  };
  var SOUND = {
    trace: traceSound, accum: traceSound,
    // Tre klokker: åndedraget som en langsom svelling, vektforskyvningen som en tone som gynger, hjertet som et dunk per slag.
    clocks: {
      start: function (s) {
        var r = breathVoice(), w = tone('triangle', 220);
        r.g.connect(master); w.g.connect(master);
        s.snd = { r: r, w: w, next: 0 };
      },
      frame: function (s, t) {
        var c = T.clocks, i = Math.min(c.resp.length - 1, Math.floor(t * c.fs));
        if (i < 1) return;
        // åndedraget: luften strømmer når kurven er i bevegelse, ikke når den snur, så styrken følger kurvens
        // stigning (to sus per pust, inn og ut); innpust litt lysere enn utpust
        if (!s.dnorm) { var m = 0; for (var q = 1; q < c.resp.length; q++) m = Math.max(m, Math.abs(c.resp[q] - c.resp[q - 1])); s.dnorm = m || 1; }
        var dv = (c.resp[i] - c.resp[i - 1]) / s.dnorm, lvl = Math.min(1, Math.abs(dv));
        set(s.snd.r.g.gain, 0.5 * Math.pow(lvl, 1.5), 0.08);
        set(s.snd.r.f.frequency, (dv > 0 ? 900 : 550) + 700 * lvl, 0.1);
        set(s.snd.w.g.gain, 0.10 * Math.abs(c.post[i] / s.norm.post), 0.05);
        set(s.snd.w.o.frequency, 220 * Math.pow(2, 0.5 * c.post[i] / s.norm.post), 0.05);
        // ett dunk per hjerteslag, på tidene make_traces.py fant (c.beats, sekunder inn i minuttet)
        while (c.beats && s.snd.next < c.beats.length && c.beats[s.snd.next] <= t) {
          if (t - c.beats[s.snd.next] < 0.2) blip(70, 0.14, 0.45);
          s.snd.next++;
        }
      },
      stop: function (s) { try { s.snd.r.o.stop(); s.snd.w.o.stop(); } catch (e) {} s.snd = null; }
    },
    // Året: én tone per dag, høyere når jeg beveget meg mer enn medianen, lavere når mindre.
    year: {
      start: function (s) { s.snd = { last: 0 }; },
      frame: function (s, t) {
        var day = Math.min(365, Math.floor(t));
        for (var d = s.snd.last + 1; d <= day; d++) {
          var k = T.year.day.indexOf(d);
          if (k >= 0) blip(440 * Math.pow(2, (T.year.qom[k] - s.median) / s.median), 0.09, 0.25, 'triangle');
        }
        s.snd.last = day;
      },
      stop: function (s) { s.snd = null; }
    },
    // Alle deltakerne: en sus hvis styrke er den samlede farten i salen, i virkelig tid. Hør om noe skjer når musikken starter.
    flock: {
      start: function (s) { var n = noise(); n.g.connect(master); s.snd = { n: n }; },
      frame: function (s, t) {
        var i = Math.floor(t * 10), sum = 0, n = 0;
        T.flock.forEach(function (f) {
          if (i < 1 || i >= f.x.length) return;
          var dx = f.x[i] - f.x[i - 1], dy = f.y[i] - f.y[i - 1];
          sum += Math.sqrt(dx * dx + dy * dy) * 10; n++;
        });
        if (n) set(s.snd.n.g.gain, Math.min(0.6, (sum / n) / 12), 0.1);
      },
      stop: function (s) { try { s.snd.n.o.stop(); } catch (e) {} s.snd = null; }
    }
  };
  function soundStart(s) { var k = s.c.getAttribute('data-anim'); if (SOUND[k] && !s.snd) { audio(); SOUND[k].start(s); } }
  function soundStop(s) { var k = s.c.getAttribute('data-anim'); if (SOUND[k] && s.snd) SOUND[k].stop(s); }
  function soundFrame(s) { var k = s.c.getAttribute('data-anim'); if (soundOn && s.snd && SOUND[k]) SOUND[k].frame(s, s.t); }
  function setSound(on, Reveal) {
    soundOn = on;
    var cur = Reveal.getCurrentSlide(), el = document.getElementById('sound');
    states.forEach(function (s) { if (on && cur && cur.contains(s.c) && s.raf) soundStart(s); else soundStop(s); });
    if (el) el.textContent = on ? '♪ lyd' : '';
  }

  var states = [];
  function state(c) {
    for (var i = 0; i < states.length; i++) if (states[i].c === c) return states[i];
    var s = setup(c), a = ANIMS[c.getAttribute('data-anim')];
    s.anim = a; s.speed = +(c.getAttribute('data-speed') || 1); a.init(s); states.push(s);
    return s;
  }
  function redraw(s) { clear(s); s.anim.draw(s, s.t); }
  function stop(s) { if (s.raf) cancelAnimationFrame(s.raf); s.raf = null; if (s.snd) soundStop(s); }
  function start(s) {
    stop(s); s.t = 0; clear(s);
    var dur = s.anim.duration(), t0 = null;
    function frame(now) {
      if (t0 === null) t0 = now;
      var t = ((now - t0) / 1000) * s.speed;
      if (s.anim.loop && t > dur) { t0 = now; t = 0; clear(s); }
      s.t = Math.min(t, dur); s.anim.draw(s, s.t); soundFrame(s);
      if (t < dur || s.anim.loop) s.raf = requestAnimationFrame(frame);
    }
    s.raf = requestAnimationFrame(frame);
  }
  function finish(s) { stop(s); s.t = s.anim.duration(); redraw(s); }

  var revealRef = null;
  window.Standstill = {
    sound: function (on) { if (revealRef) setSound(on, revealRef); return soundOn; },   // også for en knapp eller en test
    init: function (Reveal) {
      revealRef = Reveal;
      var all = Array.prototype.slice.call(document.querySelectorAll('canvas[data-anim]'));
      if (STATIC) {   // PDF-en: sluttbildet av hvert lysbilde, og uten banen i hjørnet
        all.forEach(function (c) { if (c.id === 'ambient') c.style.display = 'none'; else finish(state(c)); });
        return;
      }
      all.forEach(function (c) { if (c.getAttribute('data-anim') === 'ambient') start(state(c)); });
      function onSlide() {
        var cur = Reveal.getCurrentSlide();
        all.forEach(function (c) {
          if (c.getAttribute('data-anim') === 'ambient') return;
          var s = state(c);
          var waits = c.classList.contains('fragment') && !c.classList.contains('visible');   // et lerret som er et fragment, starter på klikket
          if (cur && cur.contains(c) && !waits) { if (!s.raf) start(s); } else { stop(s); if (waits) clear(s); }
        });
      }
      Reveal.on('ready', onSlide);
      Reveal.on('fragmentshown', function (e) { if (e.fragment && e.fragment.matches && e.fragment.matches('canvas[data-anim]')) start(state(e.fragment)); });
      Reveal.on('fragmenthidden', function (e) { if (e.fragment && e.fragment.matches && e.fragment.matches('canvas[data-anim]')) { var s = state(e.fragment); stop(s); clear(s); } });
      Reveal.on('slidechanged', function () { setSound(false, Reveal); onSlide(); });   // hvert lysbilde starter stille
      Reveal.addKeyBinding({ keyCode: 76, key: 'L', description: 'Lyd av/på for animasjonen' }, function () { setSound(!soundOn, Reveal); });
      document.addEventListener('themechange', function () { states.forEach(redraw); });
    }
  };
})();
