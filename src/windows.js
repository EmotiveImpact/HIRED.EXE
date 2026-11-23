(function (H) {
  'use strict';
  // The Windows 3.1 window manager behind the HIRE.EXE desktop.
  //
  // Every top-level window (Program Manager, Calculator, Help, Sea Trial, the
  // portfolio) is registered here. It owns what Windows itself did in 1992:
  // title bars that go blue when a window is active and white when it is not,
  // the control-menu box, minimise and maximise buttons, dragging by the title
  // bar, resizing by the border, minimised windows as icons along the bottom of
  // the desktop, the Task List, Cascade and Tile, menus with underlined access
  // keys, and modal dialog boxes. Program Manager's own contents live in
  // progman.js. Window state lives here so it survives the desktop being drawn
  // again each time the player returns from the game.
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const wm = H.wm = {};
  const tops = new Map();       // id -> window record, front-most last in `stack`
  const stack = [];
  const dialogs = [];
  let shell = null, appLayer = null, iconBar = null, layer = 20, activeId = null;

  // '&File' -> File with the F underlined; the letter is the access key.
  function mnemonic(text) {
    const i = text.indexOf('&');
    if (i < 0) return { html: esc(text), key: '', plain: text };
    return { html: esc(text.slice(0, i)) + '<u>' + esc(text[i + 1]) + '</u>' + esc(text.slice(i + 2)), key: text[i + 1].toLowerCase(), plain: text.slice(0, i) + text.slice(i + 1) };
  }
  wm.mnemonic = mnemonic;
  wm.esc = esc;

  // ---------------------------------------------------------------- geometry
  function measure(el, area) {
    const r = el.getBoundingClientRect(), a = area.getBoundingClientRect();
    return { x: r.left - a.left - area.clientLeft + area.scrollLeft, y: r.top - a.top - area.clientTop + area.scrollTop, w: r.width, h: r.height };
  }
  // Keep at least the title bar on screen. A window that fits stays wholly inside.
  function clamp(g, area) {
    const W = area.clientWidth, Ht = area.clientHeight;
    const w = Math.min(g.w, W), h = Math.min(g.h, Ht);
    const x = Math.min(Math.max(0, g.x), Math.max(0, W - w));
    const y = Math.min(Math.max(0, g.y), Math.max(0, Ht - Math.min(h, 30)));
    return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
  }
  function setBox(el, g, size = true) {
    el.classList.remove('is-centred');
    el.style.left = g.x + 'px'; el.style.top = g.y + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto';
    if (size) { el.style.width = g.w + 'px'; if (g.h != null) el.style.height = g.h + 'px'; }
  }
  wm.measure = measure; wm.clamp = clamp; wm.setBox = setBox;

  // Mouse and pen move a window by its title bar. Touch keeps scrolling the page.
  // A plain click leaves the window where it is: it only moves once the pointer has.
  function draggable(win, handle, area, { can, start, end } = {}) {
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.pointerType === 'touch') return;
      if (e.target.closest('button,a,input,select,textarea,.w31-menu')) return;
      if (win.classList.contains('is-max') || (can && !can())) return;
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY;
      let from = null;
      handle.setPointerCapture(e.pointerId);
      const move = ev => {
        if (!from) {
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return;
          from = measure(win, area);
          start?.(from);
          setBox(win, from, false);
          win.classList.add('is-dragging');
        }
        const g = clamp({ x: from.x + ev.clientX - sx, y: from.y + ev.clientY - sy, w: from.w, h: from.h }, area);
        win.style.left = g.x + 'px'; win.style.top = g.y + 'px';
      };
      const stop = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', stop);
        handle.removeEventListener('pointercancel', stop);
        if (!from) return;
        win.classList.remove('is-dragging');
        end?.(measure(win, area));
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', stop);
      handle.addEventListener('pointercancel', stop);
    });
  }
  wm.draggable = draggable;

  // The thick 3.1 frame: drag any edge or corner to resize.
  function resizable(win, area, { min = [160, 90], can, start, end } = {}) {
    if (win.querySelector(':scope > .w31-grip')) return;
    for (const dir of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
      const grip = document.createElement('i');
      grip.className = 'w31-grip w31-grip-' + dir; grip.dataset.dir = dir; grip.setAttribute('aria-hidden', 'true');
      win.append(grip);
    }
    win.addEventListener('pointerdown', e => {
      const grip = e.target.closest('.w31-grip');
      if (!grip || grip.parentElement !== win) return;
      if (e.button !== 0 || e.pointerType === 'touch' || win.classList.contains('is-max') || (can && !can())) return;
      e.preventDefault(); e.stopPropagation();
      const dir = grip.dataset.dir, from = measure(win, area), sx = e.clientX, sy = e.clientY;
      start?.(from);
      setBox(win, from);
      win.classList.add('is-sizing');
      grip.setPointerCapture(e.pointerId);
      const move = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        const W = area.clientWidth, Ht = area.clientHeight;
        let { x, y, w, h } = from;
        if (dir.includes('e')) w = Math.min(Math.max(min[0], from.w + dx), W - from.x);
        if (dir.includes('s')) h = Math.min(Math.max(min[1], from.h + dy), Ht - from.y);
        if (dir.includes('w')) { w = Math.max(min[0], Math.min(from.w - dx, from.x + from.w)); x = from.x + from.w - w; }
        if (dir.includes('n')) { h = Math.max(min[1], Math.min(from.h - dy, from.y + from.h)); y = from.y + from.h - h; }
        setBox(win, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
      };
      const stop = () => {
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', stop);
        grip.removeEventListener('pointercancel', stop);
        win.classList.remove('is-sizing');
        end?.(measure(win, area));
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', stop);
      grip.addEventListener('pointercancel', stop);
    });
  }
  wm.resizable = resizable;

  // Control menu > Move or Size: the arrow keys move or stretch the window,
  // Enter keeps the change and Esc puts it back, as in 3.1. A click also ends it.
  function keyboardTrack(win, area, mode, { min = [160, 90], start, end } = {}) {
    const from = measure(win, area);
    start?.(from);
    setBox(win, from, mode === 'size');
    let g = { ...from };
    win.classList.add(mode === 'move' ? 'is-dragging' : 'is-sizing');
    const apply = () => {
      if (mode === 'move') { g = clamp(g, area); win.style.left = g.x + 'px'; win.style.top = g.y + 'px'; }
      else { g.w = Math.min(Math.max(min[0], g.w), area.clientWidth - g.x); g.h = Math.min(Math.max(min[1], g.h), area.clientHeight - g.y); setBox(win, g); }
    };
    const finish = keep => {
      document.removeEventListener('keydown', key, true);
      document.removeEventListener('pointerdown', click, true);
      win.classList.remove('is-dragging', 'is-sizing');
      if (!keep) { g = from; if (mode === 'move') { win.style.left = g.x + 'px'; win.style.top = g.y + 'px'; } else setBox(win, g); }
      end?.(measure(win, area));
    };
    const key = e => {
      const step = e.ctrlKey ? 1 : 8;
      const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (moves[e.key]) {
        const [dx, dy] = moves[e.key];
        if (mode === 'move') { g.x += dx; g.y += dy; } else { g.w += dx; g.h += dy; }
        apply();
      } else if (e.key === 'Enter') finish(true);
      else if (e.key === 'Escape') finish(false);
      else return;
      e.preventDefault(); e.stopPropagation();
    };
    const click = () => finish(true);
    document.addEventListener('keydown', key, true);
    setTimeout(() => document.addEventListener('pointerdown', click, true));
  }
  wm.keyboardTrack = keyboardTrack;

  // ------------------------------------------------------------------- menus
  let openMenu = null;
  function closePopup(refocus = false) {
    const menu = openMenu;
    if (!menu) return;
    openMenu = null;
    menu.el.remove();
    menu.anchor?.classList.remove('is-open');
    menu.onClose?.();
    if (refocus && menu.anchor?.isConnected) menu.anchor.focus({ preventScroll: true });
  }
  wm.closePopup = closePopup;
  wm.popupOpen = () => !!openMenu;

  // items: [{label:'&Open', key:'Enter', action, disabled, checked}, '-', ...]
  function popup(anchor, items, { above = false, onClose, onSide, focusFirst = false, at } = {}) {
    closePopup();
    const el = document.createElement('div');
    el.className = 'w31-menu'; el.setAttribute('role', 'menu'); el.tabIndex = -1;
    for (const item of items) {
      if (item === '-') { const hr = document.createElement('hr'); hr.setAttribute('role', 'separator'); el.append(hr); continue; }
      const b = document.createElement('button');
      const m = mnemonic(item.label);
      b.type = 'button';
      b.setAttribute('role', item.checked === undefined ? 'menuitem' : 'menuitemcheckbox');
      if (item.checked !== undefined) b.setAttribute('aria-checked', String(!!item.checked));
      b.innerHTML = '<span class="w31-check" aria-hidden="true"></span><span class="w31-label">' + m.html + '</span><span class="w31-key">' + esc(item.key || '') + '</span>';
      b.dataset.key = m.key;
      if (item.id) b.id = item.id;
      b.disabled = !!item.disabled;
      b.addEventListener('click', e => { e.stopPropagation(); closePopup(); item.action?.(); });
      el.append(b);
    }
    (shell || document.body).append(el);
    const r = at || anchor.getBoundingClientRect(), m = el.getBoundingClientRect();
    let left = r.left, top = above ? r.top - m.height : r.bottom;
    if (top + m.height > innerHeight) top = Math.max(0, r.top - m.height);
    if (top < 0) top = Math.min(r.bottom, innerHeight - m.height);
    left = Math.max(0, Math.min(left, innerWidth - m.width));
    el.style.left = left + 'px'; el.style.top = Math.max(0, top) + 'px';
    anchor?.classList.add('is-open');
    openMenu = { el, anchor, onClose };
    const enabled = () => [...el.querySelectorAll('button:not(:disabled)')];
    el.addEventListener('keydown', e => {
      const list = enabled(), i = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const d = e.key === 'ArrowDown' ? 1 : -1;
        list[i < 0 ? (d > 0 ? 0 : list.length - 1) : (i + d + list.length) % list.length]?.focus();
      } else if (e.key === 'Home') list[0]?.focus();
      else if (e.key === 'End') list.at(-1)?.focus();
      else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && onSide) onSide(e.key === 'ArrowRight' ? 1 : -1);
      else if (e.key === 'Escape' || e.key === 'Alt' || e.key === 'F10') closePopup(true);
      else if (e.key === 'Tab') closePopup(true);
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        const hit = list.find(b => b.dataset.key === e.key.toLowerCase());
        if (!hit) return;
        hit.click();
      } else return;
      e.preventDefault(); e.stopPropagation();
    });
    if (focusFirst) enabled()[0]?.focus({ preventScroll: true }); else el.focus({ preventScroll: true });
    return el;
  }
  wm.popup = popup;

  // A menu bar: [{label:'&File', id, items:()=>[...]}].
  function menubar(nav, menus) {
    nav.setAttribute('role', 'menubar');
    let current = -1, hovered = -1;
    const heads = menus.map((menu, i) => {
      const b = document.createElement('button');
      const m = mnemonic(menu.label);
      b.type = 'button'; b.className = 'w31-menuhead'; b.innerHTML = m.html; b.dataset.key = m.key;
      b.setAttribute('role', 'menuitem'); b.setAttribute('aria-haspopup', 'menu'); b.setAttribute('aria-expanded', 'false');
      if (menu.id) b.id = menu.id;
      // A click on the open menu's name closes it, unless the pointer has only just
      // slid onto that name from another open menu: then the click keeps it open.
      b.addEventListener('click', e => { if (current === i && hovered !== i) closePopup(); else if (current !== i) open(i, e.detail === 0); hovered = -1; });
      b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && current !== -1 && current !== i) { open(i, false); hovered = i; } });
      b.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') open(i, true);
        else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') heads[(i + (e.key === 'ArrowRight' ? 1 : -1) + heads.length) % heads.length].focus();
        else if (e.key === 'Escape' || e.key === 'Alt' || e.key === 'F10') { b.blur(); nav.dispatchEvent(new CustomEvent('menubar-leave', { bubbles: true })); }
        else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          const hit = heads.findIndex(h => h.dataset.key === e.key.toLowerCase());
          if (hit < 0) return;
          open(hit, true);
        } else return;
        e.preventDefault(); e.stopPropagation();
      });
      nav.append(b);
      return b;
    });
    function open(i, focusFirst) {
      popup(heads[i], menus[i].items(), {
        focusFirst,
        onClose: () => { heads[i].setAttribute('aria-expanded', 'false'); if (current === i) current = -1; },
        onSide: d => open((i + d + heads.length) % heads.length, true)
      });
      current = i; heads[i].setAttribute('aria-expanded', 'true');
    }
    return {
      heads,
      open,
      openKey(key) { const i = heads.findIndex(h => h.dataset.key === key); if (i < 0) return false; open(i, true); return true; },
      focus() { heads[0]?.focus({ preventScroll: true }); }
    };
  }
  wm.menubar = menubar;

  // ------------------------------------------------------- top-level windows
  function controlItems(rec) {
    const s = rec.state, o = rec.opts;
    const items = [
      { label: '&Restore', disabled: s === 'normal', action: () => restore(rec.id) },
      { label: '&Move', disabled: s !== 'normal', action: () => track(rec, 'move') },
      { label: '&Size', disabled: s !== 'normal' || !o.resizable, action: () => track(rec, 'size') },
      { label: 'Mi&nimise', disabled: s === 'min' || o.minimisable === false, action: () => minimise(rec.id) },
      { label: 'Ma&ximise', disabled: s === 'max' || !o.maximisable, action: () => maximise(rec.id) },
      '-',
      { label: '&Close', key: 'Alt+F4', action: () => close(rec.id) },
      '-',
      { label: 'S&witch To...', key: 'Ctrl+Esc', action: () => taskList() }
    ];
    return o.extraControlItems ? items.concat(o.extraControlItems()) : items;
  }
  function track(rec, mode) {
    keyboardTrack(rec.el, rec.area, mode, { min: rec.opts.minSize, end: g => { rec.geo = g; rec.opts.onGeometry?.(g); } });
  }
  function controlMenu(rec, anchor, above = false) {
    popup(anchor || rec.el.querySelector(':scope > .w31-caption .w31-sysbox'), controlItems(rec), { above, focusFirst: true });
  }
  wm.controlMenu = id => { const rec = tops.get(id); if (rec) controlMenu(rec, rec.state === 'min' ? rec.icon : null, rec.state === 'min'); };

  // The caption of a registered window: control-menu box, title, buttons.
  wm.caption = function ({ title, min = true, max = true, close = false, tag = 'header', className = '' }) {
    return '<' + tag + ' class="w31-caption ' + className + '"><button type="button" class="w31-sysbox" aria-label="Control menu" title="Control menu"></button><span class="w31-title">' + esc(title) + '</span>' +
      (min ? '<button type="button" class="w31-min" aria-label="Minimise" title="Minimise"></button>' : '') +
      (max ? '<button type="button" class="w31-max" aria-label="Maximise" title="Maximise"></button>' : '') +
      (close ? '<button type="button" id="dialog-close" aria-label="Close this window" title="Close">×</button>' : '') + '</' + tag + '>';
  };

  // opts: {id, title, icon (html), area, resizable, maximisable, minSize, defaultGeo(area),
  //        onClose (return false to keep open), focus(), iconId, state, centred}
  wm.register = function (el, opts) {
    let rec = tops.get(opts.id);
    const fresh = !rec;
    if (fresh) {
      rec = { id: opts.id, state: opts.state || 'normal', geo: null, prev: null };
      tops.set(opts.id, rec);
    } else rec.icon?.remove();
    Object.assign(rec, { el, opts, area: opts.area || el.parentElement });
    el.classList.add('w31-window');
    el.dataset.win = opts.id;
    const cap = el.querySelector(':scope > .w31-caption');
    const box = cap.querySelector('.w31-sysbox'), minB = cap.querySelector('.w31-min'), maxB = cap.querySelector('.w31-max');
    box.addEventListener('click', e => { e.stopPropagation(); if (openMenu?.anchor === box) closePopup(); else { activate(rec.id); controlMenu(rec); } });
    box.addEventListener('dblclick', e => { e.stopPropagation(); closePopup(); close(rec.id); });
    minB?.addEventListener('click', () => minimise(rec.id));
    maxB?.addEventListener('click', () => (rec.state === 'max' ? restore(rec.id) : maximise(rec.id)));
    cap.addEventListener('dblclick', e => { if (!e.target.closest('button') && opts.maximisable) (rec.state === 'max' ? restore(rec.id) : maximise(rec.id)); });
    const remember = g => { rec.geo = g; rec.opts.onGeometry?.(g); };
    draggable(el, cap, rec.area, { start: g => { if (!rec.geo) setBox(el, g, !!opts.resizable || !!rec.sized); }, end: remember });
    if (opts.resizable) resizable(el, rec.area, { min: opts.minSize, start: () => { rec.sized = true; }, end: remember });
    el.addEventListener('pointerdown', () => activate(rec.id), true);
    el.addEventListener('focusin', () => { if (activeId !== rec.id) activate(rec.id, false); });
    // The minimised icon on the desktop.
    const icon = document.createElement('button');
    icon.type = 'button'; icon.className = 'desk-icon'; icon.dataset.win = rec.id;
    if (opts.iconId) icon.id = opts.iconId;
    icon.innerHTML = '<span class="desk-icon-art" aria-hidden="true">' + (opts.icon || '') + '</span><span class="desk-icon-label">' + esc(opts.title) + '</span>';
    icon.setAttribute('aria-label', opts.title + ' (minimised)');
    let touchTap = false;
    icon.addEventListener('pointerdown', e => { touchTap = e.pointerType !== 'mouse'; });
    // One click shows the icon's control menu, a double-click restores it.
    icon.addEventListener('click', e => {
      if (e.detail === 0 || touchTap) { restore(rec.id); return; }
      activate(rec.id);
      if (openMenu?.anchor === icon) closePopup(); else controlMenu(rec, icon, true);
    });
    icon.addEventListener('dblclick', () => { closePopup(); restore(rec.id); });
    icon.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); restore(rec.id); } });
    rec.icon = icon;
    iconBar?.append(icon);
    if (!stack.includes(rec.id)) stack.push(rec.id);
    apply(rec);
    return rec;
  };

  function defaultGeo(rec) {
    const g = rec.opts.defaultGeo?.(rec.area);
    return g ? clamp(g, rec.area) : null;
  }
  function apply(rec) {
    const { el, state } = rec;
    el.hidden = state === 'min';
    rec.icon.hidden = state !== 'min';
    el.classList.toggle('is-max', state === 'max');
    const maxB = el.querySelector(':scope > .w31-caption .w31-max');
    if (maxB) {
      maxB.classList.toggle('is-restore', state === 'max');
      maxB.setAttribute('aria-label', state === 'max' ? 'Restore' : 'Maximise');
      maxB.title = state === 'max' ? 'Restore' : 'Maximise';
    }
    if (state === 'max') { for (const side of ['left', 'top', 'width', 'height']) el.style[side] = ''; }
    else if (state === 'normal') {
      if (!rec.geo) rec.geo = defaultGeo(rec);
      if (rec.geo && rec.area.clientWidth) setBox(el, clamp(rec.geo, rec.area), !!rec.opts.resizable || !!rec.sized);
      else if (rec.opts.centred !== false) centre(rec);
    }
    rec.opts.onState?.(state);
    arrangeIcons();
  }
  // New application windows open in the middle, each a little below and to the right of the last.
  function centre(rec) {
    const open = [...tops.values()].filter(r => r !== rec && r.el.classList.contains('is-centred') && r.state === 'normal').length;
    rec.el.classList.add('is-centred');
    rec.el.style.setProperty('--cascade', (open * 22) + 'px');
  }

  function activate(id, focus = true) {
    const rec = tops.get(id);
    if (!rec) return;
    if (dialogs.some(d => d.owner === rec.el)) return;
    activeId = id;
    rec.el.style.zIndex = ++layer;
    stack.splice(stack.indexOf(id), 1); stack.push(id);
    for (const r of tops.values()) {
      r.el.classList.toggle('is-active', r === rec);
      r.icon.classList.toggle('is-active', r === rec && r.state === 'min');
    }
    if (focus && rec.state !== 'min' && !rec.el.contains(document.activeElement)) rec.opts.focus ? rec.opts.focus() : (rec.el.querySelector('[autofocus],input,canvas[tabindex],.modal-body button,.modal-body a') || rec.el).focus?.({ preventScroll: true });
    rec.opts.onActivate?.();
  }
  function minimise(id) {
    const rec = tops.get(id);
    if (!rec || rec.state === 'min') return;
    closePopup();
    if (rec.state === 'max') rec.wasMax = true; else rec.wasMax = false;
    rec.state = 'min'; apply(rec);
    activeId = null;
    const next = [...stack].reverse().map(i => tops.get(i)).find(r => r && r.state !== 'min');
    if (next) activate(next.id); else { rec.icon.focus({ preventScroll: true }); activate(rec.id, false); }
  }
  function maximise(id) {
    const rec = tops.get(id);
    if (!rec || !rec.opts.maximisable) return;
    closePopup();
    if (rec.state === 'normal' && rec.el.isConnected && !rec.el.hidden) rec.geo = rec.el.classList.contains('is-centred') ? rec.geo : measure(rec.el, rec.area);
    rec.state = 'max'; apply(rec); activate(id);
  }
  function restore(id) {
    const rec = tops.get(id);
    if (!rec) return;
    closePopup();
    rec.state = rec.state === 'min' && rec.wasMax ? 'max' : 'normal';
    rec.wasMax = false;
    apply(rec); activate(id);
  }
  function close(id) {
    const rec = tops.get(id);
    if (!rec) return;
    closePopup();
    if (rec.opts.onClose && rec.opts.onClose() === false) return;
    remove(id);
  }
  function remove(id) {
    const rec = tops.get(id);
    if (!rec) return;
    tops.delete(id); stack.splice(stack.indexOf(id), 1);
    rec.el.remove(); rec.icon.remove();
    rec.opts.onRemoved?.();
    if (activeId === id) {
      activeId = null;
      const next = [...stack].reverse().map(i => tops.get(i)).find(r => r && r.state !== 'min');
      if (next) activate(next.id);
    }
    arrangeIcons();
  }
  Object.assign(wm, { activate, minimise, maximise, restore, close, remove });
  wm.get = id => tops.get(id);
  wm.active = () => activeId;
  wm.windows = () => stack.map(id => tops.get(id)).filter(Boolean);

  // Application windows (Calculator, Help, Sea Trial, the portfolio) open in the
  // desktop's window layer and sit beside Program Manager.
  wm.openApp = function ({ id, title, body, wide = false, icon = '', resizable = false, maximisable = false, minSize, className = '', onClose, menu = null, iconId }) {
    const existing = tops.get(id);
    if (existing) remove(id);
    const win = document.createElement('section');
    win.className = 'modal-window w31-app ' + (wide ? 'wide ' : '') + className;
    win.setAttribute('role', 'dialog'); win.setAttribute('aria-label', title);
    win.innerHTML = wm.caption({ title, min: true, max: maximisable, close: true, className: 'small-title' }) + (menu ? '<nav class="w31-menubar" aria-label="' + esc(title) + ' menus"></nav>' : '') + '<div class="modal-body">' + body + '</div>';
    appLayer.append(win);
    appLayer.hidden = false;
    win.querySelector('#dialog-close').addEventListener('click', () => close(id));
    const rec = wm.register(win, { id, title, icon, area: appLayer, resizable, maximisable, minSize, iconId, onClose });
    if (menu) rec.menubar = menubar(win.querySelector('.w31-menubar'), menu);
    activate(id);
    return win;
  };

  // ------------------------------------------------------------------ dialogs
  // A modal dialog box. buttons: [{label, value, default, cancel, disabled}].
  // onButton(value, form, dialog) may return false (or a promise of false) to keep it open.
  wm.dialog = function ({ title, body, buttons = [{ label: 'OK', value: 'ok', default: true }], owner = null, layout = 'bottom', className = '', onButton, init, closeOutside = false }) {
    return new Promise(resolve => {
      closePopup();
      const box = document.createElement('section');
      box.className = 'w31-window w31-dialog is-active is-centred ' + className + ' layout-' + layout;
      box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', title);
      box.innerHTML = '<header class="w31-caption"><button type="button" class="w31-sysbox" aria-label="Control menu" title="Control menu"></button><span class="w31-title">' + esc(title) + '</span></header>' +
        '<form class="w31-dialog-body"><div class="w31-dialog-main">' + body + '</div><div class="w31-buttons">' +
        buttons.map((b, i) => '<button type="button" data-i="' + i + '"' + (b.default ? ' class="is-default"' : '') + (b.disabled ? ' disabled' : '') + (b.id ? ' id="' + b.id + '"' : '') + '>' + mnemonic(b.label).html + '</button>').join('') + '</div></form>';
      appLayer.append(box);
      appLayer.hidden = false;
      box.style.zIndex = 5000 + dialogs.length;
      const form = box.querySelector('form');
      const prevFocus = document.activeElement;
      const entry = { box, owner };
      dialogs.push(entry);
      const inerted = [];
      for (const el of [owner, ...dialogs.slice(0, -1).map(d => d.box)]) if (el && !el.inert) { el.inert = true; inerted.push(el); }
      for (const r of tops.values()) r.el.classList.remove('is-active');
      let done = false;
      const values = () => {
        const out = {};
        for (const el of form.elements) {
          if (!el.name) continue;
          if (el.type === 'checkbox') out[el.name] = el.checked;
          else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
          else out[el.name] = el.value;
        }
        return out;
      };
      async function press(i) {
        if (done) return;
        const b = buttons[i];
        if (!b || b.disabled) return;
        const v = values();
        if (onButton) {
          const keep = await onButton(b.value, v, box);
          if (keep === false) return;
        }
        finish(b.value, v);
      }
      function finish(value, v = values()) {
        if (done) return;
        done = true;
        document.removeEventListener('pointerdown', outside, true);
        dialogs.splice(dialogs.indexOf(entry), 1);
        for (const el of inerted) el.inert = false;
        box.remove();
        const top = dialogs.at(-1);
        if (top) top.box.querySelector('.is-default,button')?.focus({ preventScroll: true });
        else if (activeId && tops.get(activeId)) activate(activeId, false);
        if (prevFocus?.isConnected && !prevFocus.closest('[inert]')) prevFocus.focus({ preventScroll: true });
        resolve({ button: value, values: v });
      }
      entry.cancel = () => { const c = buttons.findIndex(b => b.cancel); finish(c >= 0 ? buttons[c].value : 'cancel'); };
      box.addEventListener('click', e => { const b = e.target.closest('.w31-buttons button'); if (b) press(Number(b.dataset.i)); });
      form.addEventListener('submit', e => e.preventDefault());
      box.addEventListener('keydown', e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); entry.cancel(); return; }
        if (e.key === 'Enter' && !e.target.closest('textarea,select') && !(e.target.tagName === 'BUTTON' && !e.target.closest('.w31-buttons'))) {
          const focused = e.target.closest('.w31-buttons button');
          const d = focused ? Number(focused.dataset.i) : buttons.findIndex(b => b.default);
          if (d >= 0) { e.preventDefault(); e.stopPropagation(); press(d); }
          return;
        }
        if (e.key === 'Tab') {
          const list = [...box.querySelectorAll('button:not(:disabled),input:not(:disabled),select,textarea,[tabindex="0"]')].filter(el => el.offsetParent || el === document.activeElement);
          const i = list.indexOf(document.activeElement);
          const next = list[(i + (e.shiftKey ? -1 : 1) + list.length) % list.length];
          if (next) { e.preventDefault(); next.focus(); }
          return;
        }
        if (e.altKey && e.key.length === 1) {
          const key = e.key.toLowerCase();
          const hit = buttons.findIndex(b => mnemonic(b.label).key === key);
          if (hit >= 0) { e.preventDefault(); press(hit); return; }
          const label = [...box.querySelectorAll('label[data-key]')].find(l => l.dataset.key === key);
          if (label) { e.preventDefault(); (label.control || box.querySelector('#' + label.htmlFor))?.focus(); }
        }
      });
      const sys = box.querySelector('.w31-sysbox');
      sys.addEventListener('click', e => {
        e.stopPropagation();
        popup(sys, [{ label: '&Move', action: () => keyboardTrack(box, appLayer, 'move') }, { label: '&Close', key: 'Alt+F4', action: () => entry.cancel() }], { focusFirst: true });
      });
      sys.addEventListener('dblclick', () => { closePopup(); entry.cancel(); });
      draggable(box, box.querySelector('.w31-caption'), appLayer, { start: g => setBox(box, g, false) });
      const outside = e => { if (closeOutside && !box.contains(e.target) && !e.target.closest('.w31-menu')) entry.cancel(); };
      if (closeOutside) setTimeout(() => document.addEventListener('pointerdown', outside, true));
      init?.(box, { press, finish, values });
      const first = () => {
        if (done) return;
        (box.querySelector('[autofocus]') || box.querySelector('.w31-dialog-main input:not([type=hidden]):not(:disabled),.w31-dialog-main select,.w31-dialog-main [tabindex="0"]') || box.querySelector('.is-default') || box.querySelector('.w31-buttons button')).focus({ preventScroll: true });
      };
      first();
    });
  };
  wm.dialogOpen = () => dialogs.length > 0;
  wm.cancelDialogs = () => { while (dialogs.length) dialogs.at(-1).cancel(); };

  // A message box: icon is 'stop', 'exclaim', 'info' or 'question'.
  wm.message = function ({ title, text, icon = '', buttons = ['OK'], owner = null }) {
    const list = buttons.map((label, i) => ({ label, value: label.replace('&', '').toLowerCase(), default: i === 0, cancel: /cancel|no/i.test(label) || buttons.length === 1 }));
    return wm.dialog({
      title, owner, className: 'w31-message',
      body: (icon ? '<span class="w31-icon w31-icon-' + icon + '" aria-hidden="true">' + ({ stop: 'STOP', exclaim: '!', info: 'i', question: '?' })[icon] + '</span>' : '') + '<p>' + text + '</p>',
      buttons: list
    }).then(r => r.button);
  };

  // --------------------------------------------------------------- Task List
  // Double-click the desktop or press Ctrl+Esc. Lists the running programs.
  wm.extraTasks = () => [];
  function tasks() {
    const list = wm.windows().reverse().map(rec => ({ title: rec.opts.title, id: rec.id, switchTo: () => (rec.state === 'min' ? restore(rec.id) : activate(rec.id)), end: () => close(rec.id) }));
    return list.concat(wm.extraTasks());
  }
  function taskList() {
    if (document.querySelector('.w31-tasklist')) return;
    const list = tasks();
    let picked = 0;
    wm.dialog({
      title: 'Task List', className: 'w31-tasklist', closeOutside: true, owner: null,
      body: '<div class="w31-listbox" role="listbox" tabindex="0" aria-label="Running programs">' + list.map((t, i) => '<div role="option" data-i="' + i + '" aria-selected="' + (i === 0) + '">' + esc(t.title) + '</div>').join('') + '</div>',
      buttons: [
        { label: '&Switch To', value: 'switch', default: true }, { label: '&End Task', value: 'end' }, { label: 'Cancel', value: 'cancel', cancel: true },
        { label: '&Cascade', value: 'cascade' }, { label: '&Tile', value: 'tile' }, { label: '&Arrange Icons', value: 'arrange' }
      ],
      init(box, { press }) {
        const lb = box.querySelector('.w31-listbox');
        const pick = i => { picked = Math.max(0, Math.min(list.length - 1, i)); lb.querySelectorAll('[role=option]').forEach((o, j) => o.setAttribute('aria-selected', String(j === picked))); };
        lb.addEventListener('click', e => { const o = e.target.closest('[role=option]'); if (o) pick(Number(o.dataset.i)); });
        lb.addEventListener('dblclick', e => { if (e.target.closest('[role=option]')) press(0); });
        lb.addEventListener('keydown', e => {
          if (e.key === 'ArrowDown') pick(picked + 1); else if (e.key === 'ArrowUp') pick(picked - 1); else return;
          e.preventDefault();
        });
      }
    }).then(({ button }) => {
      const t = list[picked];
      if (button === 'switch' && t) t.switchTo();
      else if (button === 'end' && t) t.end();
      else if (button === 'cascade') cascade();
      else if (button === 'tile') tile();
      else if (button === 'arrange') arrangeIcons();
    });
  }
  wm.taskList = taskList;

  function arrangeable() {
    return wm.windows().filter(r => r.state !== 'min' && r.el.isConnected);
  }
  function cascade() {
    const list = arrangeable();
    list.forEach((rec, i) => {
      if (rec.state === 'max') rec.state = 'normal';
      const a = rec.area, step = 24 * i;
      const g = { x: step, y: step, w: rec.opts.resizable ? Math.max(rec.opts.minSize?.[0] || 200, a.clientWidth * 0.62) : measure(rec.el, a).w, h: rec.opts.resizable ? Math.max(rec.opts.minSize?.[1] || 120, a.clientHeight * 0.62) : null };
      if (!rec.opts.resizable) g.h = measure(rec.el, a).h;
      rec.geo = clamp(g, a); rec.sized = rec.opts.resizable;
      apply(rec); activate(rec.id, false);
      rec.opts.onGeometry?.(rec.geo);
    });
    if (list.length) activate(list.at(-1).id);
  }
  function tile() {
    const list = arrangeable();
    if (!list.length) return;
    const a = list[0].area, cols = Math.ceil(Math.sqrt(list.length)), rows = Math.ceil(list.length / cols);
    const cw = a.clientWidth / cols, ch = (a.clientHeight - (iconBar?.querySelector('.desk-icon:not([hidden])') ? 76 : 0)) / rows;
    list.forEach((rec, i) => {
      if (rec.state === 'max') rec.state = 'normal';
      const c = i % cols, r = Math.floor(i / cols);
      const m = measure(rec.el, rec.area);
      const g = rec.opts.resizable ? { x: c * cw, y: r * ch, w: cw, h: ch } : { x: c * cw, y: r * ch, w: m.w, h: m.h };
      rec.geo = clamp(g, rec.area); rec.sized = rec.opts.resizable;
      apply(rec);
      rec.opts.onGeometry?.(rec.geo);
    });
  }
  function arrangeIcons() {
    if (!iconBar) return;
    // Icons line up along the bottom of the desktop, left to right, in the order they were minimised.
    iconBar.hidden = !iconBar.querySelector('.desk-icon:not([hidden])');
  }
  Object.assign(wm, { cascade, tile, arrangeIcons });

  // -------------------------------------------------------- set-up and keys
  wm.init = function (shellEl, layerEl) {
    if (shell === shellEl) return;
    shell = shellEl; appLayer = layerEl;
    iconBar = document.createElement('div');
    iconBar.className = 'desk-icons'; iconBar.hidden = true;
    shell.append(iconBar);
    for (const rec of tops.values()) iconBar.append(rec.icon);
    // Double-clicking the desktop itself brings up the Task List.
    shell.addEventListener('dblclick', e => { if (e.target === shell || e.target === appLayer || e.target === iconBar || e.target.id === 'os-files') taskList(); });
  };
  wm.visible = () => !!shell && !shell.hidden && !shell.closest('[hidden],[inert]') && document.getElementById('dos-start')?.hidden !== false;

  document.addEventListener('pointerdown', e => {
    if (openMenu && !openMenu.el.contains(e.target) && !(openMenu.anchor && openMenu.anchor.contains(e.target))) closePopup();
  }, true);
  addEventListener('resize', () => {
    closePopup();
    for (const rec of tops.values()) if (rec.state === 'normal' && rec.geo && rec.el.isConnected && rec.area.clientWidth) setBox(rec.el, clamp(rec.geo, rec.area), !!rec.opts.resizable || !!rec.sized);
    wm.onResize?.();
  });

  let altAlone = false;
  document.addEventListener('keydown', e => {
    altAlone = e.key === 'Alt' && !e.repeat;
    if (!wm.visible()) return;
    const rec = tops.get(activeId);
    if (e.key === 'Escape' && e.ctrlKey) { e.preventDefault(); if (!dialogs.length) taskList(); return; }
    if (e.key === 'Escape' && !openMenu && !dialogs.length && rec && rec.id !== 'progman' && rec.state !== 'min' && !e.defaultPrevented) {
      if (!rec.el.contains(document.activeElement) && document.activeElement !== document.body) return;
      e.preventDefault(); close(rec.id); return;
    }
    if (dialogs.length) return;
    if (e.altKey && e.key === 'F4') { e.preventDefault(); if (rec) close(rec.id); return; }
    if (e.altKey && (e.code === 'Space' || e.key === ' ')) { e.preventDefault(); if (rec) controlMenu(rec, rec.state === 'min' ? rec.icon : null, rec.state === 'min'); return; }
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.length === 1 && rec?.menubar && rec.state !== 'min') {
      const key = e.code.startsWith('Key') ? e.code.slice(3).toLowerCase() : e.key.toLowerCase();
      if (rec.menubar.openKey(key)) { e.preventDefault(); return; }
    }
    wm.onKey?.(e, rec);
  });
  // Pressing and releasing Alt on its own moves to the menu bar, as in 3.1.
  document.addEventListener('keyup', e => {
    if (e.key !== 'Alt' || !altAlone || !wm.visible() || dialogs.length) return;
    altAlone = false;
    const rec = tops.get(activeId);
    if (openMenu) { closePopup(true); return; }
    if (rec?.menubar && rec.state !== 'min') { e.preventDefault(); rec.menubar.focus(); }
  });
  document.addEventListener('pointerdown', () => { altAlone = false; }, true);
})(globalThis.Hired);
