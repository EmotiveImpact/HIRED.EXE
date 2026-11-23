// Jargon: the desktop's time sink. Every job advert is mostly buzzwords; the
// player clears them in matching groups. Bigger groups score more, the words
// above fall into the gaps and empty columns close up. One window, one board,
// a best score for each level, kept in this browser.
(function (H) {
  'use strict';
  const wm = H.wm, esc = wm.esc;
  const COLS = 12, ROWS = 9, CLEAR_BONUS = 1000;
  const STORE = 'hired-exe:jargon:v1';
  // Each buzzword has its own shape as well as its own colour, so colour is never the only clue.
  const KINDS = [
    {id: 'star', word: 'Rockstar', lines: [
      '‘Rockstar’ removed. The role is still data entry.',
      '‘Rockstar’ removed. It replaced ‘ninja’, which was worse.']},
    {id: 'heart', word: 'We’re like a family', lines: [
      '‘We’re like a family’ removed. You will still be expected at Christmas.',
      '‘We’re like a family’ removed. Leaving will still be awkward.']},
    {id: 'coin', word: 'Competitive salary', lines: [
      '‘Competitive salary’ removed. Competitive with what, nobody said.',
      '‘Competitive salary’ removed. Still no number.']},
    {id: 'hat', word: 'Wear many hats', lines: [
      '‘Wear many hats’ removed. Three jobs, one salary.',
      '‘Wear many hats’ removed. Hats not provided.']},
    {id: 'bolt', word: 'Fast-paced', lines: [
      '‘Fast-paced’ removed. It meant short-staffed.',
      '‘Fast-paced’ removed. Lunch is still at your desk.']}
  ];
  const LEVELS = [
    {id: 'junior', label: '&Junior', kinds: 3},
    {id: 'mid', label: '&Mid-level', kinds: 4},
    {id: 'senior', label: '&Senior', kinds: 5}
  ];
  // 16 x 16 pictures in the Windows 3.1 sixteen-colour palette.
  const ART = {
    star: '<polygon points="8,0.8 10.2,5.8 15.4,6 11.3,9.4 12.8,14.8 8,11.7 3.2,14.8 4.7,9.4 0.6,6 5.8,5.8" fill="#ffff00" stroke="#000"/>',
    heart: '<path d="M8 14.6 1.9 8.4C.3 6.8.4 3.9 2.4 2.7 4.4 1.5 6.8 2.4 8 4.4 9.2 2.4 11.6 1.5 13.6 2.7 15.6 3.9 15.7 6.8 14.1 8.4Z" fill="#ff0000" stroke="#000"/>',
    coin: '<circle cx="8" cy="8" r="7" fill="#008000" stroke="#000"/><path d="M10.6 5.2C10.3 4.1 9.5 3.6 8.5 3.6 7 3.6 6.2 4.6 6.2 6V11.4M4.7 8H9.3M4.6 11.6H11.4" fill="none" stroke="#fff" stroke-width="1.6"/>',
    hat: '<rect x="4.5" y="1.5" width="7" height="10" fill="#0000ff" stroke="#000"/><rect x="5" y="8" width="6" height="2" fill="#000080"/><rect x="0.5" y="11.5" width="15" height="3" fill="#0000ff" stroke="#000"/>',
    bolt: '<polygon points="9.6,0.5 2.4,9 7,9 5.4,15.5 13.6,6 9,6 11.2,0.5" fill="#00ffff" stroke="#000"/>'
  };
  const SYMBOLS = '<svg class="jg-defs" aria-hidden="true" focusable="false">' +
    KINDS.map(k => '<symbol id="jg-' + k.id + '" viewBox="0 0 16 16">' + ART[k.id] + '</symbol>').join('') + '</svg>';
  const picture = id => '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><use href="#jg-' + id + '"></use></svg>';
  // The Program Manager icon draws its own pictures, as it sits outside the game window.
  H.jargonIcon = '<span class="pm-glyph pm-glyph-jargon" aria-hidden="true"><svg viewBox="0 0 32 32">' +
    '<rect x="0.5" y="0.5" width="31" height="31" fill="#fff" stroke="#000"/>' +
    [['star', 1, 1], ['heart', 16, 1], ['coin', 1, 16], ['hat', 16, 16]].map(([id, x, y]) =>
      '<g transform="translate(' + x + ' ' + y + ')"><rect width="15" height="15" fill="#c0c0c0"/><path d="M0 15V0H15" fill="none" stroke="#fff"/><path d="M15 0V15H0" fill="none" stroke="#808080"/><g transform="translate(2 2) scale(.69)">' + ART[id] + '</g></g>').join('') +
    '</svg></span>';

  function load() {
    try { const data = JSON.parse(localStorage.getItem(STORE) || 'null'); return data && typeof data === 'object' ? data : {}; } catch (_) { return {}; }
  }
  function store(data) {
    try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (_) { /* Storage can be off. Playing still works. */ }
  }
  const points = n => (n < 2 ? 0 : (n - 2) * (n - 2));
  const fmt = n => n.toLocaleString('en-GB');
  const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

  H.jargon = function ({icon = H.jargonIcon, iconId = 'jargon-icon'} = {}) {
    // Opening Jargon again brings back the game in progress rather than dealing a new one.
    const running = wm.get('jargon');
    if (running?.el.isConnected) {
      if (running.state === 'min') wm.restore('jargon'); else wm.activate('jargon');
      return running.el;
    }
    const saved = load();
    let level = LEVELS.find(l => l.id === saved.level) || LEVELS[1];
    const best = {};
    for (const l of LEVELS) best[l.id] = 0;
    let cols = [], score = 0, prev = null, over = false, cursor = {c: 0, r: ROWS - 1}, said = {};

    // Another tab may have set a record since this one opened, so read the stored bests before writing.
    function sync() {
      const stored = load().best;
      for (const l of LEVELS) {
        const n = stored?.[l.id];
        if (Number.isFinite(n) && n > best[l.id]) best[l.id] = Math.floor(n);
      }
    }
    sync();
    const remember = () => { sync(); store({level: level.id, best}); };
    const win = wm.openApp({
      id: 'jargon', title: 'Jargon', icon, iconId, className: 'jargon-window',
      menu: [
        {label: '&Game', id: 'jg-game', items: () => [
          {label: '&New Advert', key: 'F2', id: 'jg-new', action: deal},
          '-',
          {label: '&Undo', key: 'Ctrl+Z', id: 'jg-undo', disabled: !prev, action: undo},
          '-',
          ...LEVELS.map(l => ({label: l.label, checked: l === level, id: 'jg-level-' + l.id, action: () => { level = l; remember(); deal(); }})),
          '-',
          {label: 'E&xit', id: 'jg-exit', action: () => wm.close('jargon')}
        ]},
        {label: '&Help', id: 'jg-help', items: () => [
          {label: '&How to Play', id: 'jg-how', action: howTo},
          '-',
          {label: '&About Jargon...', id: 'jg-about', action: about}
        ]}
      ],
      body: '<div class="jg">' + SYMBOLS +
        '<div class="jg-bar"><span class="jg-field jg-score"></span><span class="jg-field jg-pick"></span><span class="jg-field jg-best"></span></div>' +
        '<div class="jg-board" role="group" aria-label="Job advert. Remove groups of two or more matching buzzwords."></div>' +
        '<p class="jg-status" role="status"></p></div>'
    });
    const board = win.querySelector('.jg-board'), statusEl = win.querySelector('.jg-status');
    const scoreEl = win.querySelector('.jg-score'), bestEl = win.querySelector('.jg-best'), pickEl = win.querySelector('.jg-pick');
    const say = text => { statusEl.textContent = text; };
    const tile = (c, r) => board.querySelector('[data-c="' + c + '"][data-r="' + r + '"]');

    function deal() {
      cols = Array.from({length: COLS}, () => Array.from({length: ROWS}, () => Math.floor(Math.random() * level.kinds)));
      score = 0; prev = null; over = false; said = {}; cursor = {c: 0, r: ROWS - 1};
      render();
      say('New advert loaded. It is mostly jargon.');
    }

    // Every tile joined to (c, r) by an edge and showing the same buzzword.
    function groupAt(c, r) {
      const kind = cols[c]?.[r];
      if (kind === undefined) return [];
      const seen = new Set([c + ',' + r]), found = [[c, r]], todo = [[c, r]];
      while (todo.length) {
        const [x, y] = todo.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, key = nx + ',' + ny;
          if (seen.has(key) || cols[nx]?.[ny] !== kind) continue;
          seen.add(key); found.push([nx, ny]); todo.push([nx, ny]);
        }
      }
      return found;
    }
    function movesLeft() {
      return cols.some((col, c) => col.some((kind, r) => col[r + 1] === kind || cols[c + 1]?.[r] === kind));
    }
    function line(kind) {
      said[kind.id] = (said[kind.id] || 0) + 1;
      return kind.lines[(said[kind.id] - 1) % kind.lines.length];
    }

    function press(c, r) {
      if (over) { say('Nothing left to match. Choose Game, New Advert for another.'); return; }
      const group = groupAt(c, r);
      if (!group.length) return;
      const kind = KINDS[cols[c][r]];
      if (group.length < 2) { say('One ‘' + kind.word + '’ on its own. It needs a match.'); return; }
      prev = {cols: cols.map(col => col.slice()), score, cursor: {...cursor}};
      const gone = new Set(group.map(([x, y]) => x + ',' + y));
      cols = cols.map((col, x) => col.filter((_, y) => !gone.has(x + ',' + y))).filter(col => col.length);
      score += points(group.length);
      say(group.length >= 10 ? group.length + ' removed in one go. That was the whole ‘About us’ section.' : line(kind));
      render();
      if (!movesLeft()) finish();
    }
    function undo() {
      if (!prev) return;
      ({cols, score, cursor} = prev);
      prev = null; over = false;
      render();
      say('Undone. Jargon always finds its way back.');
    }
    function finish() {
      over = true;
      const left = cols.reduce((n, col) => n + col.length, 0);
      if (!left) score += CLEAR_BONUS;
      sync();
      const record = score > best[level.id];
      if (record) { best[level.id] = score; remember(); }
      render();
      const verdict = !left
        ? 'Every buzzword removed. The advert now simply states the salary. This has never happened before.<br>Bonus: ' + fmt(CLEAR_BONUS) + ' points.'
        : left <= 5
          ? 'Only ' + plural(left, 'buzzword') + ' left. That is practically plain English.'
          : 'No more matching jargon. ' + left + ' buzzwords are left, which is still shorter than most adverts.';
      say(left ? 'No more matches. Choose Game, New Advert for another.' : 'Advert cleared. Choose Game, New Advert for another.');
      wm.message({title: 'Jargon', icon: 'info', owner: win, buttons: ['&New Advert', 'OK'],
        text: verdict + '<br><br>Score: ' + fmt(score) + (record ? '. A new best.' : '')})
        .then(button => { if (button === 'new advert') deal(); });
    }

    function render() {
      const focused = board.contains(document.activeElement);
      let html = '';
      for (let r = ROWS - 1; r >= 0; r--) {
        for (let c = 0; c < COLS; c++) {
          const k = cols[c]?.[r];
          if (k === undefined) { html += '<span class="jg-gap"></span>'; continue; }
          const kind = KINDS[k];
          html += '<button type="button" class="jg-tile jg-' + kind.id + '" data-c="' + c + '" data-r="' + r + '" tabindex="-1" aria-label="' + esc(kind.word) + ', column ' + (c + 1) + ', row ' + (ROWS - r) + '">' + picture(kind.id) + '</button>';
        }
      }
      board.innerHTML = html;
      scoreEl.textContent = 'Score: ' + fmt(score);
      bestEl.textContent = 'Best: ' + fmt(best[level.id]);
      pickEl.textContent = '';
      place();
      const at = tile(cursor.c, cursor.r);
      if (at) { at.tabIndex = 0; if (focused) at.focus({preventScroll: true}); }
      else if (focused) win.focus?.({preventScroll: true});
    }
    // Keep the keyboard cursor on a tile once the words around it have moved.
    function place() {
      if (!cols.length) { cursor = {c: 0, r: 0}; return; }
      const c = Math.min(cursor.c, cols.length - 1);
      cursor = {c, r: Math.min(cursor.r, cols[c].length - 1)};
    }
    function light(c, r) {
      board.querySelectorAll('.is-lit').forEach(el => el.classList.remove('is-lit'));
      const group = c === null || over ? [] : groupAt(c, r);
      if (!group.length) { pickEl.textContent = ''; return; }
      const kind = KINDS[cols[c][r]];
      if (group.length > 1) for (const [x, y] of group) tile(x, y)?.classList.add('is-lit');
      pickEl.textContent = group.length > 1 ? group.length + ' × ' + kind.word + ': ' + plural(points(group.length), 'point') : kind.word + ': needs a match';
    }
    function step(dx, dy) {
      let {c, r} = cursor;
      for (;;) {
        c += dx; r += dy;
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
        if (cols[c]?.[r] !== undefined) break;
        if (dy) return; // Nothing floats: above an empty cell there is only more empty cells.
      }
      const from = tile(cursor.c, cursor.r);
      if (from) from.tabIndex = -1;
      cursor = {c, r};
      const to = tile(c, r);
      to.tabIndex = 0; to.focus({preventScroll: true});
      light(c, r);
    }

    board.addEventListener('click', e => {
      const t = e.target.closest('.jg-tile');
      if (!t) return;
      const c = Number(t.dataset.c), r = Number(t.dataset.r);
      board.querySelector('[tabindex="0"]')?.setAttribute('tabindex', '-1');
      cursor = {c, r}; t.tabIndex = 0;
      press(c, r);
      const now = tile(cursor.c, cursor.r);
      if (now && e.pointerType !== 'touch' && now.matches(':hover')) light(cursor.c, cursor.r);
    });
    // A mouse previews the group under it; a finger previews it only while pressing.
    const preview = e => {
      const t = e.target.closest('.jg-tile');
      if (t) light(Number(t.dataset.c), Number(t.dataset.r));
    };
    board.addEventListener('pointerover', e => { if (e.pointerType !== 'touch') preview(e); });
    board.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') preview(e); });
    board.addEventListener('pointerleave', () => { if (!board.contains(document.activeElement)) light(null); });
    board.addEventListener('focusin', e => {
      const t = e.target.closest('.jg-tile');
      if (t) light(Number(t.dataset.c), Number(t.dataset.r));
    });
    board.addEventListener('focusout', e => { if (!board.contains(e.relatedTarget)) light(null); });
    board.addEventListener('keydown', e => {
      const move = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1]}[e.key];
      if (!move) return;
      e.preventDefault();
      step(...move);
    });
    board.addEventListener('contextmenu', e => e.preventDefault());
    win.addEventListener('keydown', e => {
      if (e.target.closest('.w31-caption,.w31-menubar')) return;
      if (e.key === 'F2') { e.preventDefault(); deal(); }
      else if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    });

    function howTo() {
      wm.dialog({
        title: 'How to Play Jargon', owner: win, className: 'w31-about jg-help',
        body: '<p>Job adverts are mostly jargon. Remove it.</p>' +
          '<p class="jg-help-text">Click or tap a group of two or more matching buzzwords that touch along an edge. The words above drop into the gap and empty columns close up.</p>' +
          '<p class="jg-help-text">Bigger groups score more: a group of <i>n</i> scores (<i>n</i> − 2) × (<i>n</i> − 2), so a pair scores nothing. Clear the whole advert for a ' + fmt(CLEAR_BONUS) + ' point bonus.</p>' +
          '<ul class="jg-legend">' + KINDS.map(k => '<li>' + picture(k.id) + esc(k.word) + '</li>').join('') + '</ul>' +
          '<p class="jg-help-text">Junior uses the first three buzzwords, Mid-level four and Senior all five. Keys: arrows to move, Enter to remove, F2 for a new advert, Ctrl+Z to undo.</p>'
      });
    }
    function about() {
      wm.dialog({
        title: 'About Jargon', owner: win, className: 'w31-about',
        body: '<div class="about-head">' + H.jargonIcon + '<p><b>Jargon</b><br>Version 1.0<br>A HIRE.EXE time sink by ' + esc(globalThis.HIRED_EDITION?.applicant || 'Augustus Edem') + '</p></div><hr><p>No synergies were leveraged in the making of this program.</p>'
      });
    }

    deal();
    return win;
  };
})(globalThis.Hired);
