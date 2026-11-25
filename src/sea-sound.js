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
  // 'Dm' or 'Bb' to the root (in octave 2) and the triad above it.
  function chord(name) {
    const m = /^([A-G][#b]?)(m?)$/.exec(name);
    const root = midi(m[1] + '2');
    return {root, tones: [0, m[2] ? 3 : 4, 7].map(i => root + i)};
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

  function compile(spec, shift = 0) {
    const bars = spec.chords.split(' ').map(chord);
    const steps = bars.length * 16, grid = Array.from({length: steps}, () => []);
    const add = (step, inst, note, len, vel = 1) => { if (step < steps) grid[step].push({inst, note: note + shift, len, vel}); };
    // The tune, two steps per token.
    const tokens = spec.tune.replace(/\|/g, ' ').trim().split(/\s+/);
    let last = null;
    tokens.forEach((tok, i) => {
      if (tok === '.') { if (last) last.len += 2; return; }
      last = null;
      if (tok === '-') return;
      last = {inst: spec.lead, note: midi(tok) + shift, len: 2, vel: 1};
      if (i * 2 < steps) grid[i * 2].push(last);
    });
    const groove = typeof spec.groove === 'object' ? spec.groove : GROOVE[spec.groove || 'none'];
    bars.forEach((b, bar) => {
      const s = bar * 16, lastBar = bar === bars.length - 1;
      const r = b.root, fifth = b.root + 7;
      if (spec.bass === 'octave') [r, r + 12, r, r + 12, r, r + 12, fifth, r + 12].forEach((n, i) => add(s + i * 2, 'bass', n, 2, i % 2 ? 0.75 : 1));
      else if (spec.bass === 'half') { add(s, 'bass', r, 6); add(s + 8, 'bass', fifth, 6); }
      else if (spec.bass === 'held') add(s, 'bass', r, 12);
      if (spec.arp) [0, 1, 2, 1, 0, 1, 2, 3, 0, 1, 2, 1, 0, 1, 2, 3].forEach((p, i) => add(s + i, 'arp', (p === 3 ? b.tones[0] + 12 : b.tones[p]) + 24, 1, 0.8));
      if (spec.pad && bar >= spec.pad[0] && bar < spec.pad[1]) b.tones.forEach(n => add(s, 'pad', n + 12, 16));
      const hits = lastBar && !spec.once && groove.fill.length ? {k: groove.k.filter(x => x < 10), s: [4, ...groove.fill], h: groove.h.filter(x => x < 10)} : groove;
      for (const x of hits.k) add(s + x, 'kick', 0, 1);
      for (const x of hits.s) add(s + x, 'snare', 0, 1, x > 9 && lastBar ? 0.7 + (x - 10) * 0.08 : 1);
      for (const x of hits.h) add(s + x, 'hat', 0, 1, x % 4 ? 0.6 : 1);
    });
    if (spec.roll) for (let i = 0; i < 8; i++) add(i, 'snare', 0, 1, 0.35 + i * 0.06);
    return {grid, steps, step: 60 / spec.bpm / 4, once: !!spec.once};
  }

  // Build the sound engine. context: an AudioContext (or OfflineAudioContext for tests);
  // without one, it makes its own on the first call to unlock(). songs and effects replace
  // Sea Trial's own: songs in the format above, effects as kit => ({name(t) {...}}), where
  // kit holds the tone and hiss building blocks.
  H.seaSound = function ({context = null, muted = false, songs = null, effects = null} = {}) {
    const book = songs || SONGS;
    let ctx = context, out = null, musicBus = null, sfxBus = null, echo = null, noise = null, pulse = null, pulse12 = null;
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
      return true;
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

    // Instruments for the sequencer: (start time, MIDI note, length in seconds, velocity, bus).
    const INSTRUMENTS = {
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
        const t = Math.max(song.next, ctx.currentTime);
        for (const e of song.grid[song.pos]) INSTRUMENTS[e.inst](t, e.note, e.len * song.step, e.vel, songGain);
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
      // For tests: schedule a whole song from time t on an offline context.
      render(name, t = 0, level = 0) {
        build();
        const s = prepare(name, level);
        const g = ctx.createGain(); g.gain.value = s.gain; g.connect(musicBus);
        s.grid.forEach((list, i) => list.forEach(e => INSTRUMENTS[e.inst](t + i * s.step, e.note, e.len * s.step, e.vel, g)));
        return s.steps * s.step;
      },
      renderEffect(name, t = 0) { build(); effectMap()[name](t); }
    };
    return api;
  };
})(globalThis.Hired);
