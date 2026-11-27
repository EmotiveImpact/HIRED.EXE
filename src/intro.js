// The opening of HIRE.EXE: three channels on an old telly, the telly goes off, dinner arrives
// at the door, and Pepper the assistant finds the job. The title screen lands when this ends.
// Every beat is a painted still. A beat may also name a short silent clip, which plays in
// place of the still on connections that can afford it; the still stays underneath.
(function (H) {
  'use strict';
  const FOLDER = 'assets/production/intro/';
  const BEATS = [
    {channel: 1, art: 'news', lines: [
      ['Newsreader', 'Breaking news. The companies that replaced their staff with AI are hiring them back.'],
      ['Newsreader', 'Applicants are asked to bring their old lanyard.']]},
    {channel: 2, art: 'tech', lines: [
      ['Presenter', 'Forty thousand new apps launched this morning.'],
      ['Presenter', 'Anyone can build one now. And, looking at them, anyone has.']]},
    {channel: 3, art: 'antiques', lines: [
      ['Expert', 'A cover letter. Written by a person.'],
      ['Owner', 'Is it worth anything?'],
      ['Expert', 'Not since about 2023.']]},
    {art: 'studio', lines: [
      ['Doorbell', 'Ding dong.'],
      ['Augustus', 'That’ll be dinner.']]},
    {art: 'door', lines: [
      ['Augustus', 'Pepper, we need a job. We’re too good not to be shipping.'],
      ['Pepper', 'Yes, sir.'],
      ['Driver', 'Sir? Who’s that?'],
      ['Augustus', 'That’s Pepper. My AI assistant.']]},
    {art: 'driver', lines: [
      ['Driver', 'What are you, a black Tony Stark or something?'],
      ['Augustus', 'Don’t hate the player. Play the game.']]},
    {art: 'found', lines: [
      ['Pepper', 'Oh. Found one.'],
      ['Augustus', 'That’s perfect.']]}
  ];
  // Channels with a clip: five silent seconds that open on the still's own frame.
  const CLIPS = ['news', 'tech', 'antiques'];
  const esc = text => String(text).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const still = art => FOLDER + art + '.webp';
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Clips are a treat, never a wait: none on data saver or a slow connection.
  const clipsWelcome = () => {
    const link = navigator.connection;
    return !calm() && !(link && (link.saveData || /(^|-)2g$/.test(link.effectiveType || '')));
  };
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
  function play(layer, {asset = path => path, sound = () => {}} = {}) {
    return new Promise(resolve => {
      let beat = -1, line = -1, timer = 0, over = false, typing = 0;
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
      // Clips start loading now, so each is ready by the time its channel comes round.
      const films = {};
      if (clipsWelcome()) CLIPS.forEach(art => {
        const film = document.createElement('video');
        film.className = 'intro-clip';
        film.muted = true; film.playsInline = true; film.preload = 'auto';
        film.setAttribute('playsinline', ''); film.setAttribute('aria-hidden', 'true');
        film.src = asset(FOLDER + art + '.mp4');
        films[art] = film;
      });
      let film = null;
      function stopFilm() {
        if (!film) return;
        film.oncanplay = null; film.pause(); film.remove(); film = null;
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
      function say() {
        const [name, text] = BEATS[beat].lines[line];
        who.textContent = name;
        clearInterval(typing);
        if (calm()) words.textContent = text;
        else {
          let shown = 0;
          words.textContent = '';
          typing = setInterval(() => {
            words.textContent = text.slice(0, shown += 2);
            if (shown >= text.length) clearInterval(typing);
          }, 28);
        }
        clearTimeout(timer);
        timer = setTimeout(next, reading(text));
      }
      function show() {
        const b = BEATS[beat];
        stage.classList.toggle('is-tv', Boolean(b.channel));
        stage.classList.remove('is-flip', 'is-off');
        pic.src = asset(still(b.art));
        osd.textContent = b.channel ? 'CH ' + b.channel : '';
        stopFilm();
        if (films[b.art]) {
          // The still shows at once; the clip takes over when it can play, and holds its last frame.
          film = films[b.art];
          const roll = () => {
            if (over || film !== films[b.art] || film.isConnected) return;
            film.currentTime = 0;
            pic.after(film);
            film.play().catch(stopFilm);
          };
          if (film.readyState >= 3) roll(); else film.oncanplay = roll;
        }
        line = 0;
        say();
      }
      function cut() {
        const from = BEATS[beat], to = BEATS[beat + 1];
        if (!to) { finish('done'); return; }
        clearTimeout(timer); clearInterval(typing);
        beat++;
        const flip = from?.channel && to.channel, off = from?.channel && !to.channel;
        if (calm() || !(flip || off)) { show(); return; }
        who.textContent = ''; words.textContent = '';
        if (flip) osd.textContent = 'CH ' + to.channel;
        stage.classList.add(flip ? 'is-flip' : 'is-off');
        sound(flip ? 'flip' : 'off');
        timer = setTimeout(show, flip ? 260 : 620);
      }
      function next() {
        if (over) return;
        if (stage.classList.contains('is-flip') || stage.classList.contains('is-off')) return;
        if (beat >= 0 && line < BEATS[beat].lines.length - 1) { line++; say(); }
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
      cut();
    });
  }
  H.intro = {play, beats: BEATS, still};
})(globalThis.Hired = globalThis.Hired || {});
