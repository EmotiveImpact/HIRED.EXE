(function (H) {
  'use strict';
  // Write, the Windows 3.1 word processor, as a reader: it opens the project's
  // documents (kept as Markdown in docs/) as set pages, with headings, tables
  // and pictures, where a browser would show the raw text. Nothing is editable.
  const wm = H.wm, esc = wm.esc;
  const asset = path => globalThis.HIRED_EMBEDDED_ASSETS?.[path] || path;
  const ICON = H.linkIcon?.('Write') || '<span class="pm-glyph">W</span>';

  // The documents Write knows by name, so that a link from one opens the other.
  const DOCS = {
    'docs/ART-BIBLE.md': 'ARTBIBLE.WRI',
    'docs/LEVEL-DESIGN.md': 'LEVELS.WRI',
    'docs/ENGINE-API.md': 'ENGINE.WRI'
  };
  const cache = {};
  let win = null, page = null, file = null, lastFind = { text: '', matchCase: false };

  // ---------------------------------------------------------------- Markdown
  // "docs/" + "../assets/x.png" is "assets/x.png".
  function resolve(base, href) {
    const parts = (base + href).split('/'), out = [];
    for (const part of parts) { if (part === '..') out.pop(); else if (part && part !== '.') out.push(part); }
    return out.join('/');
  }
  const slug = text => text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9 -]/g, '').trim().replace(/\s+/g, '-');

  function inline(text, base) {
    const kept = [];
    const keep = html => { kept.push(html); return '\u0000' + (kept.length - 1) + '\u0000'; };
    let s = text.replace(/`([^`]+)`/g, (_, code) => keep('<code>' + esc(code) + '</code>'));
    s = esc(s);
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => keep('<img src="' + esc(asset(resolve(base, src))) + '" alt="' + alt + '" loading="lazy" draggable="false">'));
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
      if (/^https:\/\//.test(href)) return keep('<a href="' + href + '" target="_blank" rel="noopener noreferrer">') + label + keep('</a>');
      if (href.startsWith('#')) return keep('<a href="#" data-anchor="' + href.slice(1) + '">') + label + keep('</a>');
      const target = resolve(base, href);
      return DOCS[target] ? keep('<a href="#" data-doc="' + target + '">') + label + keep('</a>') : label;
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>');
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => kept[+i]);
  }

  function markdown(text, base) {
    const lines = text.replace(/\r\n?/g, '\n').split('\n'), out = [];
    const cells = row => row.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    const block = l => /^(#{1,6}\s|```|\s*[-*]\s|\s*\d+\.\s|\|)/.test(l);
    for (let i = 0; i < lines.length;) {
      const line = lines[i];
      let m;
      if (!line.trim()) { i++; continue; }
      if (line.startsWith('```')) {
        const code = [];
        for (i++; i < lines.length && !lines[i].startsWith('```'); i++) code.push(lines[i]);
        i++;
        out.push('<pre>' + esc(code.join('\n')) + '</pre>');
      } else if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) {
        const level = Math.min(m[1].length, 4), html = inline(m[2], base);
        out.push('<h' + level + ' id="write-' + slug(html) + '">' + html + '</h' + level + '>');
        i++;
      } else if (line.startsWith('|') && /^\|?\s*:?-{3,}/.test(lines[i + 1] || '')) {
        const head = cells(line), rows = [];
        for (i += 2; i < lines.length && lines[i].startsWith('|'); i++) rows.push(cells(lines[i]));
        out.push('<table><thead><tr>' + head.map(c => '<th>' + inline(c, base) + '</th>').join('') + '</tr></thead><tbody>' +
          rows.map(r => '<tr>' + r.map(c => '<td>' + inline(c, base) + '</td>').join('') + '</tr>').join('') + '</tbody></table>');
      } else if ((m = /^\s*([-*]|\d+\.)\s+/.exec(line))) {
        const tag = /\d/.test(m[1]) ? 'ol' : 'ul', items = [];
        for (; i < lines.length && lines[i].trim(); i++) {
          const item = /^\s*(?:[-*]|\d+\.)\s+(.*)$/.exec(lines[i]);
          if (item) items.push(item[1]); else if (items.length) items[items.length - 1] += ' ' + lines[i].trim();
        }
        out.push('<' + tag + '>' + items.map(t => '<li>' + inline(t, base) + '</li>').join('') + '</' + tag + '>');
      } else {
        const para = [line];
        for (i++; i < lines.length && lines[i].trim() && !block(lines[i]); i++) para.push(lines[i]);
        out.push('<p>' + inline(para.join(' '), base) + '</p>');
      }
    }
    return out.join('');
  }

  // -------------------------------------------------------------------- Find
  function findNext() {
    if (!lastFind.text) { findDialog(); return; }
    const doc = page.querySelector('.write-doc'), walker = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);
    const needle = lastFind.matchCase ? lastFind.text : lastFind.text.toLowerCase();
    const sel = getSelection(), from = sel.rangeCount && doc.contains(sel.focusNode) ? sel.getRangeAt(0) : null;
    let found = null, first = null;
    for (let node = walker.nextNode(); node && !found; node = walker.nextNode()) {
      const hay = lastFind.matchCase ? node.data : node.data.toLowerCase();
      for (let pos = hay.indexOf(needle); pos >= 0 && !found; pos = hay.indexOf(needle, pos + 1)) {
        const range = document.createRange();
        range.setStart(node, pos); range.setEnd(node, pos + needle.length);
        first ||= range;
        if (!from || range.compareBoundaryPoints(Range.START_TO_END, from) > 0) found = range;
      }
    }
    found ||= first;
    if (!found) { wm.message({ title: 'Write', text: 'Search text not found.', icon: 'info', owner: win }); return; }
    sel.removeAllRanges(); sel.addRange(found);
    (found.startContainer.parentElement || doc).scrollIntoView({ block: 'center' });
  }
  function findDialog() {
    wm.dialog({
      title: 'Find', owner: win, layout: 'side', className: 'notepad-find',
      body: '<div class="w31-field"><label for="write-find" data-key="n">Fi<u>n</u>d What:</label><input id="write-find" name="text" value="' + esc(lastFind.text) + '" autocomplete="off" spellcheck="false"></div>' +
        '<label class="w31-check-row"><input type="checkbox" name="matchCase"' + (lastFind.matchCase ? ' checked' : '') + '><span>Match <u>C</u>ase</span></label>',
      buttons: [{ label: '&Find Next', value: 'next', default: true }, { label: 'Cancel', value: 'cancel', cancel: true }],
      onButton: (value, v) => (value === 'next' && !v.text ? false : undefined)
    }).then(({ button, values }) => {
      if (button !== 'next') return;
      lastFind = { text: values.text, matchCase: values.matchCase };
      findNext();
    });
  }

  function menus() {
    const selected = () => { const s = getSelection(); return !!s && !s.isCollapsed && !!page?.contains(s.anchorNode); };
    return [
      { label: '&File', id: 'write-file', items: () => [
        { label: '&New', disabled: true },
        { label: '&Open...', disabled: true },
        { label: '&Save', disabled: true },
        { label: 'Save &As...', disabled: true },
        '-',
        { label: '&Print...', disabled: true },
        '-',
        { label: 'E&xit', id: 'write-exit', action: () => wm.close('write') }
      ] },
      { label: '&Edit', id: 'write-edit', items: () => [
        { label: '&Undo', disabled: true },
        '-',
        { label: 'Cu&t', key: 'Ctrl+X', disabled: true },
        { label: '&Copy', key: 'Ctrl+C', disabled: !selected(), action: () => document.execCommand('copy') },
        { label: '&Paste', key: 'Ctrl+V', disabled: true }
      ] },
      { label: 'Fi&nd', id: 'write-find-menu', items: () => [
        { label: '&Find...', id: 'write-find-item', action: findDialog },
        { label: 'Repeat &Last Find', key: 'F3', action: findNext }
      ] },
      { label: '&Help', id: 'write-help', items: () => [
        { label: '&About Write...', id: 'write-about', action: () => H.progman.about('Write', win) }
      ] }
    ];
  }

  function setFile(name) {
    file = name;
    const t = 'Write - ' + name, rec = wm.get('write');
    win.querySelector('.w31-title').textContent = t;
    win.setAttribute('aria-label', t);
    if (rec) {
      rec.opts.title = t;
      rec.icon.querySelector('.desk-icon-label').textContent = t;
      rec.icon.setAttribute('aria-label', t + ' (minimised)');
    }
  }

  function show(path, text) {
    const name = DOCS[path] || path.split('/').pop().toUpperCase();
    const running = wm.get('write');
    if (running && win?.isConnected) {
      if (running.state === 'min') wm.restore('write'); else wm.activate('write');
    } else {
      win = wm.openApp({
        id: 'write', title: 'Write - ' + name, className: 'write-window', resizable: true, maximisable: true, minSize: [260, 200],
        icon: ICON, iconId: 'write-icon', menu: menus(), focus: () => page?.focus({ preventScroll: true }),
        body: '<div class="write-page w31-scroll" tabindex="0"><article class="write-doc"></article></div><div class="write-foot"><span>Page 1</span></div>'
      });
      page = win.querySelector('.write-page');
      page.addEventListener('click', e => {
        const a = e.target.closest('a[data-doc],a[data-anchor]');
        if (!a) return;
        e.preventDefault();
        if (a.dataset.doc) H.write(a.dataset.doc);
        else page.querySelector('#write-' + CSS.escape(a.dataset.anchor))?.scrollIntoView({ block: 'start' });
      });
      win.addEventListener('keydown', e => {
        if (e.key === 'F3' && !e.altKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); findNext(); }
      });
    }
    page.querySelector('.write-doc').innerHTML = markdown(text, path.slice(0, path.lastIndexOf('/') + 1));
    page.scrollTop = 0; page.scrollLeft = 0;
    setFile(name);
    page.focus({ preventScroll: true });
    return win;
  }

  // H.write('docs/ART-BIBLE.md') opens that document in Write. The single-file
  // edition carries the text; the site fetches it. Where neither works (a page
  // opened straight from a folder) the browser shows the file itself.
  H.write = function (path) {
    const text = cache[path] ?? globalThis.HIRED_EMBEDDED_DOCS?.[path];
    if (text != null) return Promise.resolve(show(path, text));
    return fetch(path).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(body => show(path, cache[path] = body))
      .catch(() => { window.open(path, '_blank', 'noopener'); return null; });
  };
  H.write.icon = ICON;
  H.write.docs = DOCS;
  H.write.markdown = markdown;
})(globalThis.Hired);
