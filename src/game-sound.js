// HIRE.EXE's own music and effects, played on Sea Trial's 16-bit engine (src/sea-sound.js),
// so the platformer sounds as full and as loud as the submarine. One theme per world, each
// built on that world's original tune, and a short fanfare when a world is cleared.
// Songs use the engine's notation: one token per eighth note, '.' holds, '-' rests,
// and one chord per bar for the bass, arpeggios and pads. gain evens each theme out to
// Sea Trial's level music.
(function (H) {
  'use strict';
  // A funky one-bar drum pattern for Ship It City, and a ticking one for the interview.
  const FUNK = {k: [0, 3, 8, 11], s: [4, 12], h: [0, 2, 4, 6, 7, 8, 10, 12, 14, 15], fill: [10, 12, 13, 14, 15]};
  const CLOCK = {k: [0, 8], s: [4, 12], h: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], fill: [10, 12, 13, 14, 15]};
  // Application Alley's drums: a pop beat with an open hat before the bar line and a run round
  // the toms to end each part, and a four-on-the-floor lift for the middle with a snare build.
  const POP = {k: [0, 7, 8], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12], o: [14], fill: {s: [11], t: [[12, 52], [13, 50], [14, 47], [15, 43]]}};
  const LIFT = {k: [0, 4, 8, 12], s: [4, 12], h: [2, 6, 10, 14], fill: [8, 10, 12, 13, 14, 15]};
  // Its tune's first six bars, which three of its four parts share, and the marimba's answers
  // in the gaps of those six bars.
  const ALLEY = 'G5 . E5 G5 . C6 . B5 | A5 . . . E5 . A5 . | A5 . F5 A5 . C6 . A5 | G5 . . . D5 . G5 . | G5 . E5 G5 . C6 . B5 | A5 . . . C6 . E6 . | ';
  const ANSWER = '- - - - - - - - | - E5 C5 E5 - - - - | - - - - - - - - | - D5 B4 D5 - - - - | - - - - - - - - | - E5 C5 E5 - - - - | ';
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
    // 02 Ship It City: D minor funk on a brassy lead, built on the original off-beat riff.
    city: {bpm: 112, gain: 1.5, lead: 'saw', groove: FUNK, bass: 'octave', arp: true, pad: [8, 16],
      chords: 'Dm C F Gm Dm C F A Bb C Am Dm Bb C Gm A',
      tune: '- D5 - F5 G5 - A5 - | - G5 F5 - D5 C5 - - | - F5 - A5 C6 - Bb5 A5 | G5 - F5 D5 - C5 D5 - | ' +
        '- D5 - F5 G5 - A5 - | - G5 F5 - D5 C5 - - | - F5 - A5 C6 - D6 C6 | A5 . . . E5 . C#5 . | ' +
        'F5 . . D5 F5 . G5 . | E5 . . C5 E5 . G5 . | A5 . G5 . E5 . C5 . | D5 . . . . . - - | ' +
        'F5 . . D5 F5 . Bb5 . | G5 . . E5 G5 . C6 . | Bb5 . A5 . G5 . F5 . | E5 . . . C#5 . A4 .'},
    // 03 Growth Run: E minor at a sprint, the original arpeggios, then a long climbing line.
    growth: {bpm: 150, lead: 'pulse', groove: 'drive', bass: 'octave', arp: true, pad: [8, 16],
      chords: 'Em D C B Em D Am B C D Em Em C D Am B',
      tune: 'E5 G5 B5 E6 B5 G5 E5 G5 | D5 F#5 A5 D6 A5 F#5 D5 F#5 | C5 E5 G5 C6 E6 C6 G5 E5 | B4 D#5 F#5 B5 F#6 D#6 B5 - | ' +
        'E5 G5 B5 E6 B5 G5 E5 G5 | D5 F#5 A5 D6 A5 F#5 D5 F#5 | A4 C5 E5 A5 C6 A5 E5 C5 | B4 . F#5 . B5 . D#6 . | ' +
        'G5 . . . E5 . G5 . | A5 . . . F#5 . D5 . | B5 . . . G5 . E5 . | B5 . A5 . G5 . F#5 . | ' +
        'E5 . . . G5 . C6 . | D6 . . . A5 . F#5 . | C6 . B5 . A5 . E5 . | F#5 . . . D#5 . B4 .'},
    // 04 Final Interview HQ: G major on a marimba over a ticking clock, nerves in the F sharp minor.
    interview: {bpm: 100, gain: 1.4, lead: 'bell', groove: CLOCK, bass: 'octave', arp: false, pad: [0, 16],
      chords: 'G F#m Em G G F#m Em D C D Bm Em C Am D D',
      tune: 'G4 . . B4 D5 . A4 . | F#4 . A4 . C#5 . . . | G4 . B4 D5 F#5 . E5 . | D5 . B4 . G4 . . - | ' +
        'G4 . . B4 D5 . A4 . | F#4 . A4 . C#5 . E5 . | E5 . . . B4 . G4 . | A4 . . . . . - - | ' +
        'E5 . . D5 C5 . B4 . | A4 . . B4 C5 . D5 . | F#5 . . E5 D5 . B4 . | E5 . . . . . G5 . | ' +
        'E5 . . D5 C5 . G5 . | A5 . . G5 E5 . C5 . | D5 . . . F#5 . A5 . | A5 . . . F#5 . D5 .'},
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
    liftMove(t) { tone(t, {type: 'triangle', f0: 70, f1: 140, dur: 0.8, vol: 0.22}); }
  });

  H.gameSound = options => H.seaSound(Object.assign({}, options, {songs: SONGS, effects}));
  H.gameSound.worlds = WORLDS;
  H.gameSound.songs = SONGS;
})(globalThis.Hired);
