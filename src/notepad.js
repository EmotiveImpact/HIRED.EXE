(function (H) {
  'use strict';
  // Notepad, as Windows 3.1 shipped it: one plain text window with File, Edit,
  // Search and Help menus, no toolbar and no status bar, showing the text in the
  // System font. Typing changes only the open window; reopening the file brings
  // the original back. On touch screens the text is read-only, so a tap to read
  // or scroll never brings up the on-screen keyboard.
  const wm = H.wm, esc = wm.esc;
  // NOTEP001.PNG, archived Windows 3.x Notepad resource:
  // https://github.com/mRB0/many-windows-3.1-icons-in-png-format/blob/master/NOTEP001.PNG
  const ICON = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAw0lEQVR4AdWXUQqAMAxDd/QebTebBOiX8qhdEFcIHQLLWzpQxym1JMO6Z65S31l3QZa2yD7n1Fr9/fOIFkRuutXTXOtIELc59DaA3bwAAOZjVATxA8AXs2cANi+fnuOvAPhnL8MUALjMIX5VBcBtDgBec4i/PgKj+f30nIBv9m0Aq3lGziNgc3v8lIDbvAEQ4RHEL+EdcIhOTwmUXkwd2QAiwqJPE3iogwGOGgFUH8BQ8EVkTgEk8waA+S5s/yca9K+6ALEMZ2OSw6ldAAAAAElFTkSuQmCC" alt="">';
  let win = null, area = null, file = null, wrap = true;
  const find = { text: '', matchCase: false, up: false };

  function title() { return 'Notepad - ' + (file || '(Untitled)'); }
  function setFile(name) {
    file = name;
    const t = title(), rec = wm.get('notepad');
    win.querySelector('.w31-title').textContent = t;
    win.setAttribute('aria-label', t);
    if (rec) {
      rec.opts.title = t;
      rec.icon.querySelector('.desk-icon-label').textContent = t;
      rec.icon.setAttribute('aria-label', t + ' (minimised)');
    }
  }

  // ------------------------------------------------------------------- File
  function download(name) {
    const url = URL.createObjectURL(new Blob([area.value.replace(/\r?\n/g, '\r\n')], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function saveAs() {
    wm.dialog({
      title: 'Save As', owner: win, layout: 'side', className: 'notepad-save',
      body: '<div class="w31-field"><label for="notepad-name" data-key="n">File <u>N</u>ame:</label><input id="notepad-name" name="name" value="' + esc(file || '*.TXT') + '" autocomplete="off" spellcheck="false"></div>',
      buttons: [{ label: 'OK', value: 'ok', default: true }, { label: 'Cancel', value: 'cancel', cancel: true }],
      onButton: (value, v) => (value === 'ok' && !/^[^\\/:*?"<>|]+$/.test(v.name.trim()) ? false : undefined)
    }).then(({ button, values }) => {
      if (button !== 'ok') return;
      let name = values.name.trim().toUpperCase();
      if (!/\.[^.]*$/.test(name)) name += '.TXT';
      setFile(name);
      download(name);
    });
  }

  // ------------------------------------------------------------------- Edit
  const selected = () => area.selectionStart !== area.selectionEnd;
  function command(name, value) { area.focus(); document.execCommand(name, false, value); }
  function paste() {
    navigator.clipboard?.readText().then(text => { if (text) command('insertText', text); }).catch(() => {});
  }
  function timeDate() {
    const now = new Date();
    command('insertText', now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString('en-GB'));
  }
  function setWrap(on) {
    wrap = on;
    area.wrap = on ? 'soft' : 'off';
    area.classList.toggle('is-nowrap', !on);
  }

  // ----------------------------------------------------------------- Search
  function findDialog() {
    wm.dialog({
      title: 'Find', owner: win, layout: 'side', className: 'notepad-find',
      body: '<div class="w31-field"><label for="notepad-find" data-key="n">Fi<u>n</u>d What:</label><input id="notepad-find" name="text" value="' + esc(find.text) + '" autocomplete="off" spellcheck="false"></div>' +
        '<div class="notepad-find-options"><label class="w31-check-row"><input type="checkbox" name="matchCase"' + (find.matchCase ? ' checked' : '') + '><span>Match <u>C</u>ase</span></label>' +
        '<fieldset class="w31-group"><legend>Direction</legend><label><input type="radio" name="dir" value="up"' + (find.up ? ' checked' : '') + '><u>U</u>p</label> <label><input type="radio" name="dir" value="down"' + (find.up ? '' : ' checked') + '><u>D</u>own</label></fieldset></div>',
      buttons: [{ label: '&Find Next', value: 'next', default: true }, { label: 'Cancel', value: 'cancel', cancel: true }],
      onButton: (value, v) => (value === 'next' && !v.text ? false : undefined)
    }).then(({ button, values }) => {
      if (button !== 'next') return;
      Object.assign(find, { text: values.text, matchCase: values.matchCase, up: values.dir === 'up' });
      findNext();
    });
  }
  function findNext() {
    if (!find.text) { findDialog(); return; }
    const hay = find.matchCase ? area.value : area.value.toLowerCase();
    const needle = find.matchCase ? find.text : find.text.toLowerCase();
    const at = find.up ? (area.selectionStart > 0 ? hay.lastIndexOf(needle, area.selectionStart - 1) : -1) : hay.indexOf(needle, area.selectionEnd);
    if (at < 0) { wm.message({ title: 'Notepad', text: 'Cannot find "' + esc(find.text) + '"', icon: 'info', owner: win }); return; }
    area.focus({ preventScroll: true });
    area.setSelectionRange(at, at + needle.length);
    reveal(at);
  }
  // Scroll the text so the found word sits in view.
  function reveal(at) {
    const mirror = document.createElement('div');
    const style = getComputedStyle(area);
    for (const p of ['font', 'lineHeight', 'letterSpacing', 'padding', 'whiteSpace', 'overflowWrap', 'wordBreak', 'tabSize']) mirror.style[p] = style[p];
    Object.assign(mirror.style, { position: 'absolute', visibility: 'hidden', left: '-9999px', top: '0', width: area.clientWidth + 'px', boxSizing: 'border-box' });
    mirror.textContent = area.value.slice(0, at);
    const mark = document.createElement('span');
    mark.textContent = '​';
    mirror.append(mark);
    document.body.append(mirror);
    const y = mark.offsetTop, x = mark.offsetLeft;
    mirror.remove();
    if (y < area.scrollTop || y > area.scrollTop + area.clientHeight - 40) area.scrollTop = Math.max(0, y - area.clientHeight / 3);
    if (!wrap && (x < area.scrollLeft || x > area.scrollLeft + area.clientWidth - 40)) area.scrollLeft = Math.max(0, x - area.clientWidth / 3);
  }

  // ------------------------------------------------------------------- Help

  function menus() {
    const editable = () => !area.readOnly;
    return [
      { label: '&File', id: 'notepad-file', items: () => [
        { label: '&New', action: () => { area.value = ''; setFile(null); area.focus(); } },
        { label: '&Open...', disabled: true },
        { label: '&Save', id: 'notepad-save', action: () => (file ? download(file) : saveAs()) },
        { label: 'Save &As...', action: saveAs },
        '-',
        { label: '&Print', disabled: true },
        { label: 'Page Se&tup...', disabled: true },
        { label: 'P&rint Setup...', disabled: true },
        '-',
        { label: 'E&xit', id: 'notepad-exit', action: () => wm.close('notepad') }
      ] },
      { label: '&Edit', id: 'notepad-edit', items: () => [
        { label: '&Undo', key: 'Ctrl+Z', disabled: !editable(), action: () => command('undo') },
        '-',
        { label: 'Cu&t', key: 'Ctrl+X', disabled: !editable() || !selected(), action: () => command('cut') },
        { label: '&Copy', key: 'Ctrl+C', disabled: !selected(), action: () => command('copy') },
        { label: '&Paste', key: 'Ctrl+V', disabled: !editable() || !navigator.clipboard?.readText, action: paste },
        { label: 'De&lete', key: 'Del', disabled: !editable() || !selected(), action: () => command('delete') },
        '-',
        { label: 'Select &All', id: 'notepad-select-all', action: () => { area.focus(); area.select(); } },
        { label: 'Time/&Date', key: 'F5', disabled: !editable(), action: timeDate },
        '-',
        { label: '&Word Wrap', id: 'notepad-wrap', checked: wrap, action: () => setWrap(!wrap) }
      ] },
      { label: '&Search', id: 'notepad-search', items: () => [
        { label: '&Find...', id: 'notepad-find-menu', action: findDialog },
        { label: 'Find &Next', key: 'F3', action: findNext }
      ] },
      { label: '&Help', id: 'notepad-help', items: () => [
        { label: '&Contents', key: 'F1', disabled: true },
        { label: '&Search for Help On...', disabled: true },
        { label: '&How to Use Help', action: () => H.winhelp?.('using-help') },
        '-',
        { label: '&About Notepad...', id: 'notepad-about', action: () => H.progman.about('Notepad', win) }
      ] }
    ];
  }

  // H.notepad('CV.TXT', text) opens a file in Notepad. Opening it again while it
  // is open brings the window forward and puts the original text back.
  H.notepad = function (name, text) {
    win = wm.openApp({
      id: 'notepad', title: 'Notepad - ' + name, className: 'notepad-window', resizable: true, maximisable: true,
      minSize: [220, 140], icon: ICON, iconId: 'notepad-icon', menu: menus(), focus: () => area?.focus({ preventScroll: true }),
      body: '<textarea class="notepad-text" aria-label="Text" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"></textarea>'
    });
    area = win.querySelector('.notepad-text');
    area.readOnly = matchMedia('(pointer: coarse)').matches;
    area.value = text;
    setFile(name);
    setWrap(wrap);
    area.setSelectionRange(0, 0);
    area.scrollTop = 0;
    win.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.target !== area) return;
      if (e.key === 'F3') { e.preventDefault(); findNext(); }
      else if (e.key === 'F5' && !area.readOnly) { e.preventDefault(); timeDate(); }
    });
    area.focus({ preventScroll: true });
    return win;
  };
  H.notepad.icon = ICON;
})(globalThis.Hired);
