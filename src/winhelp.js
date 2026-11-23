(function (H) {
  'use strict';
  // Windows Help, as Program Manager's Help menu opened it in 3.1: a window with
  // its own menus, a row of Contents, Search, Back, History and Glossary
  // buttons, green underlined jumps between topics and dotted definitions.
  const wm = H.wm, esc = wm.esc;
  const jump = (topic, text) => '<a href="#" class="help-jump" data-topic="' + topic + '">' + text + '</a>';
  const term = (key, text) => '<a href="#" class="help-term" data-term="' + key + '">' + text + '</a>';

  const GLOSSARY = {
    'control-menu box': 'The box at the left-hand end of a title bar. Click it to open the Control menu, or double-click it to close the window.',
    'group window': 'A window inside Program Manager that holds program items. Minimised, it becomes a group icon at the bottom of Program Manager.',
    'icon': 'A small picture that stands for a program, a group or a minimised window.',
    'maximise': 'To enlarge a window to its largest size. Click the up arrow at the right-hand end of the title bar.',
    'minimise': 'To shrink a window to an icon. Click the down arrow at the right-hand end of the title bar.',
    'MS-DOS prompt': 'The C:\\> line you see after you exit Windows. Type WIN and press Enter to start Windows again.',
    'program item': 'An icon in a group window that starts a program or opens a document when you double-click it.',
    'Task List': 'A list of the programs that are running. Double-click the desktop, or press Ctrl+Esc, to see it.'
  };

  const TOPICS = {
    contents: { title: 'Contents for Program Manager Help', keywords: ['contents', 'Program Manager'], html: () =>
      '<p>Program Manager starts your programs and keeps them in groups. To learn how to use Help, press F1 or choose How to Use Help from the Help menu.</p>' +
      '<h3>How To...</h3><ul><li>' + jump('start', 'Start a Program') + '</li><li>' + jump('arrange', 'Arrange Windows and Icons') + '</li><li>' + jump('organise', 'Organise Groups and Program Items') + '</li><li>' + jump('tasks', 'Switch Between Programs') + '</li><li>' + jump('quit', 'Quit Windows') + '</li></ul>' +
      '<h3>Commands</h3><ul><li>' + jump('file-menu', 'File Menu Commands') + '</li><li>' + jump('options-menu', 'Options Menu Commands') + '</li><li>' + jump('window-menu', 'Window Menu Commands') + '</li></ul>' +
      '<h3>Keyboard</h3><ul><li>' + jump('keys', 'Program Manager Keys') + '</li></ul>' },
    start: { title: 'Starting a Program', keywords: ['starting programs', 'opening', 'HIRE.EXE', 'Run command'], html: () =>
      '<p>To start a program, double-click its ' + term('program item', 'program item') + '. You can also select the icon with one click and press Enter, or choose Open from the File menu.</p>' +
      '<p>To start a program by name, choose ' + jump('file-menu', 'Run') + ' from the File menu, type its command line, for example HIRE.EXE or CALC.EXE, and choose OK.</p>' +
      '<p>On a touch screen, tap an icon once to start it.</p>' },
    arrange: { title: 'Arranging Windows and Icons', keywords: ['arranging', 'moving windows', 'sizing windows', 'cascade', 'tile', 'auto arrange'], html: () =>
      '<p>To move a window, drag its title bar. To change its size, drag any border or corner.</p>' +
      '<p>To ' + term('minimise', 'minimise') + ' a window, click the down arrow in its title bar. To ' + term('maximise', 'maximise') + ' it, click the up arrow; click the double arrow to restore it. Double-clicking a title bar also maximises or restores the window.</p>' +
      '<p>Choose Cascade or Tile from the ' + jump('window-menu', 'Window menu') + ' to line up the group windows, and Arrange Icons to put icons back in rows. With Auto Arrange ticked on the Options menu, icons fall into rows by themselves.</p>' },
    organise: { title: 'Organising Groups and Program Items', keywords: ['new', 'groups', 'program items', 'moving items', 'copying items', 'deleting', 'properties'], html: () =>
      '<p>To create a group or a program item, choose New from the File menu.</p>' +
      '<p>To move a program item to another group, drag it there, or select it and press F7. To copy it, hold down Ctrl while you drag, or press F8.</p>' +
      '<p>To delete an item or an empty group, select it and press Del. To change an item\'s description or command line, select it and press Alt+Enter.</p>' +
      '<p>Changes to items last until the page is reloaded, so the original groups always come back.</p>' },
    tasks: { title: 'Switching Between Programs', keywords: ['Task List', 'switching', 'end task'], html: () =>
      '<p>Click any part of a window to bring it to the front. The window you are working in has a dark blue title bar.</p>' +
      '<p>To see every program that is running, double-click the desktop or press Ctrl+Esc to open the ' + term('Task List', 'Task List') + '. Select a program and choose Switch To, or choose End Task to close it.</p>' },
    quit: { title: 'Quitting Windows', keywords: ['exit windows', 'quitting', 'shutting down', 'WIN'], html: () =>
      '<p>To end your Windows session, choose Exit Windows from Program Manager\'s File menu, or double-click Program Manager\'s ' + term('control-menu box', 'control-menu box') + '. Choose OK when asked.</p>' +
      '<p>Windows closes and leaves you at the ' + term('MS-DOS prompt', 'MS-DOS prompt') + '. To start Windows again, type WIN and press Enter.</p>' +
      '<p>If Save Settings on Exit is ticked on the Options menu, Program Manager remembers where its windows were.</p>' },
    'file-menu': { title: 'File Menu Commands', keywords: ['file menu', 'run', 'exit windows'], html: () =>
      '<dl><dt>New</dt><dd>Creates a program group or program item.</dd><dt>Open</dt><dd>Starts the selected program, or opens the selected group.</dd><dt>Move</dt><dd>Moves the selected item to another group.</dd><dt>Copy</dt><dd>Copies the selected item into another group.</dd><dt>Delete</dt><dd>Deletes the selected item or group.</dd><dt>Properties</dt><dd>Shows the description and command line of the selected item or group.</dd><dt>Run</dt><dd>Starts a program from its command line.</dd><dt>Exit Windows</dt><dd>Ends your Windows session. See ' + jump('quit', 'Quitting Windows') + '.</dd></dl>' },
    'options-menu': { title: 'Options Menu Commands', keywords: ['options menu', 'minimise on use', 'save settings'], html: () =>
      '<dl><dt>Auto Arrange</dt><dd>Keeps icons in rows whenever a group window changes size.</dd><dt>Minimise on Use</dt><dd>Shrinks Program Manager to an icon whenever you start a program.</dd><dt>Save Settings on Exit</dt><dd>Remembers the layout of Program Manager when you exit Windows.</dd><dt>Replay startup</dt><dd>Shows the MS-DOS and Windows start-up again.</dd></dl>' },
    'window-menu': { title: 'Window Menu Commands', keywords: ['window menu', 'cascade', 'tile', 'arrange icons'], html: () =>
      '<dl><dt>Cascade</dt><dd>Overlaps the open group windows so that each title bar shows.</dd><dt>Tile</dt><dd>Arranges the open group windows side by side.</dd><dt>Arrange Icons</dt><dd>Puts the icons in the active group, or the group icons, back in rows.</dd><dt>Numbered groups</dt><dd>Opens the group you choose. The tick shows the active group.</dd></dl>' },
    keys: { title: 'Program Manager Keys', keywords: ['keyboard', 'shortcut keys', 'keys'], html: () =>
      '<table class="help-keys"><tr><th>Enter</th><td>Start the selected program</td></tr><tr><th>Arrow keys</th><td>Move between icons</td></tr><tr><th>Del</th><td>Delete the selected item</td></tr><tr><th>F7 / F8</th><td>Move / copy the selected item</td></tr><tr><th>Alt+Enter</th><td>Properties</td></tr><tr><th>Shift+F5 / Shift+F4</th><td>Cascade / Tile</td></tr><tr><th>Ctrl+F4</th><td>Close (minimise) the active group</td></tr><tr><th>Ctrl+F6</th><td>Next group window</td></tr><tr><th>Alt</th><td>Move to the menu bar; Alt plus an underlined letter opens a menu</td></tr><tr><th>Alt+Space</th><td>Control menu</td></tr><tr><th>Alt+F4</th><td>Close the active window</td></tr><tr><th>Ctrl+Esc</th><td>Task List</td></tr><tr><th>F1</th><td>Help</td></tr></table>' +
      '<p>Some browsers keep a few of these keys, such as Alt+F4 and Ctrl+Esc, for themselves.</p>' },
    'using-help': { title: 'How to Use Help', keywords: ['help, using', 'jumps', 'glossary', 'history', 'back'], html: () =>
      '<p>Words with a solid green underline are jumps. Click one to go to that topic. Words with a dotted underline have a definition: click one to see it, then click again to close it.</p>' +
      '<dl><dt>Contents</dt><dd>Goes to the list of Help topics.</dd><dt>Search</dt><dd>Finds topics by keyword.</dd><dt>Back</dt><dd>Goes back to the topic you saw before.</dd><dt>History</dt><dd>Lists the topics you have seen.</dd><dt>Glossary</dt><dd>Lists the terms Help uses, with their meanings.</dd></dl>' }
  };

  let history = [], current = 'contents', win = null, onTop = false;
  const bookmarks = [];

  function show(topic, push = true) {
    if (!TOPICS[topic]) topic = 'contents';
    if (push && current && win) history.push(current);
    current = topic;
    const t = TOPICS[topic], body = win.querySelector('.help-topic');
    body.innerHTML = '<h2>' + esc(t.title) + '</h2>' + t.html();
    body.scrollTop = 0;
    win.querySelector('[data-help="back"]').disabled = !history.length;
    if (!seen.includes(topic)) seen.push(topic); else { seen.splice(seen.indexOf(topic), 1); seen.push(topic); }
  }
  const seen = [];

  function definition(anchor) {
    document.querySelector('.help-popup')?.remove();
    const text = GLOSSARY[anchor.dataset.term];
    if (!text) return;
    const pop = document.createElement('div');
    pop.className = 'help-popup'; pop.setAttribute('role', 'tooltip'); pop.textContent = text;
    win.querySelector('.modal-body').append(pop);
    const a = anchor.getBoundingClientRect(), b = win.querySelector('.modal-body').getBoundingClientRect();
    pop.style.left = Math.max(4, Math.min(a.left - b.left, b.width - pop.offsetWidth - 4)) + 'px';
    pop.style.top = (a.bottom - b.top + 4) + 'px';
    setTimeout(() => document.addEventListener('pointerdown', () => pop.remove(), { once: true, capture: true }));
  }

  function search() {
    const keys = [...new Set(Object.values(TOPICS).flatMap(t => t.keywords))].sort((a, b) => a.localeCompare(b));
    let picked = null;
    wm.dialog({
      title: 'Search', owner: win, layout: 'side', className: 'help-search',
      body: '<p class="w31-static">Type a <u>w</u>ord, or select one from the list. Then choose Show Topics.</p><input name="word" aria-label="Search word" autocomplete="off" spellcheck="false">' +
        '<div class="w31-listbox help-keywords" role="listbox" tabindex="0" aria-label="Keywords">' + keys.map(k => '<div role="option" aria-selected="false">' + esc(k) + '</div>').join('') + '</div>' +
        '<hr><p class="w31-static">Select a <u>t</u>opic, then choose Go To.</p><div class="w31-listbox help-found" role="listbox" tabindex="0" aria-label="Topics"></div>',
      buttons: [{ label: '&Show Topics', value: 'show' }, { label: '&Go To', value: 'go', default: true }, { label: 'Cancel', value: 'cancel', cancel: true }],
      init(box) {
        const input = box.querySelector('input'), list = box.querySelector('.help-keywords'), found = box.querySelector('.help-found');
        const choose = word => {
          list.querySelectorAll('[role=option]').forEach(o => o.setAttribute('aria-selected', String(o.textContent === word)));
          const hits = Object.entries(TOPICS).filter(([, t]) => t.keywords.includes(word));
          found.innerHTML = hits.map(([id, t], i) => '<div role="option" data-topic="' + id + '" aria-selected="' + (i === 0) + '">' + esc(t.title) + '</div>').join('');
          picked = hits[0]?.[0] || null;
        };
        input.addEventListener('input', () => {
          const word = keys.find(k => k.toLowerCase().startsWith(input.value.trim().toLowerCase()));
          if (word && input.value.trim()) { choose(word); list.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' }); }
        });
        list.addEventListener('click', e => { const o = e.target.closest('[role=option]'); if (o) { input.value = o.textContent; choose(o.textContent); } });
        found.addEventListener('click', e => { const o = e.target.closest('[role=option]'); if (!o) return; picked = o.dataset.topic; found.querySelectorAll('[role=option]').forEach(x => x.setAttribute('aria-selected', String(x === o))); });
        found.addEventListener('dblclick', e => { if (e.target.closest('[role=option]')) box.querySelector('.is-default').click(); });
        box.querySelector('[data-i="0"]').addEventListener('click', () => { const w = keys.find(k => k.toLowerCase().startsWith(input.value.trim().toLowerCase())); if (w) choose(w); });
      },
      onButton: value => (value === 'show' ? false : value === 'go' && !picked ? false : undefined)
    }).then(({ button }) => { if (button === 'go' && picked) show(picked); });
  }

  function listDialog(title, rows, go) {
    let picked = 0;
    wm.dialog({
      title, owner: win, closeOutside: true, className: 'help-list',
      body: '<div class="w31-listbox" role="listbox" tabindex="0" aria-label="' + esc(title) + '">' + rows.map((r, i) => '<div role="option" data-i="' + i + '" aria-selected="' + (i === 0) + '">' + esc(r.label) + '</div>').join('') + '</div><p class="help-definition"></p>',
      buttons: [{ label: '&Go To', value: 'go', default: true }, { label: 'Cancel', value: 'cancel', cancel: true }],
      init(box, { press }) {
        const lb = box.querySelector('.w31-listbox'), def = box.querySelector('.help-definition');
        const pick = i => { picked = Math.max(0, Math.min(rows.length - 1, i)); lb.querySelectorAll('[role=option]').forEach((o, j) => o.setAttribute('aria-selected', String(j === picked))); def.textContent = rows[picked]?.note || ''; };
        lb.addEventListener('click', e => { const o = e.target.closest('[role=option]'); if (o) pick(Number(o.dataset.i)); });
        lb.addEventListener('dblclick', e => { if (e.target.closest('[role=option]')) press(0); });
        lb.addEventListener('keydown', e => { if (e.key === 'ArrowDown') pick(picked + 1); else if (e.key === 'ArrowUp') pick(picked - 1); else return; e.preventDefault(); });
        pick(0);
      }
    }).then(({ button }) => { if (button === 'go' && rows[picked]) go(rows[picked]); });
  }

  function menus() {
    return [
      { label: '&File', items: () => [{ label: '&Open...', disabled: true }, { label: '&Print Topic', disabled: true }, { label: 'P&rint Setup...', disabled: true }, '-', { label: 'E&xit', action: () => wm.close('help') }] },
      { label: '&Edit', items: () => [{ label: '&Copy...', action: () => { navigator.clipboard?.writeText(win.querySelector('.help-topic').innerText).catch(() => {}); } }, { label: '&Annotate...', disabled: true }] },
      { label: 'Book&mark', items: () => [{ label: '&Define...', action: defineBookmark }, ...(bookmarks.length ? ['-'] : []), ...bookmarks.map((b, i) => ({ label: '&' + (i + 1) + ' ' + b.name, action: () => show(b.topic) }))] },
      { label: '&Help', items: () => [{ label: '&How to Use Help', key: 'F1', action: () => show('using-help') }, { label: 'Always on &Top', checked: onTop, action: () => { onTop = !onTop; win.classList.toggle('is-on-top', onTop); } }, '-', { label: '&About Help...', action: aboutHelp }] }
    ];
  }
  function defineBookmark() {
    wm.dialog({
      title: 'Bookmark Define', owner: win, layout: 'side',
      body: '<div class="w31-field"><label for="help-mark" data-key="b"><u>B</u>ookmark Name:</label><input id="help-mark" name="name" value="' + esc(TOPICS[current].title) + '" autocomplete="off"></div>',
      buttons: [{ label: 'OK', value: 'ok', default: true }, { label: 'Cancel', value: 'cancel', cancel: true }]
    }).then(({ button, values }) => { if (button === 'ok' && values.name.trim()) bookmarks.push({ name: values.name.trim(), topic: current }); });
  }
  function aboutHelp() {
    wm.dialog({
      title: 'About Help', owner: win, className: 'w31-about',
      body: '<p><b>Microsoft Windows Help</b><br>Version 3.1<br>Copyright © 1985-1992 Microsoft Corp.</p>',
      buttons: [{ label: 'OK', value: 'ok', default: true }]
    });
  }

  H.winhelp = function (topic = 'contents', then) {
    const existing = wm.get('help');
    if (existing && win?.isConnected) {
      if (existing.state === 'min') wm.restore('help'); else wm.activate('help');
      show(topic);
      if (then === 'search') search();
      return;
    }
    history = []; current = null;
    win = wm.openApp({
      id: 'help', title: 'Program Manager Help', className: 'help-window', resizable: true, maximisable: true, minSize: [300, 220], iconId: 'help-icon',
      icon: '<span class="pm-glyph help-glyph">?</span>', menu: menus(),
      body: '<div class="help-buttons" role="toolbar" aria-label="Help buttons"><button type="button" data-help="contents"><u>C</u>ontents</button><button type="button" data-help="search"><u>S</u>earch</button><button type="button" data-help="back" disabled><u>B</u>ack</button><button type="button" data-help="history">His<u>t</u>ory</button><button type="button" data-help="glossary"><u>G</u>lossary</button></div><article class="help-topic" tabindex="0"></article>',
      onClose: () => { document.querySelector('.help-popup')?.remove(); }
    });
    win.querySelector('.help-buttons').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      const a = b.dataset.help;
      if (a === 'contents') show('contents');
      else if (a === 'search') search();
      else if (a === 'back' && history.length) show(history.pop(), false);
      else if (a === 'history') listDialog('Windows Help History', [...seen].reverse().map(id => ({ label: TOPICS[id].title, topic: id })), r => show(r.topic));
      else if (a === 'glossary') listDialog('Glossary', Object.entries(GLOSSARY).map(([k, v]) => ({ label: k, note: v })), r => { const hit = Object.entries(TOPICS).find(([, t]) => t.keywords.some(w => w.toLowerCase().includes(r.label.toLowerCase().split(' ')[0]))); if (hit) show(hit[0]); });
    });
    win.querySelector('.help-topic').addEventListener('click', e => {
      const j = e.target.closest('.help-jump'), t = e.target.closest('.help-term');
      if (j) { e.preventDefault(); show(j.dataset.topic); }
      else if (t) { e.preventDefault(); definition(t); }
    });
    win.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input,.w31-menubar')) return;
      const map = { c: 'contents', s: 'search', b: 'back', t: 'history', g: 'glossary' };
      if (e.key === 'F1') { e.preventDefault(); show('using-help'); return; }
      const which = map[e.key.toLowerCase()];
      if (which && !e.target.closest('.help-topic a')) { const btn = win.querySelector('[data-help="' + which + '"]'); if (!btn.disabled) { e.preventDefault(); btn.click(); } }
    });
    show(topic, false);
    if (then === 'search') search();
  };
})(globalThis.Hired);
