(function (H) {
  'use strict';
  // The Art Book: a Windows 3.1 picture viewer for the game's concept boards,
  // world paintings, in-game pictures and sprite sheets. It opens on a contents
  // page of thumbnails; each picture then fills the window with a caption under
  // it, and the << and >> buttons browse the book in order, as Windows Help's
  // browse buttons did.
  const wm = H.wm, esc = wm.esc;
  const asset = path => globalThis.HIRED_EMBEDDED_ASSETS?.[path] || path;
  const BOOK = 'assets/art-book/', THUMBS = BOOK + 'thumbs/';

  // The picture window icon: a framed landscape in the sixteen VGA colours.
  const ICON = H.linkIcon?.('Art Book') || '<span class="pm-glyph">A</span>';

  const SECTIONS = [
    { id: 'concept', title: 'Concept boards', note: 'Where the look was settled, before any of it could be played.' },
    { id: 'world', title: 'The four worlds', note: 'One painted backdrop for each stage of getting hired.' },
    { id: 'play', title: 'In the game', note: 'Taken from the running game, platforms, characters and all.' },
    { id: 'sprites', title: 'Sprites and tiles', note: 'The sheets the game cuts its characters, ground and props from.' }
  ];

  // Thumbnail names match tools/build-art-book.py. "sheet" marks transparent
  // pixel art, shown over a chequer at whole-number scales.
  const PICTURES = [
    { id: 'concept-alley', file: 'ALLEY.BMP', title: 'Application Alley', src: BOOK + 'concept-alley.webp', original: 'references/approved-gameplay-target.png',
      note: 'The first picture, and the one everything else had to live up to: warm brick, bright grass and a city worth running through. The game was still called HIRED.EXE. The D was let go later.' },
    { id: 'concept-augustus', file: 'AUGUSTUS.BMP', title: 'Augustus', src: BOOK + 'concept-augustus.webp', original: 'references/augustus-character-concepts.png',
      note: 'The applicant in every pose the game asks of him: idle, run, jump, fall, dash, crouch, hurt and one modest victory.' },
    { id: 'concept-environment', file: 'KIT.BMP', title: 'The construction kit', src: BOOK + 'concept-environment.webp', original: 'references/environment-concepts.png',
      note: 'Terrain, pipes, crates, shop fronts and trees, drawn as separate parts so that four worlds could be built from one family.' },
    { id: 'concept-enemies', file: 'ENEMIES.BMP', title: 'Enemies, pickups and icons', src: BOOK + 'concept-enemies.webp', original: 'references/enemies-hud-concepts.png',
      note: 'The opposition: a walking CV, an angry inbox, a paper plane and a recruitment bot. Below them, the ideas, skills and hearts worth collecting.' },

    { id: 'world-alley', file: 'WORLD1.BMP', title: '1. Application Alley', src: 'assets/production/backgrounds/application-alley.webp', original: 'assets/production/backgrounds/application-alley.png',
      note: 'A welcoming city of shops, green rooftops and paperwork with an attitude. Find your feet, then find a way through.' },
    { id: 'world-city', file: 'WORLD2.BMP', title: '2. Ship It City', src: 'assets/production/backgrounds/ship-it-city.webp', original: 'assets/production/backgrounds/ship-it-city.png',
      note: 'A city still being built. Workshops, cranes and lifts, for the part where an idea has to become something that works.' },
    { id: 'world-growth', file: 'WORLD3.BMP', title: '3. Growth Run', src: 'assets/production/backgrounds/growth-run.webp', original: 'assets/production/backgrounds/growth-run.png',
      note: 'Longer lanes, brighter signals and a sky full of charts. The work is made; now it has to be noticed.' },
    { id: 'world-hq', file: 'WORLD4.BMP', title: '4. Final Interview HQ', src: 'assets/production/backgrounds/interview-hq.webp', original: 'assets/production/backgrounds/interview-hq.png',
      note: 'The city opens into a glass headquarters with gardens on every terrace. Somewhere inside it there is a chair.' },

    { id: 'play-1', file: 'PLAY1.BMP', title: 'Application Alley, in play', src: BOOK + 'play-1.webp',
      note: 'The backdrop with the game laid over it: grass-topped brick to run on, ideas to collect and a walking CV waiting on the far side of the gap.' },
    { id: 'play-2', file: 'PLAY2.BMP', title: 'Ship It City, in play', src: BOOK + 'play-2.webp',
      note: 'Steel decks, hazard stripes and moving platforms, with a skill token overhead and a walking CV on patrol.' },
    { id: 'play-3', file: 'PLAY3.BMP', title: 'Growth Run, in play', src: BOOK + 'play-3.webp',
      note: 'Lit platforms over a long drop, and a skill token labelled Curiosity and learning.' },
    { id: 'play-4', file: 'PLAY4.BMP', title: 'Final Interview HQ, in play', src: BOOK + 'play-4.webp',
      note: 'Polished stone, a checkpoint terminal and Storytelling, one of the last skills to collect before the interview.' },

    { id: 'sprites-augustus', file: 'HERO.BMP', title: 'Augustus, 18 frames', src: 'assets/production/characters/hero-atlas.png', sheet: true,
      note: 'Every frame the game draws of him, in 80 by 96 cells with the feet lined up so that he does not slide about.' },
    { id: 'sprites-enemies', file: 'BADDIES.BMP', title: 'Enemies, bosses and pickups', src: 'assets/production/enemies/enemy-atlas.png', sheet: true,
      note: 'Three minions, four bosses, the pickups, the heart and the checkpoint terminal, on one sheet.' },
    { id: 'sprites-terrain', file: 'TERRAIN.BMP', title: 'Terrain', src: 'assets/production/environment/terrain-atlas.png', sheet: true,
      note: 'Sixteen tiles. Every platform in all four worlds is laid from these.' },
    { id: 'sprites-props', file: 'PROPS.BMP', title: 'Props', src: 'assets/production/environment/props-atlas.png', sheet: true,
      note: 'Sixteen props, the café, the trees, the ladder and the satellite dish among them.' },
    { id: 'sprites-furniture', file: 'OFFICE.BMP', title: 'Office furniture', src: 'assets/production/environment/furniture-atlas.png', sheet: true,
      note: 'Seventeen pieces of furniture for the rooms of Final Interview HQ, each placed in the level as an object of its own.' }
  ];
  const sectionOf = p => p.id.split('-')[0];

  let win = null, page = null, at = -1, actual = false, sizes = {};

  // --------------------------------------------------------------- contents
  function contentsHtml() {
    return '<div class="art-contents"><h2>Art Book</h2><p>The art behind HIRE.EXE, from the first concept to the sprites in the game. Choose a picture, or press &gt;&gt; to go through the book in order.</p>' +
      SECTIONS.map(s => '<h3>' + esc(s.title) + '</h3><p class="art-lede">' + esc(s.note) + '</p><div class="art-grid">' +
        PICTURES.map((p, i) => sectionOf(p) !== s.id ? '' :
          '<button type="button" class="art-thumb' + (p.sheet ? ' is-sheet' : '') + '" data-pic="' + i + '"><span class="art-thumb-frame"><img src="' + esc(asset(THUMBS + p.id + '.webp')) + '" alt="" loading="lazy" draggable="false"></span><span class="art-thumb-name">' + esc(p.title) + '</span></button>').join('') +
        '</div>').join('') + '</div>';
  }

  // ---------------------------------------------------------------- picture
  // The picture is sized by hand so that its frame hugs it: as large as fits,
  // sprite sheets at whole-number scales, paintings no more than doubled.
  function fit() {
    const stage = page?.querySelector('.art-stage'), img = stage?.querySelector('img');
    if (!img || !img.naturalWidth) return;
    const p = PICTURES[at];
    let scale = 1;
    if (!actual) {
      scale = Math.min((stage.clientWidth - 18) / img.naturalWidth, (stage.clientHeight - 18) / img.naturalHeight, p.sheet ? 4 : 2);
      if (p.sheet && scale >= 1) scale = Math.floor(scale);
      scale = Math.max(scale, 0.05);
    }
    img.style.width = Math.round(img.naturalWidth * scale) + 'px';
    img.style.height = Math.round(img.naturalHeight * scale) + 'px';
  }
  function status() {
    const p = PICTURES[at];
    win.querySelector('.art-file').textContent = p ? p.file : 'ARTBOOK';
    win.querySelector('.art-size').textContent = p ? (sizes[p.id] || '') : '';
    win.querySelector('.art-count').textContent = p ? 'Picture ' + (at + 1) + ' of ' + PICTURES.length : PICTURES.length + ' pictures';
  }
  function setTitle() {
    const t = 'Art Book' + (PICTURES[at] ? ' - ' + PICTURES[at].file : ''), rec = wm.get('artbook');
    win.querySelector('.w31-title').textContent = t;
    win.setAttribute('aria-label', t);
    if (rec) rec.opts.title = t;
  }

  // show(-1) is the contents page; show(n) is picture n.
  function show(index, focus = true) {
    index = Math.max(-1, Math.min(PICTURES.length - 1, index));
    // A new picture starts fitted to the window again.
    if (index !== at) actual = false;
    at = index;
    const p = PICTURES[at], caption = win.querySelector('.art-caption');
    page.classList.toggle('is-picture', !!p);
    if (!p) {
      actual = false;
      page.innerHTML = contentsHtml();
      caption.hidden = true;
    } else {
      page.innerHTML = '<div class="art-stage' + (p.sheet ? ' is-sheet' : '') + (actual ? ' is-actual' : '') + '"><img alt="' + esc(p.title + '. ' + p.note) + '" draggable="false" title="' + (actual ? 'Click to fit the window' : 'Click for actual size') + '"></div>';
      const img = page.querySelector('img');
      img.addEventListener('load', () => { sizes[p.id] = img.naturalWidth + ' x ' + img.naturalHeight; img.classList.add('is-loaded'); fit(); if (PICTURES[at] === p) status(); });
      img.src = asset(p.src);
      caption.hidden = false;
      caption.innerHTML = '<b>' + esc(p.title) + '</b><span>' + esc(p.note) + '</span>';
      // Have the next picture ready before it is asked for.
      const next = PICTURES[at + 1];
      if (next) new Image().src = asset(next.src);
    }
    page.scrollTop = 0; page.scrollLeft = 0;
    win.querySelector('[data-art="contents"]').disabled = !p;
    win.querySelector('[data-art="prev"]').disabled = at < 0;
    win.querySelector('[data-art="next"]').disabled = at >= PICTURES.length - 1;
    setTitle();
    status();
    if (p) H.track?.('Art Book picture', p.title);
    if (focus) page.focus({ preventScroll: true });
  }
  function setActual(on) {
    if (at < 0) return;
    actual = on;
    show(at);
  }
  function openOriginal() {
    const p = PICTURES[at];
    if (!p) return;
    // The offline edition carries the pictures the book shows; the full-size originals stay on the site.
    const embedded = globalThis.HIRED_EMBEDDED_ASSETS;
    const url = embedded ? embedded[p.original] || embedded[p.src] : p.original || p.src;
    if (url) window.open(url, '_blank', 'noopener');
  }

  function menus() {
    const picture = () => at >= 0;
    return [
      { label: '&File', id: 'art-file', items: () => [
        { label: '&Open Original', id: 'art-original', disabled: !picture() || !!globalThis.HIRED_EMBEDDED_ASSETS, action: openOriginal },
        '-',
        { label: 'E&xit', id: 'art-exit', action: () => wm.close('artbook') }
      ] },
      { label: '&View', id: 'art-view', items: () => [
        { label: '&Contents', id: 'art-view-contents', disabled: !picture(), action: () => show(-1) },
        { label: '&Previous Picture', key: 'Left', disabled: at < 0, action: () => show(at - 1) },
        { label: '&Next Picture', key: 'Right', disabled: at >= PICTURES.length - 1, action: () => show(at + 1) },
        '-',
        { label: '&Actual Size', id: 'art-actual', checked: actual, disabled: !picture(), action: () => setActual(!actual) }
      ] },
      { label: '&Help', id: 'art-help', items: () => [
        { label: '&About Art Book...', id: 'art-about', action: () => H.progman.about('Art Book', win) }
      ] }
    ];
  }

  // H.artBook() opens the book at its contents page; H.artBook('play-1') opens
  // it at that picture. Opening it again brings the running window forward.
  H.artBook = function (start) {
    const index = start ? PICTURES.findIndex(p => p.id === start) : -1;
    const existing = wm.get('artbook');
    if (existing && win?.isConnected) {
      if (existing.state === 'min') wm.restore('artbook'); else wm.activate('artbook');
      if (start) show(index);
      return win;
    }
    actual = false;
    win = wm.openApp({
      id: 'artbook', title: 'Art Book', className: 'art-window', resizable: true, maximisable: true, minSize: [280, 240],
      icon: ICON, iconId: 'artbook-icon', menu: menus(), focus: () => page?.focus({ preventScroll: true }),
      body: '<div class="help-buttons art-buttons" role="toolbar" aria-label="Art Book buttons"><button type="button" data-art="contents"><u>C</u>ontents</button><button type="button" data-art="prev" aria-label="Previous picture">&lt;&lt;</button><button type="button" data-art="next" aria-label="Next picture">&gt;&gt;</button></div>' +
        '<div class="art-page w31-scroll" tabindex="0"></div><p class="art-caption" hidden></p>' +
        '<div class="art-status"><span class="art-file"></span><span class="art-size"></span><span class="art-count"></span></div>'
    });
    page = win.querySelector('.art-page');
    win.querySelector('.art-buttons').addEventListener('click', e => {
      const a = e.target.closest('button')?.dataset.art;
      if (a === 'contents') show(-1);
      else if (a === 'prev') show(at - 1);
      else if (a === 'next') show(at + 1);
    });
    page.addEventListener('click', e => {
      const thumb = e.target.closest('.art-thumb');
      if (thumb) show(+thumb.dataset.pic);
      else if (e.target.closest('.art-stage img')) setActual(!actual);
    });
    win.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('.w31-menubar')) return;
      // The contents page keeps its keys for scrolling, and so does a picture at actual size.
      if (at < 0) return;
      const key = e.key, arrows = !actual;
      if (key === 'PageDown' || (arrows && key === 'ArrowRight')) { if (at < PICTURES.length - 1) show(at + 1); }
      else if (key === 'PageUp' || (arrows && key === 'ArrowLeft')) show(at - 1);
      else if (key === 'Escape' || key.toLowerCase() === 'c' || (arrows && key === 'Home')) show(-1);
      else return;
      e.preventDefault();
    });
    // Keep the picture fitted as the window is sized or maximised.
    if (globalThis.ResizeObserver) new ResizeObserver(() => { if (at >= 0 && !actual) fit(); }).observe(page);
    show(index, true);
    return win;
  };
  H.artBook.icon = ICON;
  H.artBook.pictures = PICTURES;
})(globalThis.Hired);
