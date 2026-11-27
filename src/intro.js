// The opening of HIRE.EXE: three channels on an old telly, the telly goes off, dinner arrives
// at the door, and Pepper the assistant finds the job. The title screen lands when this ends.
// Every shot is a painted still with a short clip that starts on the still's own frame, in
// which the characters say their lines. The voices are a separate sound file played through
// the game's own sound, so the mute button covers them. Each line is also a subtitle.
// Without the clips (data saver, a slow connection, reduced motion, the offline file) the
// stills stand in and the lines are typed out at reading pace.
(function (H) {
  'use strict';
  const FOLDER = 'assets/production/intro/';
  // A line is [speaker, words, second of the clip at which it is spoken]. A shot with an `end`
  // is left at that second: a channel as someone hopping channels would leave it, the driver
  // before Augustus finishes his sentence, and the last shot as he finishes it.
  const BEATS = [
    {channel: 1, art: 'news', end: 9.8, lines: [
      ['Newsreader', 'Breaking news. The companies that replaced their staff with AI are hiring them back.', 0],
      ['Newsreader', 'Applicants are asked to bring their old lanyard.', 7.1]]},
    {channel: 2, art: 'tech', end: 9.5, lines: [
      ['Presenter', 'Forty thousand new apps launched this morning.', 1.4],
      ['Presenter', 'Anyone can build one now. And, looking at them, anyone has.', 5]]},
    {channel: 3, art: 'antiques', end: 9.7, lines: [
      ['Expert', 'A cover letter. Written by a person.', 1.2],
      ['Owner', 'Is it worth anything?', 5.5],
      ['Expert', 'Not since about 2023.', 7.4]]},
    {art: 'studio', lines: [
      ['Augustus', 'Pepper. We need a job. We’re too good not to be shipping.', 2.3],
      ['Pepper', 'On it.', 7],
      ['Doorbell', 'Ding dong.', 8.5]]},
    {art: 'door', lines: [
      ['Augustus', 'Pepper! Nothing with a ping-pong table.', 0],
      ['Pepper', 'Yes, sir.', 5.05],
      ['Driver', 'Sir? Who’s that?', 6.4],
      ['Augustus', 'That’s Pepper. My AI assistant.', 9.05]]},
    {art: 'driver', end: 3.95, lines: [
      ['Driver', 'What are you, a black Tony Stark or something?', 0],
      ['Augustus', 'Don’t hate the player…', 2.75]]},
    {art: 'play', end: 9.6, lines: [
      ['Pepper', 'Sir. Found one.', 0],
      ['Pepper', 'Startup studio wants a builder who ships with AI. And has taste.', 2.6],
      ['Augustus', '…play the game.', 8.5]]}
  ];
  const still = art => FOLDER + art + '.webp';
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Clips are a treat, never a wait: none on data saver or a slow connection.
  const clipsWelcome = () => {
    const link = navigator.connection;
    return !calm() && !(link && (link.saveData || /(^|-)2g$/.test(link.effectiveType || '')));
  };
  // How long a shot may wait for its clip before the still and typed lines take over.
  const PATIENCE = 2500;
  let snow;
  function noise() {
    if (snow) return snow;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 96;
    const ctx = canvas.getContext('2d'), image = ctx.createImageData(96, 96);
    for (let i = 0; i < image.data.length; i += 4) {
      const v = Math.random() * 255 | 0;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return snow = canvas.toDataURL('image/png');
  }
  const reading = line => Math.max(1700, 900 + line.length * 48);

  // Plays the intro in `layer` and resolves with 'done' or 'skipped'.
  // voice: {decode(bytes) -> Promise of a sound, play(sound) -> something with stop(), or null}.
  // clips: false where the clips and voices do not exist, as in the single offline file.
  function play(layer, {asset = path => path, sound = () => {}, voice = null, clips = true} = {}) {
    return new Promise(resolve => {
      let beat = -1, line = -1, timer = 0, over = false, typing = 0, watch = 0;
      layer.className = 'overlay intro-overlay';
      layer.setAttribute('aria-label', 'Introduction');
      layer.innerHTML = `<section class="intro">
        <div class="intro-stage"><div class="intro-set">
          <div class="intro-screen">
            <img class="intro-pic" alt="">
            <span class="intro-snow" aria-hidden="true"></span>
            <span class="intro-osd" aria-hidden="true"></span>
          </div>
        </div></div>
        <div class="intro-words" aria-live="polite"><strong></strong><p></p></div>
        <button class="comic-skip intro-skip" id="intro-skip">Skip intro</button>
      </section>`;
      const q = selector => layer.querySelector(selector);
      const stage = q('.intro-stage'), pic = q('.intro-pic');
      const who = q('.intro-words strong'), words = q('.intro-words p'), osd = q('.intro-osd');
      q('.intro-snow').style.backgroundImage = `url(${noise()})`;
      BEATS.forEach(b => { new Image().src = asset(still(b.art)); });

      // A shot's clip and its voices are fetched while the shot before it plays.
      const films = {}, voices = {}, filmed = clips && clipsWelcome();
      function fetchShot(b) {
        if (!filmed || !b || films[b.art]) return;
        const film = document.createElement('video');
        film.className = 'intro-clip';
        film.muted = true; film.playsInline = true; film.preload = 'auto';
        film.setAttribute('playsinline', ''); film.setAttribute('aria-hidden', 'true');
        film.src = asset(FOLDER + b.art + '.mp4');
        films[b.art] = film;
        voices[b.art] = voice
          ? fetch(asset(FOLDER + b.art + '.mp3')).then(reply => reply.ok ? reply.arrayBuffer() : Promise.reject())
            .then(bytes => voice.decode(bytes)).catch(() => null)
          : Promise.resolve(null);
      }
      let film = null, speech = null;
      function stopFilm() {
        cancelAnimationFrame(watch);
        try { speech?.stop(); } catch (_) {}
        speech = null;
        if (!film) return;
        film.oncanplay = film.onplaying = film.onended = film.onerror = null;
        film.pause(); film.remove(); film = null;
      }

      function finish(how) {
        if (over) return;
        over = true;
        clearTimeout(timer); clearInterval(typing);
        document.removeEventListener('keydown', onKey, true);
        stopFilm();
        Object.values(films).forEach(f => { f.removeAttribute('src'); f.load(); });
        resolve(how);
      }
      function caption(name, text) {
        who.textContent = name;
        words.textContent = text;
      }
      // Typed lines at reading pace, for a shot with no clip.
      function say() {
        const [name, text] = BEATS[beat].lines[line];
        clearInterval(typing);
        if (name === 'Doorbell') sound('bell');
        if (calm()) caption(name, text);
        else {
          let shown = 0;
          caption(name, '');
          typing = setInterval(() => {
            words.textContent = text.slice(0, shown += 2);
            if (shown >= text.length) clearInterval(typing);
          }, 28);
        }
        clearTimeout(timer);
        timer = setTimeout(next, reading(text));
      }
      // The clip plays once, the voices start with it, and each line shows as it is spoken.
      function roll(b, heard) {
        const mine = film;
        clearTimeout(timer);
        mine.currentTime = 0;
        pic.after(mine);
        mine.onplaying = () => {
          mine.onplaying = null;
          if (heard && voice) speech = voice.play(heard);
        };
        mine.onended = () => { clearTimeout(timer); timer = setTimeout(cut, b.channel ? 0 : 350); };
        const follow = () => {
          if (over || film !== mine) return;
          const at = mine.currentTime;
          if (b.end && at >= b.end) { cut(); return; }
          let now = 0;
          b.lines.forEach((l, i) => { if (at >= l[2] - 0.12) now = i; });
          if (at < b.lines[0][2] - 0.12) now = -1;
          if (now !== line) {
            line = now;
            if (now < 0) caption('', '');
            else { caption(b.lines[now][0], b.lines[now][1]); if (b.lines[now][0] === 'Doorbell') sound('bell'); }
          }
          watch = requestAnimationFrame(follow);
        };
        line = -2; follow();
        mine.play().catch(() => { if (film === mine) { stopFilm(); line = 0; say(); } });
      }
      function show() {
        const b = BEATS[beat];
        stage.classList.toggle('is-tv', Boolean(b.channel));
        stage.classList.remove('is-flip', 'is-off');
        pic.src = asset(still(b.art));
        osd.textContent = b.channel ? 'CH ' + b.channel : '';
        stopFilm();
        fetchShot(BEATS[beat + 1]);
        film = films[b.art] || null;
        if (!film) { line = 0; say(); return; }
        // The still shows at once. The clip takes over as soon as it and its voices are ready.
        const mine = film;
        let waiting = true;
        const giveUp = () => {
          if (!waiting || over || film !== mine) return;
          waiting = false; stopFilm(); line = 0; say();
        };
        const ready = () => {
          mine.oncanplay = null;
          voices[b.art].then(heard => {
            if (!waiting || over || film !== mine) return;
            waiting = false; roll(b, heard);
          });
        };
        caption('', ''); line = -1;
        clearTimeout(timer);
        timer = setTimeout(giveUp, PATIENCE);
        mine.onerror = giveUp;
        if (mine.error) giveUp();
        else if (mine.readyState >= 3) ready();
        else mine.oncanplay = ready;
      }
      function cut() {
        if (over) return;
        const from = BEATS[beat], to = BEATS[beat + 1];
        if (!to) { finish('done'); return; }
        clearTimeout(timer); clearInterval(typing);
        beat++;
        const flip = from?.channel && to.channel, off = from?.channel && !to.channel;
        if (calm() || !(flip || off)) { show(); return; }
        stopFilm();
        caption('', '');
        if (flip) osd.textContent = 'CH ' + to.channel;
        stage.classList.add(flip ? 'is-flip' : 'is-off');
        sound(flip ? 'flip' : 'off');
        timer = setTimeout(show, flip ? 260 : 620);
      }
      // Any key or a tap moves on: to the next shot while a clip plays, else to the next line.
      function next() {
        if (over) return;
        if (stage.classList.contains('is-flip') || stage.classList.contains('is-off')) return;
        if (!film && beat >= 0 && line < BEATS[beat].lines.length - 1) { line++; say(); }
        else cut();
      }
      function onKey(e) {
        if (e.metaKey || e.ctrlKey || e.altKey || e.key === 'Tab') return;
        e.preventDefault(); e.stopPropagation();
        if (e.key === 'Escape') finish('skipped');
        else if (!e.repeat) next();
      }
      document.addEventListener('keydown', onKey, true);
      q('.intro').addEventListener('pointerdown', e => { if (!e.target.closest('#intro-skip')) next(); });
      q('#intro-skip').onclick = () => finish('skipped');
      fetchShot(BEATS[0]);
      cut();
    });
  }
  H.intro = {play, beats: BEATS, still};
})(globalThis.Hired = globalThis.Hired || {});
