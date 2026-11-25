// The desktop's system sounds: the four recordings that came with Windows 3.1 (TADA, CHIMES,
// CHORD and DING, in assets/sounds/windows31; they are Microsoft's), given to the same events
// as the [sounds] section of a 1992 WIN.INI. They play through the game's sound engine
// (src/sea-sound.js), so the Sound switch silences them and they sit level with the music.
(function (H) {
  'use strict';
  const FOLDER = 'assets/sounds/windows31/';
  // level evens the recordings out against the game's music.
  const TADA = {file: 'tada.wav', level: 0.55}, CHIMES = {file: 'chimes.wav', level: 0.65};
  const CHORD = {file: 'chord.wav', level: 0.8}, DING = {file: 'ding.wav', level: 0.85};
  const EVENTS = {
    SystemStart: TADA, SystemExit: CHIMES, SystemDefault: DING,
    SystemAsterisk: CHORD, SystemExclamation: CHORD, SystemHand: CHORD, SystemQuestion: CHORD,
    // Not in WIN.INI: Hire Augustus Setup finishing, which borrows the fanfare.
    SetupComplete: TADA
  };

  H.winSound = function (embedded = globalThis.HIRED_EMBEDDED_SOUNDS) {
    const files = {}, decoded = {};
    let current = null, turn = 0;
    const url = file => embedded?.[FOLDER + file] || FOLDER + file;
    // The bytes of a file, fetched once (or unpacked, in the single-file edition); null if they cannot be had.
    function bytes(file) {
      return files[file] ||= (async () => {
        const src = url(file);
        if (src.startsWith('data:')) return Uint8Array.from(atob(src.slice(src.indexOf(',') + 1)), c => c.charCodeAt(0)).buffer;
        // A page opened straight from a folder may not read files, so it does not try.
        if (globalThis.location?.protocol === 'file:') return null;
        const reply = await fetch(src);
        if (!reply.ok) throw new Error(reply.status);
        return reply.arrayBuffer();
      })().catch(() => null);
    }
    return {
      events: EVENTS,
      // Fetch the recordings ahead of time, so the first sound is not late.
      preload() { for (const file of new Set(Object.values(EVENTS).map(e => e.file))) bytes(file); },
      // Play an event's sound on the engine. As in Windows, a new sound cuts off the one before.
      async play(event, engine) {
        const sound = EVENTS[event];
        if (!sound || !engine) return;
        const mine = ++turn;
        const data = await bytes(sound.file);
        if (mine !== turn) return;
        try { current?.stop(); } catch (_) { /* It had finished. */ }
        current = null;
        if (!data) {
          // The page could not read the file itself, but it can still have the browser play it.
          engine.log.push('win:' + event);
          if (engine.muted) return;
          const audio = new Audio(url(sound.file));
          audio.volume = Math.min(1, sound.level * 0.5);
          audio.play().catch(() => {});
          current = {stop: () => audio.pause()};
          return;
        }
        const buffer = await (decoded[sound.file] ||= engine.decode(data.slice(0)).catch(() => null));
        if (buffer && mine === turn) current = engine.sample(buffer, sound.level, 'win:' + event);
      }
    };
  };
})(globalThis.Hired);
