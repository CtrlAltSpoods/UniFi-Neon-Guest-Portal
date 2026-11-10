/* ==================================================================
   Background music for the guest portal, synthesised live with Web Audio
   (no audio files). One track per theme; lo-fi beats the rest of the year.
   Browsers only allow sound after a user gesture, so it starts on the
   first touch / click / key press.

   Holiday songs are public-domain melodies (Jingle Bells, Auld Lang Syne,
   God Save the King, Grieg's "In the Hall of the Mountain King",
   Vivaldi's "Spring"); the others are original compositions.

   Melody notation: "NOTE/len" tokens, len in 16th-note steps, "r" = rest.
=================================================================== */
(function () {
  'use strict';

  var VOLUME = 0.15;   // master volume (15%)
  var STORE = 'portal-music-muted';

  /* ------------------------------------------------------------------ songs */
  var SONGS = {
    // ----- default: lo-fi hip hop (original) -----
    lofi: {
      bpm: 78, barSteps: 16, swing: 0.22, lowpass: 2600, crackle: true, reverb: 0.25,
      lead: [{ inst: 'flute', vol: 0.32 }, { inst: 'epiano', vol: 0.12, oct: -1 }],
      accomp: [{ style: 'lofi', inst: 'epiano', vol: 0.3 }, { style: 'bassLofi', inst: 'subbass', vol: 0.5 }],
      drums: { softkick: 'x......x..x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.xo', rim: '..........o.....' },
      parts: [
        { chords: ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7', 'Fmaj7', 'E7', 'Am7', 'G7'], melody: 'r/32 r/32 r/32 r/32', mute: true },
        { chords: ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7', 'Fmaj7', 'E7', 'Am7', 'G7'],
          melody: 'r/4 A5/2 G5/2 E5/4 C5/4  D5/6 E5/2 G5/8  r/2 F5/2 E5/2 D5/2 A4/8  B4/4 C5/4 E5/8 ' +
                  'r/4 C6/2 A5/2 G5/4 E5/4  G#5/6 F5/2 D5/8  r/2 E5/2 G5/2 A5/2 C6/4 B5/4  A5/4 G5/4 D5/8' },
        { chords: ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7', 'Fmaj7', 'E7', 'Am7', 'G7'],
          melody: 'r/8 E5/2 F5/2 A5/4  G5/12 r/4  F5/2 A5/2 C6/4 A5/8  G5/4 E5/4 C5/8 ' +
                  'A5/4 G5/2 A5/2 C6/8  B5/6 G#5/2 E5/8  C6/4 B5/2 A5/2 E5/8  F5/4 E5/4 D5/4 B4/4' }
      ],
      loopFrom: 1
    },

    // ----- Christmas: Jingle Bells (public domain, 1857) -----
    christmas: {
      bpm: 118, barSteps: 8, reverb: 0.3,
      lead: [{ inst: 'bell', vol: 0.34 }, { inst: 'epiano', vol: 0.18 }],
      accomp: [{ style: 'oompah', inst: 'epiano', vol: 0.2 }],
      drums: { kick: 'x...x...', snare: '..o...o.', sleigh: 'x.x.x.x.' },
      parts: [
        { chords: ['C', 'C', 'C', 'F', 'F', 'G7', 'G7', 'C', 'C', 'C', 'C', 'F', 'F', 'G7', 'G7', 'C'],
          melody: 'G4/2 E5/2 D5/2 C5/2  G4/6 G4/1 G4/1  G4/2 E5/2 D5/2 C5/2  A4/8  A4/2 F5/2 E5/2 D5/2  B4/8  G5/2 G5/2 F5/2 D5/2  E5/8 ' +
                  'G4/2 E5/2 D5/2 C5/2  G4/8  G4/2 E5/2 D5/2 C5/2  A4/8  A4/2 F5/2 E5/2 D5/2  G5/2 G5/2 G5/2 G5/2  A5/2 G5/2 F5/2 D5/2  C5/4 G5/4' },
        { chords: ['C', 'C', 'C', 'C', 'F', 'C', 'D7', 'G7', 'C', 'C', 'C', 'C', 'F', 'C', 'G7', 'C'],
          melody: 'E5/2 E5/2 E5/4  E5/2 E5/2 E5/4  E5/2 G5/2 C5/3 D5/1  E5/8  F5/2 F5/2 F5/3 F5/1  F5/2 E5/2 E5/2 E5/1 E5/1  E5/2 D5/2 D5/2 E5/2  D5/4 G5/4 ' +
                  'E5/2 E5/2 E5/4  E5/2 E5/2 E5/4  E5/2 G5/2 C5/3 D5/1  E5/8  F5/2 F5/2 F5/3 F5/1  F5/2 E5/2 E5/2 E5/1 E5/1  G5/2 G5/2 F5/2 D5/2  C5/8' }
      ],
      loopFrom: 0
    },

    // ----- New Year: Auld Lang Syne (traditional) -----
    newyear: {
      bpm: 80, barSteps: 16, reverb: 0.4, transpose: 12,
      lead: [{ inst: 'epiano', vol: 0.34 }, { inst: 'strings', vol: 0.12 }],
      accomp: [{ style: 'arp', inst: 'epiano', vol: 0.13 }, { style: 'pad', inst: 'strings', vol: 0.12 }],
      drums: { shaker: '..x...x...x...x.', softkick: 'x.......x.......' },
      parts: [
        { chords: ['F', 'F', 'C', 'F', 'Bb', 'F', 'C', 'Bb', 'F', 'F', 'C', 'F', 'Bb', 'F', 'C', 'Bb', 'F'],
          melody: 'r/12 C4/4  F4/6 F4/2 F4/4 A4/4  G4/6 F4/2 G4/4 A4/4  F4/6 F4/2 A4/4 C5/4  D5/12 D5/4 ' +
                  'C5/6 A4/2 A4/4 F4/4  G4/6 F4/2 G4/4 A4/4  F4/6 D4/2 D4/4 C4/4  F4/12 D5/4 ' +
                  'C5/6 A4/2 A4/4 F4/4  G4/6 F4/2 G4/4 D5/4  C5/6 A4/2 A4/4 C5/4  D5/12 F5/4 ' +
                  'C5/6 A4/2 A4/4 F4/4  G4/6 F4/2 G4/4 A4/4  F4/6 D4/2 D4/4 C4/4  F4/16' }
      ],
      loopFrom: 0
    },

    // ----- Australia Day: summery ukulele tune (original) -----
    australiaday: {
      bpm: 100, barSteps: 16, swing: 0.08, reverb: 0.2,
      lead: [{ inst: 'whistle', vol: 0.26 }],
      accomp: [{ style: 'strum', inst: 'uke', vol: 0.16, pattern: 'x.x..x.x..x.x.x.' }, { style: 'root2', inst: 'bass', vol: 0.4 }],
      drums: { softkick: 'x.......x.......', rim: '....x.......x...', shaker: 'x.x.x.x.x.x.x.x.' },
      parts: [
        { chords: ['D', 'G', 'A', 'D', 'Bm', 'G', 'A', 'D'],
          melody: 'F#5/4 A5/4 B5/2 A5/2 F#5/4  G5/4 B5/4 D6/4 B5/4  A5/2 G5/2 F#5/2 E5/2 C#5/4 E5/4  D5/8 A4/8 ' +
                  'B4/2 D5/2 F#5/4 B5/4 A5/4  G5/4 F#5/4 E5/4 D5/4  E5/2 F#5/2 G5/2 A5/2 E5/4 C#5/4  D5/12 r/4' }
      ],
      loopFrom: 0
    },

    // ----- Adelaide Cup: bugle call then a galloping race galop (original) -----
    adelaidecup: {
      bpm: 150, barSteps: 16, reverb: 0.2,
      lead: [{ inst: 'brass', vol: 0.3 }, { inst: 'pluck', vol: 0.12, oct: 1 }],
      accomp: [{ style: 'oompah', inst: 'pluck', vol: 0.16 }],
      drums: { hoof: 'xxx.xxx.xxx.xxx.', kick: 'x.......x.......', snare: '....x.......x...' },
      parts: [
        { chords: ['C', 'C', 'C', 'G'], noDrums: true, noAccomp: true, lead: [{ inst: 'bugle', vol: 0.34 }],
          melody: 'G4/2 C5/2 E5/2 G5/6 E5/2 G5/2  E5/2 C5/2 G4/2 C5/2 E5/4 G5/4  C6/2 G5/2 E5/2 G5/2 C6/2 G5/2 E5/2 C5/2  G5/16' },
        { chords: ['G', 'D7', 'G', 'D', 'C', 'G', 'D7', 'G'],
          melody: 'D5/2 D5/2 G5/2 D5/2 B4/2 D5/2 G5/4  C5/2 C5/2 F#5/2 C5/2 A4/2 C5/2 F#5/4  B4/2 B4/2 D5/2 G5/2 B5/4 A5/2 G5/2  F#5/2 E5/2 D5/2 C5/2 B4/2 A4/2 D5/4 ' +
                  'E5/2 E5/2 G5/2 E5/2 C5/2 E5/2 G5/4  D5/2 D5/2 G5/2 D5/2 B4/2 D5/2 G5/4  A5/2 G5/2 F#5/2 E5/2 D5/2 C5/2 B4/2 A4/2  G4/4 B4/2 D5/2 G5/8' }
      ],
      loopFrom: 1
    },

    // ----- Easter: Vivaldi, "Spring" from The Four Seasons (public domain) -----
    easter: {
      bpm: 104, barSteps: 16, reverb: 0.3, birds: true,
      lead: [{ inst: 'harpsichord', vol: 0.36 }, { inst: 'strings', vol: 0.18 }],
      accomp: [{ style: 'pad', inst: 'strings', vol: 0.1 }, { style: 'eighths', inst: 'harpsichord', vol: 0.08 }],
      drums: {},
      parts: [
        { chords: ['E', 'E', 'E', 'B', 'E', 'B', 'E', 'E'],
          melody: 'E5/2 G#5/2 G#5/2 G#5/2 F#5/1 E5/1 B5/6  B5/1 A5/1 G#5/2 G#5/2 G#5/2 F#5/1 E5/1 B5/6  B5/1 A5/1 G#5/2 A5/2 B5/2 A5/4 G#5/2 F#5/2  G#5/2 F#5/2 E5/8 r/4 ' +
                  'E6/1 F#6/1 E6/1 F#6/1 E6/1 F#6/1 E6/1 F#6/1 E6/1 F#6/1 E6/1 F#6/1 E6/1 F#6/1 E6/1 F#6/1  D#6/1 E6/1 D#6/1 E6/1 D#6/1 E6/1 D#6/1 E6/1 D#6/1 E6/1 D#6/1 E6/1 D#6/1 E6/1 D#6/1 E6/1 ' +
                  'E5/2 G#5/2 G#5/2 G#5/2 F#5/1 E5/1 B5/6  G#5/2 F#5/2 E5/12' }
      ],
      loopFrom: 0
    },

    // ----- Anzac Day: slow hymn with a lone horn (original) -----
    anzac: {
      bpm: 60, barSteps: 16, reverb: 0.55,
      lead: [{ inst: 'horn', vol: 0.26 }],
      accomp: [{ style: 'pad', inst: 'strings', vol: 0.14 }, { style: 'root1', inst: 'subbass', vol: 0.22 }],
      drums: { timpani: 'o...............' },
      parts: [
        { chords: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Gm', 'Asus4', 'Dm'],
          melody: 'A4/8 D5/4 C5/4  Bb4/8 F4/8  A4/4 C5/4 F5/8  E5/8 C5/8  D5/6 E5/2 F5/8  G5/8 D5/8  E5/4 C#5/4 E5/8  D5/16' },
        { chords: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Gm', 'A', 'Dm'], melody: 'r/16 r/16 r/16 r/16 r/16 r/16 r/16 r/16' }
      ],
      loopFrom: 0
    },

    // ----- Remembrance Day: quiet piano (original) -----
    remembrance: {
      bpm: 66, barSteps: 16, reverb: 0.5,
      lead: [{ inst: 'piano', vol: 0.3 }],
      accomp: [{ style: 'arp', inst: 'piano', vol: 0.12 }, { style: 'pad', inst: 'strings', vol: 0.06 }],
      drums: {},
      parts: [
        { chords: ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'B7'],
          melody: 'B4/8 G4/4 A4/4  G4/8 E4/8  D4/4 G4/4 B4/8  A4/16  B4/6 C5/2 B4/8  G4/8 E4/8  E4/4 A4/4 C5/8  B4/12 r/4' }
      ],
      loopFrom: 0
    },

    // ----- King's Birthday: God Save the King (traditional), brass & timpani -----
    kings: {
      bpm: 84, barSteps: 12, reverb: 0.45,
      lead: [{ inst: 'brass', vol: 0.3 }, { inst: 'strings', vol: 0.14 }],
      accomp: [{ style: 'pad', inst: 'strings', vol: 0.12 }, { style: 'root1', inst: 'bass', vol: 0.32 }],
      drums: { timpani: 'x.......o...', snare: '....o...o...' },
      parts: [
        { chords: ['G', 'D', 'Em', 'D', 'D7', 'G', 'G', 'G', 'C', 'D', 'G', 'G', 'C', 'G'],
          melody: 'G4/4 G4/4 A4/4  F#4/6 G4/2 A4/4  B4/4 B4/4 C5/4  B4/6 A4/2 G4/4  A4/4 G4/4 F#4/4  G4/12 ' +
                  'D5/4 D5/4 D5/4  D5/6 C5/2 B4/4  C5/4 C5/4 C5/4  C5/6 B4/2 A4/4  B4/4 C5/2 B4/2 A4/2 G4/2  B4/6 C5/2 D5/4  E5/2 C5/2 B4/4 A4/4  G4/12' }
      ],
      loopFrom: 0
    },

    // ----- Labour Day: jaunty workshop tune with anvil (original) -----
    labour: {
      bpm: 112, barSteps: 16, swing: 0.2, reverb: 0.2,
      lead: [{ inst: 'whistle', vol: 0.26 }, { inst: 'pluck', vol: 0.12 }],
      accomp: [{ style: 'strum', inst: 'banjo', vol: 0.14, pattern: '..x...x...x...x.' }, { style: 'oompahBass', inst: 'bass', vol: 0.4 }],
      drums: { kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', anvil: '............x..x' },
      parts: [
        { chords: ['F', 'C7', 'F', 'Bb', 'F', 'C7', 'Bb', 'F'],
          melody: 'C5/2 F5/2 A5/2 F5/2 G5/4 E5/4  G5/2 C5/2 E5/2 G5/2 Bb5/4 G5/4  A5/2 F5/2 C5/2 F5/2 A5/4 C6/4  D6/4 Bb5/4 F5/8 ' +
                  'C5/2 F5/2 A5/2 F5/2 G5/4 E5/4  G5/2 E5/2 C5/2 E5/2 G5/4 Bb5/4  A5/4 G5/4 E5/4 G5/4  F5/8 r/8' }
      ],
      loopFrom: 0
    },

    // ----- Halloween: Grieg, "In the Hall of the Mountain King" (public domain) -----
    halloween: {
      bpm: 116, barSteps: 16, reverb: 0.45, wind: true,
      lead: [{ inst: 'pluck', vol: 0.32 }],
      accomp: [{ style: 'ostinato', inst: 'pluck', vol: 0.2 }, { style: 'pad', inst: 'darkpad', vol: 0.1 }],
      drums: { timpani: 'x.......x.......' },
      parts: [
        { chords: ['Bm', 'F#', 'Bm', 'F#'],
          melody: 'B3/2 C#4/2 D4/2 E4/2 F#4/2 D4/2 F#4/4  F4/2 C#4/2 F4/4 E4/2 C4/2 E4/4  B3/2 C#4/2 D4/2 E4/2 F#4/2 D4/2 F#4/2 B4/2  A4/2 F#4/2 D4/2 F#4/2 A4/8' },
        { chords: ['Bm', 'F#', 'Bm', 'F#'], lead: [{ inst: 'organ', vol: 0.22 }, { inst: 'pluck', vol: 0.2 }], transpose: 12,
          melody: 'B3/2 C#4/2 D4/2 E4/2 F#4/2 D4/2 F#4/4  F4/2 C#4/2 F4/4 E4/2 C4/2 E4/4  B3/2 C#4/2 D4/2 E4/2 F#4/2 D4/2 F#4/2 B4/2  A4/2 F#4/2 D4/2 F#4/2 A4/8' }
      ],
      loopFrom: 0
    }
  };

  /* ------------------------------------------------------------------ theory */
  var SEMI = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  var QUAL = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], sus4: [0, 5, 7], dim: [0, 3, 6] };
  function midiOf(tok) { var m = tok.match(/^([A-G][#b]?)(\d)$/); return 12 * (+m[2] + 1) + SEMI[m[1]]; }
  function hz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
  function chordNotes(name) {
    var m = name.match(/^([A-G][#b]?)(.*)$/), root = 48 + SEMI[m[1]];
    if (root > 54) root -= 12; // keep voicings around C3..F#3
    return (QUAL[m[2]] || QUAL['']).map(function (i) { return root + i; });
  }

  // compile a song into a flat timeline
  function compile(song) {
    var bars = [], events = {}, step = 0, loopStep = 0;
    song.parts.forEach(function (part, pi) {
      if (pi === song.loopFrom) loopStep = step;
      var start = step, tr = (song.transpose || 0) + (part.transpose || 0);
      part.chords.forEach(function (c) { bars.push({ start: step, chord: chordNotes(c), part: part }); step += song.barSteps; });
      var s = start;
      part.melody.trim().split(/\s+/).forEach(function (tok) {
        var p = tok.split('/'), len = +p[1];
        if (p[0] !== 'r' && !part.mute) (events[s] = events[s] || []).push({ midi: midiOf(p[0]) + tr, len: len, part: part });
        s += len;
      });
    });
    return { bars: bars, events: events, total: step, loop: loopStep };
  }

  /* ------------------------------------------------------------------ audio engine */
  var ctx, out, dry, verb, lp, noiseBuf, song, tl, timer, cur = 0, nextTime = 0, stepDur = 0.1;
  var started = false, muted = false, enabled = true, btn, hint, themeId = 'none', fileUrl = '', audioEl = null;
  try { muted = localStorage.getItem(STORE) === '1'; } catch (e) { /* storage blocked */ }

  function setup() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    out = ctx.createGain(); out.gain.value = muted ? 0 : VOLUME;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 18000; lp.Q.value = 0.3;
    out.connect(lp); lp.connect(comp); comp.connect(ctx.destination);

    dry = ctx.createGain(); dry.connect(out);
    verb = ctx.createConvolver(); verb.buffer = impulse(2.6); var vg = ctx.createGain(); vg.gain.value = 1; verb.connect(vg); vg.connect(out);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  function impulse(sec) {
    var len = ctx.sampleRate * sec, b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = b.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    return b;
  }

  // route a voice to dry + reverb
  function bus(send) {
    var g = ctx.createGain(); g.connect(dry);
    var s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(verb);
    return g;
  }
  function env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(peak * 0.6, t + a, hold / 3 + 0.01);
    g.gain.setTargetAtTime(0.0001, t + a + hold, rel / 4);
  }
  function osc(type, f, t, stop, dest, detune) {
    var o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (detune) o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(stop); return o;
  }
  function vibrato(o, f, t, stop, depth, rate) {
    var l = ctx.createOscillator(), g = ctx.createGain(); l.frequency.value = rate || 5; g.gain.value = f * (depth || 0.006);
    l.connect(g); g.connect(o.frequency); l.start(t); l.stop(stop);
  }

  var INST = {
    epiano: function (t, f, dur, v, o) {
      var g = ctx.createGain(), stop = t + dur + 0.8; env(g, t, 0.006, v, dur * 0.8, 0.6); g.connect(o);
      var trem = ctx.createGain(); trem.gain.value = 1; trem.connect(g);
      osc('sine', f, t, stop, trem); var h = ctx.createGain(); h.gain.value = 0.18; h.connect(trem); osc('triangle', f * 2, t, stop, h);
      var l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 4.2; lg.gain.value = 0.18; l.connect(lg); lg.connect(trem.gain); l.start(t); l.stop(stop);
    },
    piano: function (t, f, dur, v, o) {
      var g = ctx.createGain(), stop = t + dur + 1.2; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.004);
      g.gain.setTargetAtTime(0.0001, t + 0.01, 0.35 + dur * 0.3); g.connect(o);
      var f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.setValueAtTime(5000, t); f2.frequency.setTargetAtTime(1200, t, 0.3); f2.connect(g);
      osc('triangle', f, t, stop, f2); var h = ctx.createGain(); h.gain.value = 0.25; h.connect(f2); osc('sine', f * 2, t, stop, h, 3);
    },
    flute: function (t, f, dur, v, o) {
      var g = ctx.createGain(), stop = t + dur + 0.5; env(g, t, 0.04, v, dur * 0.9, 0.25); g.connect(o);
      var x = osc('sine', f, t, stop, g); if (dur > 0.35) vibrato(x, f, t + 0.15, stop, 0.005, 5);
    },
    whistle: function (t, f, dur, v, o) {
      var g = ctx.createGain(), stop = t + dur + 0.3; env(g, t, 0.03, v, dur * 0.85, 0.15); g.connect(o);
      var x = osc('sine', f, t, stop, g); vibrato(x, f, t + 0.08, stop, 0.008, 5.5);
      x.frequency.setValueAtTime(f * 0.97, t); x.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    },
    bell: function (t, f, dur, v, o) {
      [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(function (p) {
        var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * p[1], t + 0.003);
        g.gain.setTargetAtTime(0.0001, t + 0.004, 0.35 / p[0] + 0.15); g.connect(o); osc('sine', f * p[0], t, t + 2.2, g);
      });
    },
    pluck: function (t, f, dur, v, o, bright) {
      var g = ctx.createGain(), stop = t + Math.min(dur, 0.8) + 0.5; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.003);
      g.gain.setTargetAtTime(0.0001, t + 0.01, 0.12 + Math.min(dur, 0.6) * 0.25); g.connect(o);
      var fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(bright || 3200, t); fl.frequency.setTargetAtTime(500, t, 0.12); fl.connect(g);
      osc('sawtooth', f, t, stop, fl);
    },
    harpsichord: function (t, f, dur, v, o) { INST.pluck(t, f, Math.min(dur, 0.35), v, o, 6500); },
    uke: function (t, f, dur, v, o) { INST.pluck(t, f, 0.3, v, o, 2600); },
    banjo: function (t, f, dur, v, o) { INST.pluck(t, f, 0.18, v, o, 5200); },
    strings: function (t, f, dur, v, o) {
      var g = ctx.createGain(), stop = t + dur + 1; env(g, t, 0.22, v, dur * 0.9, 0.7); g.connect(o);
      var fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1800; fl.connect(g);
      var a = osc('sawtooth', f, t, stop, fl, -7), b = osc('sawtooth', f, t, stop, fl, 7);
      vibrato(a, f, t + 0.2, stop, 0.004, 5); vibrato(b, f, t + 0.2, stop, 0.004, 5.3);
    },
    darkpad: function (t, f, dur, v, o) {
      var g = ctx.createGain(), stop = t + dur + 1.5; env(g, t, 0.6, v, dur, 1.2); g.connect(o);
      var fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 700; fl.Q.value = 4; fl.connect(g);
      osc('sawtooth', f / 2, t, stop, fl, -10); osc('sawtooth', f / 2, t, stop, fl, 10);
    },
    brass: function (t, f, dur, v, o) {
      var g = ctx.createGain(), stop = t + dur + 0.4; env(g, t, 0.05, v, dur * 0.85, 0.2); g.connect(o);
      var fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(500, t); fl.frequency.linearRampToValueAtTime(2600, t + 0.07); fl.frequency.setTargetAtTime(1600, t + 0.08, 0.2); fl.connect(g);
      var a = osc('sawtooth', f, t, stop, fl, -4); osc('sawtooth', f, t, stop, fl, 4); if (dur > 0.4) vibrato(a, f, t + 0.25, stop, 0.005, 5);
    },
    bugle: function (t, f, dur, v, o) { INST.brass(t, f, dur, v, o); },
    horn: function (t, f, dur, v, o) {
      var g = ctx.createGain(), stop = t + dur + 0.8; env(g, t, 0.12, v, dur * 0.9, 0.5); g.connect(o);
      var fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1100; fl.connect(g);
      var a = osc('sawtooth', f, t, stop, fl); osc('triangle', f, t, stop, fl, 5); vibrato(a, f, t + 0.3, stop, 0.004, 4.5);
    },
    organ: function (t, f, dur, v, o) {
      var g = ctx.createGain(), stop = t + dur + 0.2; env(g, t, 0.015, v, dur * 0.95, 0.1); g.connect(o);
      [[1, 1], [2, 0.5], [3, 0.3], [4, 0.22], [8, 0.08]].forEach(function (p) {
        var h = ctx.createGain(); h.gain.value = p[1]; h.connect(g); var x = osc('sine', f * p[0], t, stop, h); vibrato(x, f * p[0], t, stop, 0.003, 6.5);
      });
    },
    bass: function (t, f, dur, v, o) {
      var g = ctx.createGain(), stop = t + dur + 0.3; env(g, t, 0.008, v, dur * 0.7, 0.15); g.connect(o);
      var fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 900; fl.connect(g); osc('triangle', f, t, stop, fl);
    },
    subbass: function (t, f, dur, v, o) {
      var g = ctx.createGain(), stop = t + dur + 0.3; env(g, t, 0.01, v, dur * 0.8, 0.2); g.connect(o); osc('sine', f, t, stop, g);
    }
  };

  function noise(t, dur, vol, type, freq, q, dest) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || dry); s.start(t); s.stop(t + dur + 0.05);
  }
  function thump(t, f0, f1, dur, vol, dest) {
    var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || dry); o.start(t); o.stop(t + dur + 0.05);
  }
  var DRUM = {
    kick: function (t, v) { thump(t, 140, 45, 0.28, 0.8 * v); },
    softkick: function (t, v) { thump(t, 90, 40, 0.3, 0.65 * v); },
    snare: function (t, v) { noise(t, 0.16, 0.32 * v, 'bandpass', 1900, 0.8); thump(t, 200, 130, 0.08, 0.2 * v); },
    rim: function (t, v) { noise(t, 0.03, 0.25 * v, 'bandpass', 3000, 3); thump(t, 900, 700, 0.03, 0.12 * v); },
    hat: function (t, v) { noise(t, 0.04, 0.1 * v, 'highpass', 8000); },
    shaker: function (t, v) { noise(t, 0.07, 0.08 * v, 'bandpass', 6500, 1.5); },
    sleigh: function (t, v) { for (var i = 0; i < 4; i++) noise(t + i * 0.018, 0.06, 0.07 * v, 'highpass', 9000); },
    hoof: function (t, v) { thump(t, 700, 380, 0.05, 0.28 * v); noise(t, 0.02, 0.1 * v, 'bandpass', 2500, 2); },
    anvil: function (t, v) { INST.bell(t, 1750, 0.2, 0.08 * v, dry); INST.bell(t, 2650, 0.2, 0.05 * v, dry); },
    timpani: function (t, v) { thump(t, 100, 72, 0.9, 0.55 * v, bus(0.5)); noise(t, 0.25, 0.05 * v, 'lowpass', 300); }
  };

  function crackle(t, dur) { // vinyl crackle for lo-fi
    for (var i = 0; i < 3; i++) if (Math.random() < 0.6) noise(t + Math.random() * dur, 0.006 + Math.random() * 0.01, 0.05 + Math.random() * 0.08, 'highpass', 2500 + Math.random() * 3000);
    if (Math.random() < 0.15) noise(t, dur * 1.2, 0.012, 'bandpass', 900, 0.5);
  }
  function bird(t) {
    var g = ctx.createGain(), o = ctx.createOscillator(); o.type = 'sine';
    var f = 2600 + Math.random() * 1600; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.06);
    o.frequency.exponentialRampToValueAtTime(f * 0.9, t + 0.12);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(g); g.connect(bus(0.4)); o.start(t); o.stop(t + 0.15);
  }
  function wind(t, dur) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(1100, t + dur / 2); f.frequency.linearRampToValueAtTime(250, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.08, t + dur / 2); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus(0.6)); s.start(t); s.stop(t + dur + 0.1);
  }

  /* ------------------------------------------------------------------ sequencer */
  function barAt(s) { var b = null; for (var i = 0; i < tl.bars.length; i++) { if (tl.bars[i].start <= s) b = tl.bars[i]; else break; } return b; }

  function play(s, t) {
    var bar = barAt(s), pos = s - bar.start, part = bar.part, S = song.barSteps, beat = S === 12 ? 4 : 4;
    var send = song.reverb || 0.2, chord = bar.chord, root = chord[0];

    // melody
    (tl.events[s] || []).forEach(function (ev) {
      (part.lead || song.lead).forEach(function (L) {
        INST[L.inst](t, hz(ev.midi + 12 * (L.oct || 0)), ev.len * stepDur, L.vol, bus(send));
      });
    });

    // accompaniment
    if (!part.noAccomp) song.accomp.forEach(function (A) {
      var I = INST[A.inst], o = bus(send);
      switch (A.style) {
        case 'lofi':
          if (pos === 0) chord.forEach(function (n, i) { I(t + i * 0.012, hz(n + 12), stepDur * 7, A.vol, o); });
          if (pos === 7) chord.slice(1).forEach(function (n) { I(t, hz(n + 12), stepDur * 3, A.vol * 0.7, o); });
          if (pos === 10) chord.slice(0, 3).forEach(function (n) { I(t, hz(n + 12), stepDur * 5, A.vol * 0.6, o); });
          break;
        case 'bassLofi':
          if (pos === 0) I(t, hz(root - 12), stepDur * 6, A.vol, o);
          if (pos === 10) I(t, hz(root - 12), stepDur * 3, A.vol * 0.8, o);
          if (pos === 14) I(t, hz(root - 12 + 7), stepDur * 2, A.vol * 0.6, o);
          break;
        case 'oompah':
          if (pos % beat === 0) {
            var b = pos / beat;
            if (b % 2 === 0) INST.bass(t, hz(root - 12 + (b === 2 ? 7 : 0)), stepDur * 3, 0.42, o);
            else chord.forEach(function (n) { I(t, hz(n + 12), stepDur * 2, A.vol, o); });
          }
          break;
        case 'oompahBass':
          if (pos % 4 === 0) I(t, hz(root - 12 + ((pos / 4) % 2 ? 7 : 0)), stepDur * 3, A.vol, o);
          break;
        case 'pad':
          if (pos === 0) chord.forEach(function (n) { I(t, hz(n + 12), stepDur * S * 0.98, A.vol, o); });
          break;
        case 'arp':
          if (pos % 2 === 0) { var seq = [0, 1, 2, 3, 2, 1, 0, 2], k = seq[(pos / 2) % seq.length], nn = k === 3 ? root + 12 : chord[k % chord.length]; I(t, hz(nn), stepDur * 4, A.vol, o); }
          break;
        case 'eighths':
          if (pos % 2 === 0) I(t, hz(chord[(pos / 2) % chord.length] + 12), stepDur * 1.5, A.vol, o);
          break;
        case 'strum':
          if (A.pattern[pos] === 'x') chord.concat([root + 12]).forEach(function (n, i) { I(t + i * 0.014, hz(n + 12), stepDur * 2, A.vol, o); });
          if (pos === 0) INST.bass(t, hz(root - 12), stepDur * 4, 0.3, o);
          break;
        case 'root1':
          if (pos === 0) I(t, hz(root - 12), stepDur * S, A.vol, o);
          break;
        case 'root2':
          if (pos === 0 || pos === S / 2) I(t, hz(root - 12 + (pos ? 7 : 0)), stepDur * (S / 2 - 1), A.vol, o);
          break;
        case 'ostinato':
          if (pos % 2 === 0) I(t, hz(root - 12 + ((pos / 2) % 2 ? 7 : 0)), stepDur * 1.6, A.vol, o);
          break;
      }
    });

    // drums
    if (!part.noDrums) Object.keys(song.drums).forEach(function (k) {
      var c = song.drums[k][pos % song.drums[k].length];
      if (c === 'x') DRUM[k](t, 1); else if (c === 'o') DRUM[k](t, 0.55);
    });

    // atmosphere
    if (song.crackle) crackle(t, stepDur);
    if (song.birds && Math.random() < 0.04) { bird(t); if (Math.random() < 0.5) bird(t + 0.16); }
    if (song.wind && pos === 0 && Math.random() < 0.3) wind(t, 3.5);
  }

  function tick() {
    while (nextTime < ctx.currentTime + 0.15) {
      var swing = (song.swing || 0) * stepDur * (cur % 2);
      play(cur, nextTime + swing);
      cur++; if (cur >= tl.total) cur = tl.loop;
      nextTime += stepDur;
    }
  }

  var starting = false;
  function start() {
    if (started || starting || !enabled) return;
    if (!ctx && !setup()) return;
    if (fileUrl && !audioEl) {
      // your own track: an <audio> element routed through Web Audio so the 15% volume works on iPhones too
      audioEl = new Audio(); audioEl.src = fileUrl; audioEl.loop = true; audioEl.preload = 'auto';
      try { ctx.createMediaElementSource(audioEl).connect(dry); } catch (e) { /* older browsers: plays at full volume */ audioEl.volume = VOLUME; }
      var pp = audioEl.play(); if (pp && pp.catch) pp.catch(function () {}); // must start inside the tap
    }
    starting = true;
    var go = function () {
      starting = false;
      if (ctx.state !== 'running' || started) return; // browser still blocking: wait for the next tap
      begin();
      detach();
    };
    if (ctx.state === 'running') go();
    else { var p = ctx.resume(); if (p && p.then) p.then(go, function () { starting = false; }); else setTimeout(go, 50); }
  }
  function begin() {
    if (audioEl) {
      started = true;
      if (audioEl.paused) audioEl.play().catch(function () {});
      if (hint) hint.classList.add('gone');
      render();
      return;
    }
    song = SONGS[themeId] || SONGS.lofi;
    tl = compile(song);
    stepDur = 60 / song.bpm / 4;
    lp.frequency.value = song.lowpass || 18000;
    started = true; cur = 0; nextTime = ctx.currentTime + 0.08;
    timer = setInterval(tick, 25); tick();
    if (hint) hint.classList.add('gone');
    render();
  }

  function setMuted(m) {
    muted = m;
    try { localStorage.setItem(STORE, m ? '1' : '0'); } catch (e) { /* ignore */ }
    if (ctx) out.gain.setTargetAtTime(m ? 0 : VOLUME, ctx.currentTime, 0.05);
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
      (on ? '<path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>' : '<path d="M17 9l5 6M22 9l-5 6"/>') + '</svg>';
  }

  // Only gestures that browsers count as "user activation" may start audio:
  // the END of a tap (touchend/pointerup), a click, or a key press - not touchstart.
  function onFirstGesture(e) {
    if (btn && btn.contains(e.target)) return;
    if (muted) return; // stays silent until they press the speaker button
    start();
  }
  var EVENTS = ['touchend', 'pointerup', 'mousedown', 'click', 'keydown'];
  function detach() { EVENTS.forEach(function (ev) { document.removeEventListener(ev, onFirstGesture, true); }); }

  window.NeonMusic = {
    songs: SONGS,
    init: function (opts) {
      opts = opts || {};
      enabled = opts.enabled !== false;
      themeId = opts.theme || 'none';
      fileUrl = opts.file || '';
      if (!enabled) return;
      btn = document.createElement('button'); btn.type = 'button'; btn.className = 'music-btn';
      btn.addEventListener('click', function () { if (!started) { setMuted(false); start(); return; } setMuted(!muted); });
      window.__musicState = function () { return { ctx: ctx ? ctx.state : 'none', started: started, file: audioEl ? (audioEl.paused ? 'paused' : 'playing ' + audioEl.currentTime.toFixed(1) + 's') : 'synth' }; };
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
        if (document.hidden) { ctx.suspend(); if (audioEl) audioEl.pause(); }
        else { ctx.resume(); if (audioEl) audioEl.play().catch(function () {}); }
      });
    },
    // rolling thunder (Halloween lightning)
    thunder: function () {
      if (!ctx || !started || muted) return;
      var t = ctx.currentTime + 0.02;
      noise(t, 0.25, 0.35, 'highpass', 1800);                  // the crack
      var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noiseBuf; src.loop = true; f.type = 'lowpass'; f.frequency.setValueAtTime(260, t); f.frequency.linearRampToValueAtTime(90, t + 3);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.9, t + 0.12);
      g.gain.setTargetAtTime(0.35, t + 0.3, 0.4); g.gain.setTargetAtTime(0.0001, t + 1.4, 0.7);
      src.connect(f); f.connect(g); g.connect(bus(0.5)); src.start(t); src.stop(t + 4.5);
      thump(t + 0.05, 70, 35, 1.2, 0.5);
    },
    // fade the music out/in (e.g. while a video plays)
    duck: function (on) {
      if (!ctx) return;
      out.gain.setTargetAtTime(on || muted ? 0 : VOLUME, ctx.currentTime, 0.15);
    },
    // gentle chime when the guest gets online (skipped on solemn days)
    fanfare: function () {
      if (!ctx || !started || muted || themeId === 'anzac' || themeId === 'remembrance') return;
      var t = ctx.currentTime + 0.05;
      [72, 76, 79, 84].forEach(function (m, i) { INST.bell(t + i * 0.1, hz(m), 0.3, 0.3, bus(0.4)); });
    }
  };
})();
