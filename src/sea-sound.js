// Sea Trial's sound: 16-bit style music and effects, synthesised live with Web Audio.
// No sound files. Each instrument is a few oscillators or a burst of noise, run through a
// shared echo the way the cartridge consoles did it, so the whole thing stays dependency-free.
// The main game uses the same engine with its own songs and effects (src/game-sound.js).
(function (H) {
  'use strict';
  const NOTE = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
  // 'C#5' or 'Bb3' to a MIDI number.
  function midi(name) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  // 'Dm', 'Bb', 'G7', 'Am7', 'Fmaj7', 'Gsus4', 'Bdim' or 'C/E' to the root (in octave 2), the
  // bass note (the root unless one is given after a slash) and the chord's notes.
  const QUALITY = {'': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus4: [0, 5, 7], dim: [0, 3, 6]};
  function chord(name) {
    const m = /^([A-G][#b]?)(maj7|m7|sus4|dim|m|7)?(?:\/([A-G][#b]?))?$/.exec(name);
    const root = midi(m[1] + '2');
    return {root, bass: m[3] ? midi(m[3] + '2') : root, tones: QUALITY[m[2] || ''].map(i => root + i)};
  }

  // A song is a grid of sixteenth-note steps. Melodies are written one token per eighth note:
  // a note starts it, '.' holds the note before, '-' is a rest. Bass, arpeggios and pads follow
  // the chord for each bar, and the drums repeat a one-bar pattern with a fill on the last bar.
  const GROOVE = {
    drive: {k: [0, 6, 8, 11], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14], fill: [10, 12, 13, 14, 15]},
    calm: {k: [0, 10], s: [], h: [4, 12], fill: []},
    none: {k: [], s: [], h: [], fill: []}
  };
  const SONGS = {
    // Under way: D minor, two eight-bar halves, about half a minute, roughly the length of a level.
    level: {bpm: 132, lead: 'pulse', groove: 'drive', bass: 'octave', arp: true, pad: [8, 16],
      chords: 'Dm Bb C Am Dm Bb Gm A Bb C Am Dm Gm C F A',
      tune: 'D5 . . A4 D5 E5 F5 . | E5 D5 . C5 D5 . . - | C5 . . G4 C5 D5 E5 . | F5 E5 D5 C5 E5 . . - | ' +
        'D5 . . A4 D5 E5 F5 G5 | A5 . G5 F5 G5 . F5 E5 | D5 . E5 F5 G5 . F5 E5 | E5 . . . C#5 . A4 . | ' +
        'F5 . . . D5 . F5 . | G5 . . . E5 . C5 . | A5 . G5 . E5 . C5 . | D5 . . . . . A4 . | ' +
        'Bb4 . D5 . G5 . F5 . | E5 . G5 . C6 . Bb5 . | A5 . . G5 F5 . E5 . | E5 . . . C#5 . E5 .'},
    // The title screen: the same harbour in F major, slower, on a marimba.
    title: {bpm: 96, lead: 'bell', groove: 'calm', bass: 'half', arp: false, pad: [0, 8],
      chords: 'F Dm Bb C F Dm Bb F',
      tune: 'A4 . C5 . F5 . E5 . | D5 . . . A4 . . . | Bb4 . D5 . F5 . G5 . | E5 . . . . . . - | ' +
        'A4 . C5 . F5 . A5 . | G5 . F5 . D5 . . . | F5 . D5 . E5 . G5 . | F5 . . . . . . -'},
    // Jingles play once.
    lost: {bpm: 150, lead: 'saw', groove: 'none', bass: 'held', once: true, chords: 'A',
      tune: 'E5 D#5 D5 C#5 . . . -'},
    over: {bpm: 112, lead: 'saw', groove: 'none', bass: 'held', pad: [0, 3], once: true, chords: 'Dm A Dm',
      tune: 'A4 . G#4 . G4 . F#4 . | F4 . . E4 . . D#4 . | D4 . . . . . . -'},
    clear: {bpm: 150, lead: 'pulse', groove: 'none', bass: 'held', pad: [1, 3], once: true, roll: true, chords: 'D G D',
      tune: 'A4 D5 F#5 A5 D6 . A5 D6 | B5 . . G5 B5 . D6 . | D6 . . . . . . -'},
    win: {bpm: 138, lead: 'pulse', groove: 'drive', bass: 'octave', arp: true, pad: [0, 5], once: true, roll: true, chords: 'D D G A D D',
      tune: 'A4 . D5 . F#5 . A5 . | . . F#5 . A5 . . . | B5 . . . A5 . G5 . | F#5 . E5 . F#5 . G5 . | A5 . . . F#5 . D6 . | D6 . . . . . . -'}
  };
  // Each level has its own key, pace and lead: brighter as you go, darker at dusk.
  const LEVEL_FEEL = [
    {bpm: 128, shift: 0}, {bpm: 132, shift: 0}, {bpm: 136, shift: 2},
    {bpm: 126, shift: -2, lead: 'saw'}, {bpm: 144, shift: 3}
  ];

  // Bass patterns, one bar each, as [step, note, length, velocity]. r is the bar's bass note,
  // fifth the note a fifth above it, and lead a chord note that steps towards the next bar.
  const BASS = {
    octave: (r, fifth) => [r, r + 12, r, r + 12, r, r + 12, fifth, r + 12].map((n, i) => [i * 2, n, 2, i % 2 ? 0.75 : 1]),
    half: (r, fifth) => [[0, r, 6, 1], [8, fifth, 6, 1]],
    held: r => [[0, r, 12, 1]],
    // Steady eighth notes that lean into the next chord.
    drive: (r, fifth, lead) => [r, r, r, r, r, r, fifth, lead].map((n, i) => [i * 2, n, 2, i % 2 ? 0.8 : 1]),
    // A bouncing line: root, a hop up the octave, and a step towards the next chord.
    bounce: (r, fifth, lead) => [[0, r, 3, 1], [3, r + 12, 1, 0.7], [4, r, 2, 0.9], [6, r + 12, 2, 0.8], [8, r, 3, 1], [11, fifth, 1, 0.7], [12, r + 12, 2, 0.9], [14, lead, 2, 0.85]],
    // Funk: short notes around the beat with room for the snare.
    funk: (r, fifth, lead) => [[0, r, 2, 1], [3, r, 1, 0.75], [6, r + 12, 1, 0.8], [7, r, 1, 0.7], [8, r, 2, 1], [10, fifth, 1, 0.8], [13, r + 12, 1, 0.8], [14, lead, 2, 0.9]],
    // Four to the bar, walking through the chord.
    walk: (r, fifth, lead, b) => [[0, r, 4, 1], [4, r + (b.tones[1] - b.root), 4, 0.85], [8, fifth, 4, 0.9], [12, lead, 4, 0.85]]
  };
  // The chord note nearest the next bar's bass note, for the bass to step from.
  function leading(b, next) {
    if (!next || next.bass === b.bass) return b.root + 7 > b.bass + 9 ? b.root - 5 : b.root + 7;
    let best = b.bass + 7, gap = 99;
    for (const tone of b.tones) for (const n of [tone - 12, tone, tone + 12]) {
      const d = Math.abs(n - next.bass);
      if (d && d < gap && n >= 31 && n <= 55) { gap = d; best = n; }
    }
    return best;
  }

  // Turn a song into its grid of steps. A song in parts (an array of smaller songs that take
  // any setting they do not give from the song) is each part in turn, end to end. Besides the
  // tune a song can have more lines (voices: [{inst, tune, vel, pan}]), chords played on given
  // steps (comp: {inst, steps, len, vel, pan}), a written bass line (bassline), a crash to open
  // (crash) and a swing (the off-beat eighth note played late by that share of its length).
  // wide spreads the drums across the stereo picture.
  function compile(spec, shift = 0) {
    if (spec.parts) {
      const parts = spec.parts.map(part => compile(Object.assign({}, spec, {parts: null}, part), shift));
      return {grid: [].concat(...parts.map(p => p.grid)), steps: parts.reduce((n, p) => n + p.steps, 0), step: parts[0].step, once: !!spec.once, swing: spec.swing || 0};
    }
    const bars = spec.chords.split(' ').map(chord);
    const steps = bars.length * 16, grid = Array.from({length: steps}, () => []);
    const add = (step, inst, note, len, vel = 1, pan = 0) => { if (step < steps) grid[step].push({inst, note: note + shift, len, vel, pan}); };
    // A written line, two steps per token (or div steps).
    const line = (text, inst, {vel = 1, pan = 0, div = 2} = {}) => {
      let last = null;
      text.replace(/\|/g, ' ').trim().split(/\s+/).forEach((tok, i) => {
        if (tok === '.') { if (last) last.len += div; return; }
        last = null;
        if (tok === '-') return;
        last = {inst, note: midi(tok) + shift, len: div, vel, pan};
        if (i * div < steps) grid[i * div].push(last);
      });
    };
    if (spec.tune) line(spec.tune, spec.lead, {vel: spec.leadVel || 1});
    for (const voice of spec.voices || []) line(voice.tune, voice.inst, voice);
    if (spec.bassline) line(spec.bassline, spec.bassInst || 'bass');
    const groove = typeof spec.groove === 'object' ? spec.groove : GROOVE[spec.groove || 'none'];
    const fill = Array.isArray(groove.fill) ? {s: groove.fill, t: []} : groove.fill;
    const arp = spec.arp === true ? {} : spec.arp, comp = spec.comp;
    const pad = spec.pad === true ? [0, bars.length] : spec.pad;
    bars.forEach((b, bar) => {
      const s = bar * 16, lastBar = bar === bars.length - 1;
      const r = b.bass, fifth = b.bass === b.root ? b.root + 7 : b.root + (b.root < b.bass ? 12 : 0);
      if (!spec.bassline && BASS[spec.bass]) for (const [at, n, len, vel] of BASS[spec.bass](r, fifth, leading(b, bars[bar + 1] || spec.then && chord(spec.then)), b)) add(s + at, spec.bassInst || 'bass', n, len, vel);
      // Arpeggios run up the chord: 0, 1, 2 are its notes, and past the last the octave above.
      const tone = p => b.tones[p % b.tones.length] + 12 * Math.floor(p / b.tones.length);
      if (arp) (arp.pattern || [0, 1, 2, 1, 0, 1, 2, 3, 0, 1, 2, 1, 0, 1, 2, 3]).forEach((p, i) => { if (p !== null) add(s + i, arp.inst || 'arp', (arp.pattern ? tone(p) : p === 3 ? b.tones[0] + 12 : b.tones[p]) + (arp.up === undefined ? 24 : arp.up), arp.len || 1, arp.vel || 0.8, arp.pan || 0); });
      if (comp) for (const at of comp.steps) b.tones.slice(0, 3).forEach(n => add(s + at, comp.inst, n + (comp.up === undefined ? 24 : comp.up), comp.len || 2, comp.vel || 0.7, comp.pan || 0));
      if (pad && bar >= pad[0] && bar < pad[1]) b.tones.forEach(n => add(s, spec.padInst || 'pad', n + 12, 16, 1, spec.padPan || 0));
      const filling = lastBar && !spec.once && spec.fill !== false && (fill.s.length || fill.t.length);
      const hits = filling ? {k: groove.k.filter(x => x < 10), s: [4, ...fill.s], h: groove.h.filter(x => x < 10), o: [], c: []} : groove;
      for (const x of hits.k) add(s + x, 'kick', 0, 1);
      for (const x of hits.s) add(s + x, 'snare', 0, 1, x > 9 && lastBar ? 0.7 + (x - 10) * 0.08 : 1);
      for (const x of hits.h) add(s + x, 'hat', 0, 1, x % 4 ? 0.6 : 1, spec.wide ? 0.25 : 0);
      for (const x of hits.o || []) add(s + x, 'ohat', 0, 1, 1, spec.wide ? 0.25 : 0);
      for (const x of hits.c || []) add(s + x, 'clap', 0, 1);
      if (filling) fill.t.forEach(([x, n], i) => add(s + x, 'tom', n, 1, 0.8 + i * 0.05, spec.wide ? -0.4 + i * 0.25 : 0));
      if (spec.crash && !bar) add(s, 'crash', 0, 1, 1, spec.wide ? -0.2 : 0);
    });
    if (spec.roll) for (let i = 0; i < 8; i++) add(i, 'snare', 0, 1, 0.35 + i * 0.06);
    return {grid, steps, step: 60 / spec.bpm / 4, once: !!spec.once, swing: spec.swing || 0};
  }
  // How late a step plays in a swung song: the off-beat eighth note, and the sixteenth after it.
  const late = (song, pos) => song.swing ? [0, 0, 2, 1][pos % 4] * song.swing * song.step : 0;

  // Build the sound engine. context: an AudioContext (or OfflineAudioContext for tests);
  // without one, it makes its own on the first call to unlock(). songs and effects replace
  // Sea Trial's own: songs in the format above, effects as kit => ({name(t) {...}}), where
  // kit holds the tone and hiss building blocks.
  H.seaSound = function ({context = null, muted = false, songs = null, effects = null} = {}) {
    const book = songs || SONGS;
    let ctx = context, out = null, musicBus = null, sfxBus = null, echo = null, noise = null, pulse = null, pulse12 = null, breath = null, pipes = null;
    const pans = new WeakMap();
    let song = null, songGain = null, songName = null, timer = 0, hidden = false;
    const log = [];
    function build() {
      if (out) return true;
      if (!ctx) {
        const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AC) return false;
        try { ctx = new AC({latencyHint: 'interactive'}); } catch (_) { return false; }
      }
      out = ctx.createGain(); out.gain.value = muted || hidden ? 0 : 1;
      const limit = ctx.createDynamicsCompressor();
      limit.threshold.value = -10; limit.knee.value = 6; limit.ratio.value = 8; limit.attack.value = 0.003; limit.release.value = 0.15;
      out.connect(limit); limit.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.42; musicBus.connect(out);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(out);
      // The echo: a short feedback delay with its top end rolled off.
      echo = ctx.createGain(); echo.gain.value = 0.28;
      const delay = ctx.createDelay(1), back = ctx.createGain(), dull = ctx.createBiquadFilter();
      delay.delayTime.value = 0.17; back.gain.value = 0.32; dull.type = 'lowpass'; dull.frequency.value = 2200;
      echo.connect(delay); delay.connect(dull); dull.connect(back); back.connect(delay); dull.connect(out);
      const n = ctx.sampleRate, buf = ctx.createBuffer(1, n, n), data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
      noise = buf;
      const wave = duty => {
        const real = new Float32Array(48), imag = new Float32Array(48);
        for (let k = 1; k < 48; k++) real[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * duty);
        return ctx.createPeriodicWave(real, imag);
      };
      pulse = wave(0.25); pulse12 = wave(0.125);
      // A flute's few soft overtones, and an organ's drawbars.
      const partials = list => ctx.createPeriodicWave(new Float32Array(list.length + 1), new Float32Array([0, ...list]));
      breath = partials([1, 0.32, 0.1, 0.04]); pipes = partials([1, 0.55, 0.05, 0.3, 0, 0.12, 0, 0.06]);
      return true;
    }
    // A place in the stereo picture, from -1 (left) to 1 (right), feeding the given bus.
    function panned(bus, pan) {
      if (!pan || !ctx.createStereoPanner) return bus;
      let places = pans.get(bus);
      if (!places) pans.set(bus, places = {});
      if (!places[pan]) { places[pan] = ctx.createStereoPanner(); places[pan].pan.value = pan; places[pan].connect(bus); }
      return places[pan];
    }

    // Building blocks: an oscillator with a pitch sweep, and a burst of filtered noise.
    function tone(t, {type = 'square', wave = null, f0, f1 = f0, dur, vol, attack = 0.004, bus = sfxBus, send = 0, filter = 0, glide = 'exp'}) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      if (wave) o.setPeriodicWave(wave); else o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) glide === 'exp' ? o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur) : o.frequency.linearRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      let node = o;
      if (filter) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; o.connect(f); node = f; }
      node.connect(g); g.connect(bus);
      if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(echo); }
      o.start(t); o.stop(t + dur + 0.02);
      o.onended = () => g.disconnect();
    }
    function hiss(t, {type = 'lowpass', f0, f1 = f0, q = 0.7, dur, vol, attack = 0.002, bus = sfxBus, send = 0}) {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; s.loop = true;
      f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(bus);
      if (send) { const e = ctx.createGain(); e.gain.value = send; g.connect(e); e.connect(echo); }
      s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
      s.onended = () => g.disconnect();
    }

    // A held note: oscillators (one for each detuning, in cents) through a low-pass that can
    // open or close as the note starts, with an attack, a fall to a sustained level, a release
    // and a vibrato that comes in late.
    function held(t, n, len, {type = 'sawtooth', wave = null, cents = [0], vol, attack = 0.02, decay = 0, sustain = 1, release = 0.08, cut = 0, cut0 = 0, sweep = 0.08, vib = 0, bus, send = 0}) {
      const end = t + Math.max(attack + 0.02, len * 0.95), stop = end + release * 3 + 0.02;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack);
      if (decay) g.gain.setTargetAtTime(vol * sustain, t + attack, decay / 3);
      g.gain.setTargetAtTime(0.0001, end, release / 3);
      let into = g;
      if (cut) {
        const f = ctx.createBiquadFilter(); f.type = 'lowpass';
        f.frequency.setValueAtTime(cut0 || cut, t);
        if (cut0) f.frequency.exponentialRampToValueAtTime(cut, t + sweep);
        f.connect(g); into = f;
      }
      let depth = null;
      if (vib) {
        const lfo = ctx.createOscillator(); depth = ctx.createGain();
        lfo.frequency.value = 5.5; depth.gain.setValueAtTime(0, t + Math.min(0.12, len / 2)); depth.gain.linearRampToValueAtTime(hz(n) * vib, t + Math.min(0.45, len));
        lfo.connect(depth); lfo.start(t); lfo.stop(stop);
      }
      cents.forEach((c, i) => {
        const o = ctx.createOscillator();
        if (wave) o.setPeriodicWave(wave); else o.type = type;
        o.frequency.value = hz(n) * Math.pow(2, c / 1200);
        if (depth) depth.connect(o.frequency);
        o.connect(into); o.start(t); o.stop(stop);
        if (!i) o.onended = () => g.disconnect();
      });
      g.connect(bus);
      if (send) { const e = ctx.createGain(); e.gain.value = send; g.connect(e); e.connect(echo); }
    }

    // Instruments for the sequencer: (start time, MIDI note, length in seconds, velocity, bus).
    const INSTRUMENTS = {
      // The sampled instruments of a 16-bit console, near enough: a breathy flute, a brass
      // section, strings, a slapped bass, a marimba, steel drums, an organ and a piano.
      flute(t, n, len, v, bus) {
        held(t, n, len, {wave: breath, vol: 0.12 * v, attack: 0.035, release: 0.1, vib: 0.006, bus, send: 0.7});
        hiss(t, {type: 'bandpass', f0: Math.min(6000, hz(n) * 2.5), q: 1.2, dur: 0.07, vol: 0.025 * v, bus});
      },
      brass(t, n, len, v, bus) { held(t, n, len, {cents: [-6, 6], vol: 0.15 * v, attack: 0.03, decay: 0.2, sustain: 0.75, release: 0.07, cut0: 500, cut: 2400, sweep: 0.07, vib: 0.004, bus, send: 0.5}); },
      strings(t, n, len, v, bus) { held(t, n, len, {cents: [-9, 0, 9], vol: 0.018 * v, attack: 0.09, release: 0.22, cut: 2000, vib: 0.004, bus, send: 0.5}); },
      slap(t, n, len, v, bus) {
        held(t, n, len, {vol: 0.15 * v, attack: 0.004, decay: 0.18, sustain: 0.45, release: 0.04, cut0: 2400, cut: 380, sweep: 0.1, bus});
        tone(t, {type: 'triangle', f0: hz(n), dur: Math.max(0.1, len * 0.9), vol: 0.26 * v, bus});
      },
      marimba(t, n, len, v, bus) {
        tone(t, {type: 'triangle', f0: hz(n), dur: Math.min(0.55, len + 0.3), vol: 0.22 * v, bus, send: 0.6});
        tone(t, {type: 'sine', f0: hz(n) * 4, dur: 0.05, vol: 0.07 * v, bus});
      },
      steel(t, n, len, v, bus) {
        tone(t, {type: 'sine', f0: hz(n), dur: Math.min(0.8, len + 0.45), vol: 0.2 * v, bus, send: 0.7});
        tone(t, {type: 'sine', f0: hz(n) * 2, dur: 0.3, vol: 0.09 * v, bus, send: 0.4});
        tone(t, {type: 'sine', f0: hz(n) * 3.01, dur: 0.14, vol: 0.04 * v, bus});
      },
      organ(t, n, len, v, bus) { held(t, n, len, {wave: pipes, vol: 0.09 * v, attack: 0.008, release: 0.04, bus, send: 0.3}); },
      piano(t, n, len, v, bus) {
        tone(t, {type: 'triangle', f0: hz(n), dur: Math.min(0.7, len + 0.3), vol: 0.15 * v, bus, send: 0.4});
        tone(t, {wave: pulse, f0: hz(n), dur: 0.11, vol: 0.045 * v, bus, filter: 2600});
      },
      tom(t, n, len, v, bus) {
        tone(t, {type: 'sine', f0: hz(n) * 1.5, f1: hz(n) * 0.85, dur: 0.24, vol: 0.5 * v, bus, send: 0.2});
        hiss(t, {type: 'bandpass', f0: 900, q: 0.8, dur: 0.04, vol: 0.1 * v, bus});
      },
      ohat(t, n, len, v, bus) { hiss(t, {type: 'highpass', f0: 7000, dur: 0.24, vol: 0.075 * v, bus}); },
      crash(t, n, len, v, bus) {
        hiss(t, {type: 'highpass', f0: 5200, dur: 1.3, vol: 0.15 * v, bus, send: 0.3});
        hiss(t, {type: 'bandpass', f0: 3400, q: 0.6, dur: 0.35, vol: 0.09 * v, bus});
      },
      clap(t, n, len, v, bus) { for (const at of [0, 0.011, 0.024]) hiss(t + at, {type: 'bandpass', f0: 1300, q: 1.1, dur: at > 0.02 ? 0.14 : 0.03, vol: 0.2 * v, bus, send: 0.3}); },
      pulse(t, n, len, v, bus) {
        const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), depth = ctx.createGain();
        o.setPeriodicWave(pulse); o.frequency.value = hz(n);
        lfo.frequency.value = 5.5; depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(hz(n) * 0.006, t + Math.min(len, 0.35));
        lfo.connect(depth); depth.connect(o.frequency);
        f.type = 'lowpass'; f.frequency.value = 3800;
        const end = t + Math.max(0.06, len * 0.92);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2 * v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.13 * v, t + 0.12);
        g.gain.setValueAtTime(0.13 * v, end - 0.04); g.gain.exponentialRampToValueAtTime(0.0001, end);
        o.connect(f); f.connect(g); g.connect(bus);
        const s = ctx.createGain(); s.gain.value = 0.7; g.connect(s); s.connect(echo);
        o.start(t); lfo.start(t); o.stop(end + 0.02); lfo.stop(end + 0.02);
        o.onended = () => g.disconnect();
      },
      saw(t, n, len, v, bus) {
        for (const cents of [-6, 6]) tone(t, {type: 'sawtooth', f0: hz(n) * Math.pow(2, cents / 1200), dur: Math.max(0.08, len * 0.95), vol: 0.1 * v, attack: 0.02, bus, send: 0.6, filter: 1700});
      },
      bell(t, n, len, v, bus) {
        tone(t, {type: 'triangle', f0: hz(n), dur: Math.min(1.2, len + 0.4), vol: 0.26 * v, bus, send: 0.8});
        tone(t, {type: 'sine', f0: hz(n) * 4, dur: 0.18, vol: 0.05 * v, bus, send: 0.5});
      },
      arp(t, n, len, v, bus) { tone(t, {wave: pulse12, f0: hz(n), dur: 0.09, vol: 0.045 * v, bus, send: 0.9, filter: 3000}); },
      bass(t, n, len, v, bus) {
        const d = Math.max(0.08, len * 0.9);
        tone(t, {type: 'triangle', f0: hz(n), dur: d, vol: 0.34 * v, bus});
        tone(t, {type: 'sawtooth', f0: hz(n), dur: Math.min(d, 0.14), vol: 0.06 * v, bus, filter: 900});
      },
      pad(t, n, len, v, bus) {
        for (const cents of [-8, 8]) {
          const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
          o.type = 'sawtooth'; o.frequency.value = hz(n) * Math.pow(2, cents / 1200);
          f.type = 'lowpass'; f.frequency.value = 1100;
          const end = t + len;
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.022 * v, t + 0.25); g.gain.setValueAtTime(0.022 * v, end - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.3);
          o.connect(f); f.connect(g); g.connect(bus);
          o.start(t); o.stop(end + 0.35); o.onended = () => g.disconnect();
        }
      },
      kick(t, n, len, v, bus) { tone(t, {type: 'sine', f0: 150, f1: 42, dur: 0.22, vol: 0.55 * v, bus}); },
      snare(t, n, len, v, bus) {
        hiss(t, {type: 'bandpass', f0: 1900, q: 0.8, dur: 0.16, vol: 0.32 * v, bus, send: 0.3});
        tone(t, {type: 'triangle', f0: 210, f1: 120, dur: 0.08, vol: 0.18 * v, bus});
      },
      hat(t, n, len, v, bus) { hiss(t, {type: 'highpass', f0: 7500, dur: 0.045, vol: 0.09 * v, bus}); }
    };

    // Effects, by name.
    const EFFECTS = {
      // A torpedo: a short swept zap, a thump and a rush of water.
      fire(t) {
        tone(t, {wave: pulse, f0: 1500, f1: 280, dur: 0.1, vol: 0.2, send: 0.3});
        tone(t, {type: 'sine', f0: 190, f1: 60, dur: 0.12, vol: 0.45});
        hiss(t, {f0: 3200, f1: 500, dur: 0.18, vol: 0.24});
      },
      // A target: a crunch and a bright two-note chime.
      hit(t) {
        hiss(t, {f0: 4200, f1: 300, dur: 0.32, vol: 0.42});
        tone(t, {type: 'square', f0: 260, f1: 70, dur: 0.16, vol: 0.14});
        tone(t + 0.03, {type: 'triangle', f0: hz(88), dur: 0.22, vol: 0.2, send: 0.6});
        tone(t + 0.09, {type: 'triangle', f0: hz(93), dur: 0.32, vol: 0.22, send: 0.6});
      },
      // A mine: a heavier boom.
      mine(t) {
        hiss(t, {f0: 2600, f1: 140, dur: 0.6, vol: 0.62, send: 0.3});
        tone(t, {type: 'sine', f0: 140, f1: 34, dur: 0.45, vol: 0.6});
        hiss(t + 0.08, {type: 'bandpass', f0: 900, f1: 200, q: 1.2, dur: 0.35, vol: 0.25});
      },
      // A patrol sub: a big double boom and a sinking groan.
      sink(t) {
        hiss(t, {f0: 3200, f1: 100, dur: 0.9, vol: 0.7, send: 0.35});
        tone(t, {type: 'sine', f0: 120, f1: 28, dur: 0.75, vol: 0.65});
        hiss(t + 0.14, {f0: 1800, f1: 90, dur: 0.6, vol: 0.45});
        tone(t + 0.2, {type: 'sawtooth', f0: 330, f1: 70, dur: 0.6, vol: 0.06, filter: 900});
      },
      // A torpedo glancing off a steel gate.
      clank(t) {
        tone(t, {type: 'square', f0: 2100, f1: 1500, dur: 0.04, vol: 0.16});
        tone(t, {type: 'sine', f0: 2637, dur: 0.2, vol: 0.14, send: 0.5});
        tone(t, {type: 'sine', f0: 3520 * 1.03, dur: 0.14, vol: 0.1});
        hiss(t, {type: 'highpass', f0: 5000, dur: 0.05, vol: 0.25});
      },
      // Losing the sub: the biggest boom, with the low end left rumbling.
      crash(t) {
        hiss(t, {f0: 3600, f1: 80, dur: 1.2, vol: 0.8, send: 0.35});
        tone(t, {type: 'sine', f0: 95, f1: 24, dur: 1, vol: 0.7});
        hiss(t + 0.1, {type: 'bandpass', f0: 700, f1: 120, q: 1.5, dur: 0.8, vol: 0.3});
      },
      // The dive klaxon at the start of each level: two rising blasts.
      dive(t) {
        for (const at of [0, 0.42]) {
          tone(t + at, {type: 'sawtooth', f0: 196, f1: 300, dur: 0.34, vol: 0.12, filter: 1400, attack: 0.02, glide: 'lin', send: 0.4});
          tone(t + at, {wave: pulse, f0: 98, f1: 150, dur: 0.34, vol: 0.1, filter: 1000, attack: 0.02, glide: 'lin'});
        }
      }
    };

    let fx = null;
    const kit = {tone, hiss, hz, get pulse() { return pulse; }, get pulse12() { return pulse12; }};
    const effectMap = () => fx || (fx = effects ? effects(kit) : EFFECTS);
    // A song, with Sea Trial's per-level key and pace applied to its level theme.
    function prepare(name, level) {
      const feel = name === 'level' && !songs ? LEVEL_FEEL[level] || LEVEL_FEEL[0] : {};
      const s = compile(Object.assign({}, book[name], feel.bpm ? {bpm: feel.bpm} : {}, feel.lead ? {lead: feel.lead} : {}), feel.shift || 0);
      s.gain = book[name].gain || 1;
      return s;
    }

    // The sequencer looks a little ahead on a timer, so music keeps time even if a frame stutters.
    function tick() {
      if (!song || !ctx) return;
      const now = ctx.currentTime, ahead = now + 0.14;
      // Back from a background tab, the timer will have fallen behind: skip the missed steps
      // rather than play them all at once.
      if (song.next < now - 0.05) {
        const missed = Math.ceil((now - song.next) / song.step);
        song.pos = song.once ? Math.min(song.steps, song.pos + missed) : (song.pos + missed) % song.steps;
        song.next += missed * song.step;
      }
      while (song.next < ahead) {
        if (song.pos >= song.steps) {
          // A jingle stops here and lets its last notes ring out.
          if (song.once) { clearInterval(timer); timer = 0; log.push('end:' + songName); song = null; songName = null; return; }
          song.pos = 0;
        }
        const t = Math.max(song.next, ctx.currentTime) + late(song, song.pos);
        for (const e of song.grid[song.pos]) INSTRUMENTS[e.inst](t, e.note, e.len * song.step, e.vel, panned(songGain, e.pan));
        song.pos++; song.next += song.step;
      }
    }
    function stopSong(fade = 0.06) {
      clearInterval(timer); timer = 0;
      if (songGain && ctx) {
        const g = songGain, t = ctx.currentTime;
        g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade);
        setTimeout(() => g.disconnect(), (fade + 1.5) * 1000);
      }
      song = null; songGain = null; songName = null;
    }

    const api = {
      log,
      get muted() { return muted; },
      get state() { return ctx ? ctx.state : 'none'; },
      get song() { return songName; },
      // The next step of the song, so a paused song can carry on from where it was.
      get position() { return song ? song.pos : 0; },
      // Call from any tap, click or key press: browsers only let sound start from one.
      // Resolves once the sound is running (or the browser has said no).
      // Ask for sound with no tap, click or key press behind the request: a browser that lets a
      // page play on opening starts it, and any other leaves it locked until unlock(). Resolves
      // once the sound is running, or the browser has said no, or (often) not until unlock().
      wake() {
        if (!build()) return Promise.resolve();
        return ctx.state !== 'running' && ctx.resume ? ctx.resume().then(tick, () => {}) : Promise.resolve();
      },
      unlock() {
        if (!build()) return Promise.resolve();
        let ready = Promise.resolve();
        if (ctx.state !== 'running' && ctx.resume) ready = ctx.resume().then(tick, () => {});
        if (!api.unlocked) {
          api.unlocked = true;
          const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0);
        }
        return ready;
      },
      effect(name, delay = 0) {
        log.push(name);
        if (!build() || !effectMap()[name]) return;
        effectMap()[name](ctx.currentTime + 0.005 + delay);
      },
      // Recorded sounds (the desktop's system sounds, src/win-sound.js): decode a sound file's
      // bytes, then play the result on the effects bus, so the mute and the limiter cover it too.
      decode(bytes) {
        if (!build()) return Promise.reject(new Error('No sound'));
        return new Promise((resolve, reject) => ctx.decodeAudioData(bytes, resolve, reject));
      },
      sample(buffer, vol = 1, name = '') {
        if (name) log.push(name);
        if (!build()) return null;
        const s = ctx.createBufferSource(), g = ctx.createGain();
        s.buffer = buffer; g.gain.value = vol;
        s.connect(g); g.connect(sfxBus);
        s.onended = () => g.disconnect();
        s.start(ctx.currentTime + 0.005);
        return s;
      },
      // Start a song from the top (or from step `from`), or switch to silence with null.
      music(name, level = 0, delay = 0, from = 0) {
        if (name) log.push('music:' + name);
        stopSong(name ? 0.05 : 0.3);
        if (!name || !build()) return;
        song = prepare(name, level);
        song.pos = from % song.steps; song.next = ctx.currentTime + 0.05 + delay;
        songGain = ctx.createGain(); songGain.gain.value = song.gain; songGain.connect(musicBus);
        songName = name;
        tick(); timer = setInterval(tick, 25);
      },
      setMuted(on) {
        muted = !!on;
        api.duck();
      },
      // Silence everything while the window is minimised or the page is in the background.
      setHidden(on) {
        if (hidden === !!on) return;
        hidden = !!on; api.duck();
      },
      duck() {
        if (!out) return;
        const t = ctx.currentTime;
        out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(muted || hidden ? 0 : 1, t + 0.08);
      },
      close() {
        stopSong(0.01);
        if (ctx && !context && ctx.close) ctx.close().catch(() => {});
        ctx = null; out = null;
      },
      // For tests: schedule a whole song from time t on an offline context, or only some of
      // its instruments (only: a list of their names).
      render(name, t = 0, level = 0, only = null) {
        build();
        const s = prepare(name, level);
        const g = ctx.createGain(); g.gain.value = s.gain; g.connect(musicBus);
        s.grid.forEach((list, i) => list.forEach(e => { if (!only || only.includes(e.inst)) INSTRUMENTS[e.inst](t + i * s.step + late(s, i), e.note, e.len * s.step, e.vel, panned(g, e.pan)); }));
        return s.steps * s.step;
      },
      renderEffect(name, t = 0) { build(); effectMap()[name](t); }
    };
    return api;
  };
  // For tests and tools: a song's grid of steps.
  H.seaSound.compile = compile;
})(globalThis.Hired);
