/* ==================================================================
   8-bit "keygen" background music, synthesised live with Web Audio.
   Original composition, no audio files. Browsers only allow sound after
   a user gesture, so it starts on the first touch / click / key press.
=================================================================== */
(function () {
  'use strict';

  var VOLUME = 0.15;          // master volume (15%)
  var BPM = 140;
  var STEP = 60 / BPM / 4;    // one 16th note, in seconds
  var STORE = 'portal-music-muted';

  // A minor. Section A: Am F C G. Section B: Am F G E.
  var CHORDS = {
    Am: ['A', 'C', 'E'], F: ['F', 'A', 'C'], C: ['C', 'E', 'G'], G: ['G', 'B', 'D'], E: ['E', 'G#', 'B']
  };
  var PROG = ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'E', 'Am', 'F', 'G', 'E'];

  // Lead melody, one entry per 8th note (8 per bar), '-' = hold, '.' = rest
  var MELODY = [
    // A (first pass)
    'A4', '-', 'C5', 'E5', 'A5', 'G5', 'E5', 'D5',
    'C5', '-', 'F5', 'A5', 'G5', 'F5', 'E5', 'C5',
    'E5', '-', 'G5', 'C6', 'B5', 'G5', 'E5', 'G5',
    'D5', '-', 'B4', 'D5', 'G5', 'F#5', 'D5', 'B4',
    // A (answer)
    'A4', '-', 'C5', 'E5', 'A5', 'B5', 'C6', 'B5',
    'A5', '-', 'F5', 'A5', 'C6', '-', 'A5', 'F5',
    'G5', '-', 'E5', 'G5', 'C6', 'D6', 'E6', 'C6',
    'B5', '-', 'G5', 'B5', 'D6', '-', '.', '.',
    // B
    'E5', 'E5', 'A5', '-', 'B5', 'C6', 'B5', 'A5',
    'A5', '-', 'F5', 'A5', 'C6', '-', 'A5', 'F5',
    'G5', '-', 'D5', 'G5', 'B5', '-', 'D6', 'B5',
    'G#5', '-', 'E5', 'G#5', 'B5', '-', 'E6', '-',
    // B (lift)
    'A5', '-', 'E6', '-', 'D6', 'C6', 'B5', 'C6',
    'A5', '-', 'C6', '-', 'F6', '-', 'E6', 'C6',
    'D6', '-', 'B5', 'G5', 'D6', '-', 'G6', 'F#6',
    'E6', '-', 'B5', 'G#5', 'E5', '-', '.', '.'
  ];

  var SEMI = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function freq(note, octave) {
    if (octave === undefined) { var m = note.match(/^([A-G]#?)(\d)$/); note = m[1]; octave = +m[2]; }
    var midi = 12 * (octave + 1) + SEMI[note];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  var ctx, master, leadBus, pulse25, pulse125, noiseBuf, timer, step = 0, nextTime = 0, firstPass = true;
  var started = false, muted = false, enabled = true, btn, hint;

  try { muted = localStorage.getItem(STORE) === '1'; } catch (e) { /* storage blocked */ }

  function pulseWave(duty) {
    var n = 64, real = new Float32Array(n), imag = new Float32Array(n);
    for (var i = 1; i < n; i++) real[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    return ctx.createPeriodicWave(real, imag);
  }

  function setup() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : VOLUME;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);

    // lead goes through a little echo
    leadBus = ctx.createGain(); leadBus.gain.value = 1;
    var delay = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain();
    delay.delayTime.value = STEP * 3; fb.gain.value = 0.32; wet.gain.value = 0.35;
    leadBus.connect(master); leadBus.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);

    pulse25 = pulseWave(0.25); pulse125 = pulseWave(0.125);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function tone(t, f, dur, opts) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    if (opts.wave) o.setPeriodicWave(opts.wave); else o.type = opts.type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(opts.slide, t + dur);
    if (opts.vib) {
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 6; lg.gain.value = f * 0.012;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t + 0.08); lfo.stop(t + dur + 0.05);
    }
    var v = opts.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.005);
    g.gain.setValueAtTime(v, t + dur * (opts.hold || 0.7));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(opts.out || master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(t, dur, vol, filterType, f) {
    var s = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; flt.type = filterType; flt.frequency.value = f;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(flt); flt.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  function kick(t) { tone(t, 150, 0.16, { type: 'sine', slide: 40, vol: 0.9, hold: 0.1 }); }
  function snare(t) { noise(t, 0.14, 0.45, 'bandpass', 1800); tone(t, 220, 0.06, { type: 'triangle', slide: 120, vol: 0.3, hold: 0.1 }); }
  function hat(t, open) { noise(t, open ? 0.12 : 0.035, open ? 0.16 : 0.12, 'highpass', 7500); }

  // how long a melody note lasts (count following '-' entries)
  function leadLen(i) { var n = 1; while (MELODY[(i + n) % MELODY.length] === '-') n++; return n; }

  function schedule(s, t) {
    var bar = Math.floor(s / 16) % PROG.length, pos = s % 16;
    var chord = CHORDS[PROG[bar]], root = chord[0];
    var intro = firstPass && s < 32; // first two bars: no lead, let the arp + drums build

    // drums
    if (pos === 0 || pos === 8 || (pos === 10 && bar % 2 === 1)) kick(t);
    if (pos === 4 || pos === 12) snare(t);
    if (pos === 15 && bar % 4 === 3) snare(t);
    if (pos % 2 === 1) hat(t, pos === 7 || pos === 15);

    // bass: pumping 8th-note octaves
    if (pos % 2 === 0) {
      var oct = pos % 4 === 0 ? 2 : 3;
      tone(t, freq(root, oct), STEP * 1.8, { type: 'triangle', vol: 0.55, hold: 0.8 });
    }

    // arpeggio: 32nd notes up and down the chord
    var shape = [0, 1, 2, 3, 2, 1];
    for (var k = 0; k < 2; k++) {
      var idx = shape[(pos * 2 + k) % shape.length];
      var n = idx === 3 ? chord[0] : chord[idx], o = idx === 3 ? 6 : 5;
      if (SEMI[n] < SEMI[root] && idx !== 3) o += 1;
      tone(t + k * STEP / 2, freq(n, o), STEP / 2 * 0.9, { wave: pulse125, vol: 0.11, hold: 0.5 });
    }

    // lead melody on 8th notes
    if (!intro && pos % 2 === 0) {
      var mi = (s / 2) % MELODY.length, note = MELODY[mi];
      if (note !== '-' && note !== '.') {
        var len = leadLen(mi) * STEP * 2;
        tone(t, freq(note), len * 0.95, { wave: pulse25, vol: 0.26, hold: 0.75, vib: len > STEP * 3, out: leadBus });
      }
    }
  }

  function tick() {
    while (nextTime < ctx.currentTime + 0.12) {
      schedule(step, nextTime);
      step++;
      if (step >= MELODY.length * 2) { step = 0; firstPass = false; } // 16 bars, then loop
      nextTime += STEP;
    }
  }

  function start() {
    if (started || !enabled) return;
    if (!ctx && !setup()) return;
    if (ctx.state !== 'running') ctx.resume();
    started = true;
    nextTime = ctx.currentTime + 0.06;
    timer = setInterval(tick, 25);
    tick();
    if (hint) hint.classList.add('gone');
    render();
  }

  function setMuted(m) {
    muted = m;
    try { localStorage.setItem(STORE, m ? '1' : '0'); } catch (e) { /* ignore */ }
    if (ctx) master.gain.setTargetAtTime(m ? 0 : VOLUME, ctx.currentTime, 0.05);
    render();
  }

  function render() {
    if (!btn) return;
    var on = started && !muted;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Mute music' : 'Play music');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/>' +
      (on ? '<path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>' : '<path d="M17 9l5 6M22 9l-5 6"/>') +
      '</svg>';
  }

  // first gesture anywhere starts the music (unless the gesture was the mute button)
  function onFirstGesture(e) {
    if (btn && btn.contains(e.target)) return;
    if (muted) { // remembered as muted: unlock audio silently so the button works instantly
      if (!ctx) setup();
      if (ctx && ctx.state !== 'running') ctx.resume();
      return;
    }
    start();
    if (ctx && ctx.state === 'running') detach();
  }
  var EVENTS = ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'];
  function detach() { EVENTS.forEach(function (ev) { document.removeEventListener(ev, onFirstGesture, true); }); }

  window.NeonMusic = {
    init: function (opts) {
      enabled = !(opts && opts.enabled === false);
      if (!enabled) return;
      btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'music-btn';
      btn.addEventListener('click', function () {
        if (!started) { setMuted(false); start(); return; }
        setMuted(!muted);
      });
      document.body.appendChild(btn);
      if (!muted) {
        hint = document.createElement('div'); hint.className = 'music-hint';
        hint.textContent = (window.matchMedia && matchMedia('(pointer:coarse)').matches ? 'Tap' : 'Click') + ' anywhere for music';
        document.body.appendChild(hint);
        setTimeout(function () { if (hint) hint.classList.add('gone'); }, 7000);
      }
      render();
      EVENTS.forEach(function (ev) { document.addEventListener(ev, onFirstGesture, { capture: true, passive: true }); });
      document.addEventListener('visibilitychange', function () {
        if (!ctx || !started) return;
        if (document.hidden) ctx.suspend(); else ctx.resume();
      });
    },
    // little victory jingle when the guest gets online
    fanfare: function () {
      if (!ctx || !started || muted) return;
      var t = ctx.currentTime + 0.05;
      ['A5', 'C#6', 'E6', 'A6'].forEach(function (n, i) { tone(t + i * 0.09, freq(n), 0.16, { wave: pulse25, vol: 0.3, hold: 0.6, out: leadBus }); });
      tone(t + 0.36, freq('A6'), 0.6, { wave: pulse25, vol: 0.3, hold: 0.7, vib: true, out: leadBus });
    }
  };
})();
