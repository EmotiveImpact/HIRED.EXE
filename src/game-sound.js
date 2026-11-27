// HIRE.EXE's own music and effects, played on Sea Trial's 16-bit engine (src/sea-sound.js),
// so the platformer sounds as full and as loud as the submarine. One theme per world, each
// thirty-two bars in four parts and scored for the sort of instruments a 16-bit console's
// games had, and a short fanfare when a world is cleared.
// Songs use the engine's notation: one token per eighth note, '.' holds, '-' rests,
// and one chord per bar for the bass, arpeggios and pads. gain evens each theme out to
// Sea Trial's level music.
(function (H) {
  'use strict';
  // A funky one-bar drum pattern for Ship It City, a ticking one for the interview and a
  // driving one for Growth Run, each ending its part with a run round the toms.
  const TOMS = [[12, 52], [13, 50], [14, 47], [15, 43]];
  const FUNK = {k: [0, 3, 8, 11], s: [4, 12], h: [0, 2, 4, 6, 7, 8, 10, 12, 14, 15], c: [12], fill: {s: [10, 11], t: TOMS}};
  const CLOCK = {k: [0, 8], s: [4, 12], h: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], fill: {s: [], t: [[12, 50], [14, 45]]}};
  const SPRINT = {k: [0, 6, 8, 11], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12], o: [14], fill: {s: [10, 11], t: TOMS}};
  // Application Alley's drums: a pop beat with an open hat before the bar line and a run round
  // the toms to end each part, and a four-on-the-floor lift for the middle with a snare build.
  const POP = {k: [0, 7, 8], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12], o: [14], fill: {s: [11], t: TOMS}};
  const LIFT = {k: [0, 4, 8, 12], s: [4, 12], h: [2, 6, 10, 14], fill: [8, 10, 12, 13, 14, 15]};
  // Its tune's first six bars, which three of its four parts share, and the marimba's answers
  // in the gaps of those six bars.
  const ALLEY = 'G5 . E5 G5 . C6 . B5 | A5 . . . E5 . A5 . | A5 . F5 A5 . C6 . A5 | G5 . . . D5 . G5 . | G5 . E5 G5 . C6 . B5 | A5 . . . C6 . E6 . | ';
  const ANSWER = '- - - - - - - - | - E5 C5 E5 - - - - | - - - - - - - - | - D5 B4 D5 - - - - | - - - - - - - - | - E5 C5 E5 - - - - | ';
  // Ship It City's riff, Growth Run's tune and the arpeggios that run under it, and the two
  // halves of the interview's tune.
  const CITY = '- D5 - F5 G5 - A5 - | - G5 E5 - D5 C5 - - | - F5 - A5 C6 - Bb5 A5 | G5 - F5 D5 - C5 D5 - | ' +
    '- D5 - F5 G5 - A5 - | - G5 E5 - D5 C5 - - | - F5 - Bb5 D6 - C6 Bb5 | A5 . . . E5 . C#5 .';
  const GROWTH = 'B5 . . G5 . . E5 . | A5 . . F#5 . . D5 . | G5 . . E5 . . C5 E5 | F#5 . . . D#5 . B4 . | ' +
    'B5 . . G5 . . E5 . | A5 . . F#5 . . D5 . | C6 . . A5 . . E5 A5 | B5 . . . F#5 . D#5 .';
  const RUNS = 'E4 G4 B4 E5 B4 G4 E4 G4 | D4 F#4 A4 D5 A4 F#4 D4 F#4 | C4 E4 G4 C5 E5 C5 G4 E4 | B3 D#4 F#4 B4 F#4 D#4 B3 D#4 | ' +
    'E4 G4 B4 E5 B4 G4 E4 G4 | D4 F#4 A4 D5 A4 F#4 D4 F#4 | A3 C4 E4 A4 C5 A4 E4 C4 | B3 D#4 F#4 B4 F#4 D#4 B3 D#4';
  const WAITING = 'G4 . . B4 D5 . A4 . | F#4 . A4 . C#5 . . . | G4 . B4 D5 F#5 . E5 . | D5 . B4 . G4 . . - | ' +
    'G4 . . B4 D5 . A4 . | F#4 . A4 . C#5 . E5 . | E5 . . . B4 . G4 . | A4 . . . . . - -';
  const ROOM = 'E5 . . D5 C5 . B4 . | A4 . . B4 C5 . D5 . | F#5 . . E5 D5 . B4 . | E5 . . . . . G5 . | ' +
    'E5 . . D5 C5 . G5 . | A5 . . G5 E5 . C5 . | D5 . . . F#5 . A5 . | A5 . . . F#5 . D5 .';
  const SONGS = {
    // 01 Application Alley: C major and cheerful, in four eight-bar parts. A trumpet tune over a
    // slapped bass and off-beat piano, a marimba answering it the second time round, a flute
    // middle over strings and steel drums, then the tune again with the flute in harmony.
    alley: {bpm: 124, gain: 1, wide: true, lead: 'brass', bass: 'bounce', bassInst: 'slap', groove: POP, crash: true,
      comp: {inst: 'piano', steps: [2, 6, 10, 14], vel: 0.8, pan: -0.3},
      parts: [
        {chords: 'C Am F G C Am Dm G', then: 'C', tune: ALLEY + 'D6 . C6 A5 . F5 A5 . | G5 . . . - G4 B4 D5'},
        {chords: 'C Am F G C Am G C', then: 'F', tune: ALLEY + 'D6 . B5 G5 . B5 D6 . | C6 . . . . . - -',
          voices: [{inst: 'marimba', vel: 0.85, pan: 0.4, tune: ANSWER + '- - - - - - - - | - G4 C5 E5 G5 . - -'}]},
        {chords: 'F G Em Am Dm G C G7', then: 'C', lead: 'flute', bass: 'drive', groove: LIFT, comp: null, pad: true, padInst: 'strings',
          arp: {inst: 'steel', pattern: [0, null, 1, null, 2, null, 1, null, 3, null, 2, null, 1, null, 2, null], vel: 0.5, pan: 0.35},
          tune: '- A5 A5 A5 . G5 F5 . | - B5 B5 B5 . A5 G5 . | - G5 G5 G5 . E5 B4 . | A4 . C5 E5 . A5 . . | ' +
            '- F5 F5 F5 . E5 D5 . | - G5 G5 G5 . F5 D5 . | E5 . G5 C6 . E6 . . | D6 . . B5 . G5 F5 D5'},
        {chords: 'C Am F G C Am G C', then: 'C', pad: true, padInst: 'strings', tune: ALLEY + 'D6 . B5 G5 . B5 D6 . | C6 . . . - G4 B4 D5',
          voices: [
            {inst: 'flute', vel: 0.55, pan: -0.3, tune: 'E5 . C5 E5 . G5 . G5 | E5 . . . C5 . E5 . | F5 . C5 F5 . A5 . F5 | D5 . . . B4 . D5 . | ' +
              'E5 . C5 E5 . G5 . G5 | E5 . . . A5 . C6 . | B5 . G5 D5 . G5 B5 . | G5 . . . - - - -'},
            {inst: 'marimba', vel: 0.85, pan: 0.4, tune: ANSWER + '- - - - - - - - | - G4 C5 E5 - - - -'}]}
      ]},
    // 02 Ship It City: D minor funk. The original off-beat riff on brass over a slapped bass and
    // organ stabs, a flute middle over strings and steel drums, then the riff with the flute
    // in harmony.
    city: {bpm: 112, gain: 1.04, wide: true, lead: 'brass', leadVel: 1.15, bass: 'funk', bassInst: 'slap', groove: FUNK, crash: true,
      comp: {inst: 'organ', steps: [3, 6, 11, 14], len: 1, vel: 0.7, pan: -0.3},
      parts: [
        {chords: 'Dm7 C F Gm7 Dm7 C Bb A7', then: 'Dm7', tune: CITY},
        {chords: 'Dm7 C F Gm7 Dm7 C Bb A7', then: 'Bb', tune: CITY,
          voices: [{inst: 'steel', vel: 0.7, pan: 0.4, tune: '- - - - - - - D6 | - - - - - - E5 G5 | - - - - - - - - | - - - - - - - G5 | - - - - - - - D6 | - - - - - - E5 G5 | - - - - - - - - | - - - - - - - -'}]},
        {chords: 'Bb C Am7 Dm7 Bb C Gm7 A7', then: 'Dm7', lead: 'flute', comp: null, pad: true, padInst: 'strings',
          arp: {inst: 'steel', pattern: [0, null, 1, null, 2, null, 1, null, 3, null, 2, null, 1, null, 2, null], vel: 0.5, pan: 0.35},
          tune: 'F5 . . D5 F5 . G5 . | E5 . . C5 E5 . G5 . | A5 . G5 . E5 . C5 . | D5 . . . . . - - | ' +
            'F5 . . D5 F5 . Bb5 . | G5 . . E5 G5 . C6 . | Bb5 . A5 . G5 . F5 . | E5 . . . C#5 . A4 .'},
        {chords: 'Dm7 C F Gm7 Dm7 C Bb A7', then: 'Dm7', pad: true, padInst: 'strings', tune: CITY,
          voices: [{inst: 'flute', vel: 0.55, pan: -0.3, tune: '- A4 - D5 E5 - F5 - | - E5 C5 - Bb4 G4 - - | - C5 - F5 A5 - G5 F5 | D5 - D5 Bb4 - A4 Bb4 - | ' +
            '- A4 - D5 E5 - F5 - | - E5 C5 - Bb4 G4 - - | - D5 - F5 Bb5 - A5 F5 | E5 . . . C#5 . A4 .'}]}
      ]},
    // 03 Growth Run: E minor at a sprint. The original arpeggios run underneath on a marimba
    // while brass carries a broad tune over them, then the long climbing line on a flute.
    growth: {bpm: 150, gain: 0.9, wide: true, lead: 'brass', bass: 'drive', bassInst: 'slap', groove: SPRINT, crash: true,
      parts: [
        {chords: 'Em D C B Em D Am B', then: 'Em', tune: GROWTH, voices: [{inst: 'marimba', vel: 0.6, pan: 0.35, tune: RUNS}]},
        {chords: 'Em D C B Em D Am B', then: 'C', tune: GROWTH, pad: true, padInst: 'strings', voices: [{inst: 'marimba', vel: 0.6, pan: 0.35, tune: RUNS}]},
        {chords: 'C D Em Em C D Am B', then: 'Em', lead: 'flute', groove: LIFT, pad: true, padInst: 'strings',
          arp: {inst: 'steel', pattern: [0, null, 1, null, 2, null, 3, null, 2, null, 1, null, 2, null, 1, null], vel: 0.5, pan: 0.35},
          tune: 'G5 . . . E5 . G5 . | A5 . . . F#5 . D5 . | B5 . . . G5 . E5 . | B5 . A5 . G5 . F#5 . | ' +
            'E5 . . . G5 . C6 . | D6 . . . A5 . F#5 . | C6 . B5 . A5 . E5 . | F#5 . . . D#5 . B4 .'},
        {chords: 'Em D C B Em D Am B', then: 'Em', tune: GROWTH, pad: true, padInst: 'strings',
          voices: [{inst: 'marimba', vel: 0.6, pan: 0.35, tune: RUNS},
            {inst: 'flute', vel: 0.55, pan: -0.3, tune: 'G5 . . E5 . . B4 . | F#5 . . D5 . . A4 . | E5 . . C5 . . G4 C5 | D#5 . . . B4 . F#4 . | ' +
              'G5 . . E5 . . B4 . | F#5 . . D5 . . A4 . | A5 . . E5 . . C5 E5 | F#5 . . . D#5 . B4 .'}]}
      ]},
    // 04 Final Interview HQ: G major on a marimba over a ticking clock, nerves in the F sharp
    // minor. A flute takes the second half over strings, then both come back together.
    interview: {bpm: 100, gain: 1.12, wide: true, lead: 'marimba', bass: 'half', groove: CLOCK, crash: false,
      comp: {inst: 'piano', steps: [6, 14], vel: 0.6, pan: -0.3},
      parts: [
        {chords: 'G F#m Em G G F#m Em D', then: 'C', leadVel: 1.35, tune: WAITING},
        {chords: 'C D Bm Em C Am D D', then: 'G', lead: 'flute', pad: true, padInst: 'strings', tune: ROOM},
        {chords: 'G F#m Em G G F#m Em D', then: 'C', leadVel: 1.35, pad: true, padInst: 'strings', tune: WAITING,
          voices: [{inst: 'flute', vel: 0.5, pan: -0.3, tune: 'B5 . . . . . . . | A5 . . . . . . . | B5 . . . . . G5 . | G5 . . . . . . - | ' +
            'B5 . . . . . . . | C#6 . . . . . A5 . | G5 . . . . . . . | F#5 . . . A5 . D6 .'}]},
        {chords: 'C D Bm Em C Am D D', then: 'G', lead: 'flute', pad: true, padInst: 'strings', tune: ROOM,
          arp: {inst: 'steel', pattern: [0, null, null, null, 1, null, null, null, 2, null, null, null, 1, null, null, null], vel: 0.45, pan: 0.35},
          voices: [{inst: 'marimba', vel: 0.7, pan: 0.3, tune: 'C5 . . B4 G4 . G4 . | F#4 . . D4 F#4 . A4 . | D5 . . B4 B4 . F#4 . | B4 . . . . . E5 . | ' +
            'C5 . . B4 G4 . E5 . | E5 . . E5 C5 . A4 . | A4 . . . D5 . F#5 . | F#5 . . . D5 . A4 .'}]}
      ]},
    // World cleared: plays once and rings out over the results.
    clear: {bpm: 150, lead: 'pulse', groove: 'none', bass: 'held', pad: [1, 3], once: true, roll: true, chords: 'C G C',
      tune: 'G4 C5 E5 G5 C6 . G5 C6 | D6 . . B5 G5 . D6 . | C6 . . . . . . -'}
  };
  const WORLDS = ['alley', 'city', 'growth', 'interview'];

  // The game's effects, keeping the pitch and shape of the old beeps but with some body.
  const effects = ({tone, hiss, hz, pulse}) => ({
    jump(t) { tone(t, {wave: pulse, f0: 400, f1: 800, dur: 0.12, vol: 0.16}); },
    dash(t) {
      hiss(t, {type: 'bandpass', f0: 3000, f1: 600, q: 1, dur: 0.16, vol: 0.3});
      tone(t, {type: 'sawtooth', f0: 880, f1: 220, dur: 0.1, vol: 0.07, filter: 2500});
    },
    coin(t) {
      tone(t, {wave: pulse, f0: hz(83), dur: 0.06, vol: 0.12});
      tone(t + 0.06, {wave: pulse, f0: hz(88), dur: 0.22, vol: 0.12, send: 0.4});
    },
    skill(t) { [79, 84, 88, 91].forEach((n, i) => tone(t + i * 0.05, {type: 'triangle', f0: hz(n), dur: 0.25, vol: 0.18, send: 0.6})); },
    hurt(t) {
      tone(t, {type: 'sawtooth', f0: 330, f1: 90, dur: 0.22, vol: 0.14, filter: 1800});
      hiss(t, {f0: 2000, f1: 300, dur: 0.15, vol: 0.18});
    },
    checkpoint(t) { [72, 79, 84].forEach((n, i) => tone(t + i * 0.07, {type: 'triangle', f0: hz(n), dur: 0.3, vol: 0.2, send: 0.6})); },
    stomp(t) {
      tone(t, {type: 'square', f0: 300, f1: 90, dur: 0.1, vol: 0.14, filter: 2000});
      tone(t, {type: 'sine', f0: 160, f1: 50, dur: 0.12, vol: 0.4});
      hiss(t, {f0: 1500, f1: 300, dur: 0.08, vol: 0.2});
    },
    bossHit(t) {
      hiss(t, {f0: 4000, f1: 300, dur: 0.3, vol: 0.4});
      tone(t, {type: 'square', f0: 140, f1: 450, dur: 0.19, vol: 0.12, filter: 2500});
      tone(t, {type: 'sine', f0: 120, f1: 40, dur: 0.25, vol: 0.45});
    },
    spring(t) {
      tone(t, {wave: pulse, f0: 200, f1: 1000, dur: 0.22, vol: 0.15});
      tone(t, {type: 'sine', f0: 100, f1: 400, dur: 0.15, vol: 0.25});
    },
    bonus(t) { [76, 80, 83, 88].forEach((n, i) => tone(t + i * 0.06, {wave: pulse, f0: hz(n), dur: 0.2, vol: 0.11, send: 0.5})); },
    scene(t) {
      tone(t, {type: 'triangle', f0: 180, f1: 540, dur: 0.32, vol: 0.25, send: 0.5});
      hiss(t, {type: 'bandpass', f0: 800, f1: 3000, q: 0.8, dur: 0.3, vol: 0.15});
    },
    // The HQ lift: a two-note chime when it arrives, a low slide for its doors and a hum as it leaves.
    liftDing(t) {
      tone(t, {type: 'sine', f0: 1319, dur: 0.45, vol: 0.2, send: 0.5});
      tone(t + 0.17, {type: 'sine', f0: 1047, dur: 0.6, vol: 0.18, send: 0.5});
    },
    liftDoor(t) { tone(t, {type: 'triangle', f0: 150, f1: 110, dur: 0.3, vol: 0.2}); },
    liftMove(t) { tone(t, {type: 'triangle', f0: 70, f1: 140, dur: 0.8, vol: 0.22}); },
    // The intro's old telly: a clunk and a burst of snow between channels, a thump and a dying
    // whine as it goes off, and the doorbell.
    'intro-flip'(t) {
      tone(t, {type: 'square', f0: 110, f1: 60, dur: 0.05, vol: 0.3, filter: 900});
      // One hiss dies away from its first instant, so the snow between channels is nine of
      // them, each swelling a little later than the last, and it roars for the whole flip.
      for (let k = 0; k < 9; k++) hiss(t + 0.012, {type: 'highpass', f0: 600, dur: 0.262, attack: 0.004 + k * 0.03, vol: 0.36});
      tone(t + 0.25, {type: 'square', f0: 140, f1: 80, dur: 0.04, vol: 0.22, filter: 900});
    },
    'intro-off'(t) {
      tone(t, {type: 'sine', f0: 150, f1: 45, dur: 0.16, vol: 0.4});
      hiss(t, {f0: 3000, f1: 200, dur: 0.12, vol: 0.2});
      tone(t + 0.03, {type: 'sine', f0: 2400, f1: 180, dur: 0.5, vol: 0.07});
    },
    'intro-bell'(t) {
      tone(t, {type: 'sine', f0: hz(72), dur: 1, vol: 0.16, send: 0.5});
      tone(t, {type: 'triangle', f0: hz(84), dur: 0.25, vol: 0.05});
    }
  });

  H.gameSound = options => H.seaSound(Object.assign({}, options, {songs: SONGS, effects}));
  H.gameSound.worlds = WORLDS;
  H.gameSound.songs = SONGS;
})(globalThis.Hired);
