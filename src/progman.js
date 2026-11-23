(function (H) {
  'use strict';
  // Program Manager, as it worked in Windows 3.1: program groups are child
  // windows inside it, with their own control-menu boxes, minimise and maximise
  // buttons; minimised groups sit as icons along its bottom edge; program items
  // are selected with one click and opened with a double-click or Enter; and the
  // File, Options, Window and Help menus carry the real commands. Item changes
  // last until the page is reloaded, so a visitor can never lose HIRE.EXE. Window
  // positions are kept by Options > Save Settings on Exit.
  const wm = H.wm, esc = wm.esc;
  const STORE = 'hired-exe:progman:v1';
  const CELL_W = 92, CELL_H = 78;
  const PM_ICON = '<span class="pm-icon-art"><i></i><i></i><i></i><i></i></span>';
  const APP_ICON = '<span class="pm-glyph pm-glyph-app" aria-hidden="true"></span>';
  const state = { groups: null, order: [], active: null, sel: {}, options: { autoArrange: true, minimiseOnUse: false, saveOnExit: true }, saved: null, uid: 1, pm: null };
  let cfg = null, root = null, pm = null, workspace = null, bar = null, menus = null, navigating = false, dragged = false;

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (_) { return null; }
  }
  function persist(snapshot) {
    try { localStorage.setItem(STORE, JSON.stringify(snapshot)); } catch (_) { /* Storage can be off. */ }
  }
  function snapshot() {
    const rec = wm.get('progman');
    const groups = {};
    for (const g of state.groups) groups[g.id] = { state: g.state, geo: g.geo };
    return { pm: rec ? { state: rec.state, geo: rec.geo } : state.pm, groups, active: state.active, options: { ...state.options } };
  }
  function applySnapshot(s) {
    if (!s) return;
    if (s.options) for (const k of Object.keys(state.options)) if (typeof s.options[k] === 'boolean') state.options[k] = s.options[k];
    for (const g of state.groups) {
      const saved = s.groups?.[g.id];
      if (!saved) continue;
      if (['normal', 'min', 'max'].includes(saved.state)) g.state = saved.state;
      if (saved.geo && ['x', 'y', 'w', 'h'].every(k => Number.isFinite(saved.geo[k]))) g.geo = saved.geo;
    }
    if (s.active && state.groups.some(g => g.id === s.active)) state.active = s.active;
    if (s.pm) state.pm = s.pm;
  }

  // ------------------------------------------------------------------ model
  function setup() {
    if (state.groups) {
      // A later edition can add an item the saved groups have never seen.
      for (const g of cfg.groups) {
        const group = state.groups.find(x => x.id === g.id);
        if (!group) continue;
        for (const ref of g.items) if (cfg.items[ref] && !state.groups.some(x => x.items.some(it => it.ref === ref))) group.items.push({ uid: 'u' + state.uid++, ref });
      }
      return;
    }
    state.groups = cfg.groups.map(g => ({ id: g.id, title: g.title, file: g.file, state: g.state || 'min', geo: null, items: g.items.filter(ref => cfg.items[ref]).map(ref => ({ uid: 'u' + state.uid++, ref })) }));
    state.active = cfg.groups[0].id;
    const saved = load();
    applySnapshot(saved);
    state.saved = JSON.parse(JSON.stringify(snapshot()));
  }
  const group = id => state.groups.find(g => g.id === id);
  const activeGroup = () => group(state.active);
  function describe(it) {
    const d = it.ref ? cfg.items[it.ref] : null;
    return {
      label: it.label ?? d?.label ?? 'Program',
      sub: it.label === undefined ? d?.sub : '',
      icon: d?.icon || APP_ICON,
      href: d?.href,
      linkAttrs: d?.linkAttrs || '',
      command: it.command ?? d?.command ?? '',
      workdir: it.workdir ?? d?.workdir ?? '',
      open: (!it.command || it.command === d?.command) ? d?.open : null
    };
  }
  function findItem(uid) {
    for (const g of state.groups) { const it = g.items.find(i => i.uid === uid); if (it) return { g, it }; }
    return null;
  }
  function selectedItem() {
    const g = activeGroup();
    if (!g || g.state === 'min') return null;
    const it = g.items.find(i => i.uid === state.sel[g.id]);
    return it ? { g, it } : null;
  }

  // ---------------------------------------------------------------- render
  H.progman = function (rootEl, config) {
    root = rootEl; cfg = config;
    setup();
    root.innerHTML = '';
    pm = document.createElement('section');
    pm.className = 'program-manager';
    pm.setAttribute('aria-label', 'Program Manager');
    pm.innerHTML = wm.caption({ title: 'Program Manager' }) +
      '<nav class="w31-menubar pm-menu" aria-label="Program Manager menus"><button type="button" class="w31-sysbox w31-child-box" hidden aria-label="Group control menu" title="Control menu"></button></nav>' +
      '<div class="pm-workspace"></div>';
    root.append(pm);
    workspace = pm.querySelector('.pm-workspace');
    const nav = pm.querySelector('nav');
    menus = wm.menubar(nav, [
      { label: '&File', id: 'pm-file', items: fileMenu },
      { label: '&Options', id: 'pm-options', items: optionsMenu },
      { label: '&Window', id: 'pm-window', items: windowMenu },
      { label: '&Help', id: 'pm-help', items: helpMenu }
    ]);
    nav.addEventListener('menubar-leave', () => focusSelection());
    const childRestore = document.createElement('button');
    childRestore.type = 'button'; childRestore.className = 'w31-max is-restore w31-child-restore'; childRestore.hidden = true;
    childRestore.setAttribute('aria-label', 'Restore group'); childRestore.title = 'Restore';
    nav.append(childRestore);
    childRestore.addEventListener('click', () => { const g = activeGroup(); if (g) setGroupState(g, 'normal'); });
    const childBox = nav.querySelector('.w31-child-box');
    childBox.addEventListener('click', e => { e.stopPropagation(); const g = activeGroup(); if (g) groupMenu(g, childBox); });
    childBox.addEventListener('dblclick', () => { wm.closePopup(); const g = activeGroup(); if (g) setGroupState(g, 'min'); });
    const saved = state.pm;
    const rec = wm.register(pm, {
      id: 'progman', title: 'Program Manager', icon: PM_ICON, iconId: 'pm-icon', area: root.closest('#os-shell') || root,
      resizable: true, maximisable: true, minSize: [240, 160], state: saved?.state,
      defaultGeo: area => saved?.geo || defaultPmGeo(area),
      onClose: () => { exitWindows(); return false; },
      focus: focusSelection,
      onState: () => requestAnimationFrame(layoutGroups),
      onGeometry: () => layoutGroups()
    });
    rec.menubar = menus;
    workspace.addEventListener('pointerdown', workspacePointer);
    workspace.addEventListener('click', workspaceClick);
    workspace.addEventListener('dblclick', workspaceDouble);
    workspace.addEventListener('focusin', e => { const item = e.target.closest('.pm-item'); if (item) select(item.closest('.pm-group-win').dataset.group, item.dataset.uid, false); });
    workspace.addEventListener('keydown', workspaceKey);
    renderGroups();
    wm.activate('progman');
    return pm;
  };
  H.progman.focus = () => focusSelection();

  function defaultPmGeo(area) {
    const W = area.clientWidth, Ht = area.clientHeight;
    if (W < 600) return { x: 4, y: 4, w: W - 8, h: Math.min(Ht - 8, Math.max(380, Ht * 0.72)) };
    const w = Math.min(780, W - 48), h = Math.min(Math.max(360, Ht * 0.6), Ht - 96, 520);
    return { x: (W - w) / 2, y: Math.max(12, Math.min(72, Ht * 0.07)), w, h };
  }
  function defaultGroupGeo(g, i) {
    const W = workspace.clientWidth || 600, Ht = workspace.clientHeight || 300;
    const n = Math.max(1, g.items.length), cols = Math.max(1, Math.min(n, 4, Math.floor((W - 30) / CELL_W)));
    const rows = Math.ceil(n / cols);
    const w = Math.min(W - 16, Math.max(210, cols * CELL_W + 24)), h = Math.min(Ht - 96, rows * CELL_H + 46);
    return { x: 8 + i * 22, y: 8 + i * 22, w, h: Math.max(110, h) };
  }

  function renderGroups() {
    const items = g => g.items.map((it, i) => {
      const d = describe(it);
      const first = it.ref && state.groups.flatMap(x => x.items).find(x => x.ref === it.ref) === it;
      const id = it.ref && first ? it.ref : 'item-' + it.uid;
      const tag = d.href ? 'a' : 'button';
      const attrs = d.href ? ' href="' + esc(d.href) + '" ' + d.linkAttrs : ' type="button"';
      const pos = !state.options.autoArrange ? ' style="left:' + (it.pos?.x ?? (i % 4) * CELL_W) + 'px;top:' + (it.pos?.y ?? Math.floor(i / 4) * CELL_H) + 'px"' : '';
      return '<' + tag + ' class="pm-item" id="' + id + '" data-uid="' + it.uid + '"' + attrs + pos + ' title="' + esc(d.label) + '"><span class="pm-icon" aria-hidden="true">' + d.icon + '</span><span class="pm-label"><strong>' + esc(d.label) + '</strong>' + (d.sub ? '<small>' + esc(d.sub) + '</small>' : '') + '</span></' + tag + '>';
    }).join('');
    workspace.innerHTML = state.groups.map(g =>
      '<section class="w31-child pm-group-win' + (g.id === state.active ? ' is-current' : '') + (g.id === 'main' ? ' pm-group' : '') + '" id="' + g.id + '-window" data-group="' + g.id + '" aria-label="' + esc(g.title) + '"' + (g.state === 'min' ? ' hidden' : '') + '>' +
        wm.caption({ title: g.title }) +
        '<div class="pm-items' + (state.options.autoArrange ? ' is-flow' : ' is-free') + '">' + items(g) + '</div></section>'
    ).join('') + '<div class="pm-icons">' + state.groups.map(g =>
      '<button type="button" class="pm-group-icon' + (g.id === state.active ? ' is-current' : '') + '" id="' + g.id + '-group" data-group="' + g.id + '"' + (g.state === 'min' ? '' : ' hidden') + ' aria-label="' + esc(g.title) + ' group (minimised)"><span class="pm-group-art" aria-hidden="true"></span><span class="pm-group-label">' + esc(g.title) + '</span></button>'
    ).join('') + '</div>';
    for (const win of workspace.querySelectorAll('.pm-group-win')) wireGroup(win);
    for (const icon of workspace.querySelectorAll('.pm-group-icon')) wireIcon(icon);
    markSelection();
    layoutGroups();
  }

  function wireGroup(win) {
    const g = group(win.dataset.group);
    const cap = win.querySelector('.w31-caption'), box = cap.querySelector('.w31-sysbox');
    box.addEventListener('click', e => { e.stopPropagation(); activateGroup(g.id); if (wm.popupOpen()) wm.closePopup(); else groupMenu(g, box); });
    box.addEventListener('dblclick', e => { e.stopPropagation(); wm.closePopup(); setGroupState(g, 'min'); });
    cap.querySelector('.w31-min').addEventListener('click', () => setGroupState(g, 'min'));
    cap.querySelector('.w31-max').addEventListener('click', () => setGroupState(g, g.state === 'max' ? 'normal' : 'max'));
    cap.addEventListener('dblclick', e => { if (!e.target.closest('button')) setGroupState(g, g.state === 'max' ? 'normal' : 'max'); });
    win.addEventListener('pointerdown', () => activateGroup(g.id, false));
    wm.draggable(win, cap, workspace, { end: geo => { g.geo = geo; } });
    wm.resizable(win, workspace, { min: [150, 90], end: geo => { g.geo = geo; reflowFree(g); } });
  }
  function wireIcon(icon) {
    const g = group(icon.dataset.group);
    let touchTap = false;
    icon.addEventListener('pointerdown', e => { touchTap = e.pointerType !== 'mouse'; });
    icon.addEventListener('click', e => {
      if (e.detail === 0 || touchTap) { setGroupState(g, 'normal'); return; }
      activateGroup(g.id, false);
      icon.focus({ preventScroll: true });
      if (wm.popupOpen()) wm.closePopup(); else groupMenu(g, icon, true);
    });
    icon.addEventListener('dblclick', () => { wm.closePopup(); setGroupState(g, 'normal'); });
    icon.addEventListener('focus', () => activateGroup(g.id, false));
  }

  // Place each group window where it was left, clamped to the workspace.
  function layoutGroups() {
    if (!workspace?.isConnected || !workspace.clientWidth) return;
    const max = state.groups.find(g => g.state === 'max');
    state.groups.forEach((g, i) => {
      const win = workspace.querySelector('#' + g.id + '-window');
      if (!win) return;
      win.hidden = g.state === 'min';
      win.classList.toggle('is-max', g.state === 'max');
      win.classList.toggle('is-current', g.id === state.active);
      const maxB = win.querySelector('.w31-max');
      maxB.classList.toggle('is-restore', g.state === 'max');
      maxB.setAttribute('aria-label', g.state === 'max' ? 'Restore' : 'Maximise');
      if (g.state === 'normal') {
        if (!g.geo) g.geo = defaultGroupGeo(g, state.groups.filter(x => x.state !== 'min').indexOf(g));
        wm.setBox(win, wm.clamp(g.geo, workspace));
      } else if (g.state === 'max') for (const side of ['left', 'top', 'right', 'bottom', 'width', 'height']) win.style[side] = '';
      workspace.querySelector('#' + g.id + '-group').hidden = g.state !== 'min';
      workspace.querySelector('#' + g.id + '-group').classList.toggle('is-current', g.id === state.active && g.state === 'min');
    });
    // A maximised group fills Program Manager and borrows its title and menu bar.
    pm.classList.toggle('has-max-child', !!max);
    pm.querySelector(':scope > .w31-caption .w31-title').textContent = max ? 'Program Manager - [' + max.title + ']' : 'Program Manager';
    pm.querySelector('.w31-child-box').hidden = !max;
    pm.querySelector('.w31-child-restore').hidden = !max;
    workspace.classList.toggle('has-icons', state.groups.some(g => g.state === 'min'));
  }
  H.progman.layout = () => layoutGroups();
  // Bring Program Manager forward and open one of its groups, as Window > 1, 2, 3 does.
  H.progman.openGroup = gid => {
    const g = group(gid);
    if (!g || !workspace) return false;
    if (wm.get('progman')?.state === 'min') wm.restore('progman'); else wm.activate('progman');
    if (g.state === 'min') setGroupState(g, 'normal'); else activateGroup(gid);
    return true;
  };
  wm.onResize = () => layoutGroups();

  function markSelection() {
    for (const el of workspace.querySelectorAll('.pm-item')) {
      const gid = el.closest('.pm-group-win').dataset.group;
      const on = state.sel[gid] === el.dataset.uid;
      el.classList.toggle('is-selected', on);
      el.setAttribute('aria-selected', String(on));
    }
  }
  function select(gid, uid, focus = true) {
    state.sel[gid] = uid;
    activateGroup(gid, false);
    markSelection();
    if (focus) workspace.querySelector('.pm-item[data-uid="' + uid + '"]')?.focus({ preventScroll: true });
  }
  function activateGroup(gid, focus = true) {
    const g = group(gid);
    if (!g) return;
    const max = state.groups.find(x => x.state === 'max');
    state.active = gid;
    // With one group maximised, the group you switch to is shown maximised too.
    if (max && max !== g && g.state !== 'min') { max.state = 'normal'; g.state = 'max'; }
    const win = workspace.querySelector('#' + gid + '-window');
    if (win && g.state !== 'min') win.style.zIndex = String(++zChild);
    layoutGroups();
    if (focus) focusSelection();
  }
  let zChild = 5;
  function focusSelection() {
    const g = activeGroup();
    if (!g || !workspace) { pm?.focus?.(); return; }
    if (g.state === 'min') { workspace.querySelector('#' + g.id + '-group')?.focus({ preventScroll: true }); return; }
    const uid = state.sel[g.id] || g.items[0]?.uid;
    if (uid && !state.sel[g.id]) { state.sel[g.id] = uid; markSelection(); }
    (workspace.querySelector('.pm-item[data-uid="' + uid + '"]') || workspace.querySelector('#' + g.id + '-window .w31-caption .w31-sysbox'))?.focus({ preventScroll: true });
  }
  function setGroupState(g, s) {
    wm.closePopup();
    if (s === 'max') for (const x of state.groups) if (x.state === 'max' && x !== g) x.state = 'normal';
    if (s === 'min' && g.state === 'normal') g.geo = wm.measure(workspace.querySelector('#' + g.id + '-window'), workspace);
    g.state = s;
    if (s === 'min') {
      // The next open group becomes active, or the icon itself.
      const next = state.groups.filter(x => x.state !== 'min').at(-1);
      layoutGroups();
      if (next) activateGroup(next.id); else { state.active = g.id; layoutGroups(); workspace.querySelector('#' + g.id + '-group').focus({ preventScroll: true }); }
      return;
    }
    activateGroup(g.id);
  }
  function groupMenu(g, anchor, above = false) {
    const s = g.state;
    wm.popup(anchor, [
      { label: '&Restore', disabled: s === 'normal', action: () => setGroupState(g, 'normal') },
      { label: '&Move', disabled: s !== 'normal', action: () => track(g, 'move') },
      { label: '&Size', disabled: s !== 'normal', action: () => track(g, 'size') },
      { label: 'Mi&nimise', disabled: s === 'min', action: () => setGroupState(g, 'min') },
      { label: 'Ma&ximise', disabled: s === 'max', action: () => setGroupState(g, 'max') },
      '-',
      { label: '&Close', key: 'Ctrl+F4', action: () => setGroupState(g, 'min') },
      '-',
      { label: 'Nex&t', key: 'Ctrl+F6', action: () => nextGroup(1) }
    ], { above, focusFirst: true });
  }
  function track(g, mode) {
    const win = workspace.querySelector('#' + g.id + '-window');
    wm.keyboardTrack(win, workspace, mode, { min: [150, 90], end: geo => { g.geo = geo; } });
  }
  function nextGroup(d) {
    const list = state.groups;
    const i = list.findIndex(g => g.id === state.active);
    const next = list[(i + d + list.length) % list.length];
    if (next) activateGroup(next.id);
  }

  // ---------------------------------------------------------------- items
  let pointer = null;
  function workspacePointer(e) {
    const item = e.target.closest('.pm-item');
    if (!item) return;
    const gid = item.closest('.pm-group-win').dataset.group;
    pointer = { touch: e.pointerType !== 'mouse', uid: item.dataset.uid };
    dragged = false;
    if (!pointer.touch) select(gid, item.dataset.uid, false);
    if (e.button !== 0 || e.pointerType === 'touch') return;
    dragItem(e, item, gid);
  }
  function workspaceClick(e) {
    const item = e.target.closest('.pm-item');
    if (!item) return;
    if (dragged) { e.preventDefault(); dragged = false; return; }
    if (item.tagName === 'A' && navigating) return;
    if (item.tagName === 'A') e.preventDefault();
    const gid = item.closest('.pm-group-win').dataset.group;
    if (e.detail === 0 || pointer?.touch) openItem(gid, item.dataset.uid);
    else select(gid, item.dataset.uid);
    pointer = null;
  }
  function workspaceDouble(e) {
    const item = e.target.closest('.pm-item');
    if (!item) return;
    e.preventDefault();
    openItem(item.closest('.pm-group-win').dataset.group, item.dataset.uid);
  }
  function openItem(gid, uid) {
    const found = findItem(uid);
    if (!found) return;
    const d = describe(found.it);
    const el = workspace.querySelector('.pm-item[data-uid="' + uid + '"]');
    if (state.options.minimiseOnUse) wm.minimise('progman');
    if (d.href && d.open === cfg.items[found.it.ref]?.open && el) {
      navigating = true;
      try { el.click(); } finally { navigating = false; }
      return;
    }
    if (d.open) d.open(); else runCommand(d.command);
  }

  // Drag an icon to another group to move it there; hold Ctrl to copy it.
  // Within its own group it takes a new place.
  function dragItem(e, item, gid) {
    const sx = e.clientX, sy = e.clientY, start = item.getBoundingClientRect();
    let ghost = null;
    const move = ev => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        ghost = document.createElement('div');
        ghost.className = 'pm-drag-ghost';
        ghost.innerHTML = item.querySelector('.pm-icon').outerHTML;
        document.body.append(ghost);
        item.classList.add('is-dragging');
      }
      ghost.style.left = (ev.clientX - (sx - start.left)) + 'px';
      ghost.style.top = (ev.clientY - (sy - start.top)) + 'px';
      const target = dropTarget(ev);
      document.body.classList.toggle('pm-no-drop', !target);
    };
    const up = ev => {
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('pointercancel', up, true);
      document.body.classList.remove('pm-no-drop');
      if (!ghost) return;
      ghost.remove(); item.classList.remove('is-dragging');
      dragged = true;
      setTimeout(() => { dragged = false; }, 0);
      const target = ev.type === 'pointerup' && dropTarget(ev);
      if (!target) return;
      const from = group(gid), to = group(target.gid), at = from.items.findIndex(i => i.uid === item.dataset.uid);
      const it = from.items[at];
      if (to === from) {
        if (state.options.autoArrange) {
          const list = from.items.filter(i => i !== it);
          let index = list.length;
          const box = target.el.querySelector('.pm-items');
          for (const [n, other] of list.entries()) {
            const r = box.querySelector('.pm-item[data-uid="' + other.uid + '"]').getBoundingClientRect();
            if (ev.clientY < r.bottom && (ev.clientX < r.left + r.width / 2 || ev.clientY < r.top)) { index = n; break; }
          }
          list.splice(index, 0, it);
          from.items = list;
        } else {
          const box = target.el.querySelector('.pm-items').getBoundingClientRect(), scroller = target.el.querySelector('.pm-items');
          it.pos = { x: Math.max(0, Math.round(ev.clientX - (sx - start.left) - box.left + scroller.scrollLeft)), y: Math.max(0, Math.round(ev.clientY - (sy - start.top) - box.top + scroller.scrollTop)) };
        }
      } else {
        const copy = ev.ctrlKey ? { ...it, uid: 'u' + state.uid++, pos: null } : it;
        if (!ev.ctrlKey) from.items.splice(at, 1);
        copy.pos = null;
        to.items.push(copy);
        state.sel[to.id] = copy.uid;
        if (to.state !== 'min') state.active = to.id;
      }
      renderGroups();
      focusSelection();
    };
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', up, true);
    document.addEventListener('pointercancel', up, true);
  }
  function dropTarget(ev) {
    const hit = document.elementFromPoint(ev.clientX, ev.clientY);
    const el = hit?.closest?.('.pm-group-win:not([hidden]), .pm-group-icon:not([hidden])');
    if (!el || !workspace.contains(el)) return null;
    return { el, gid: el.dataset.group };
  }
  function reflowFree() { /* Free-placed icons keep their places when a group is resized, as in 3.1. */ }

  // Arrow keys move between icons; typing a letter jumps to the next icon starting with it.
  function workspaceKey(e) {
    const item = e.target.closest('.pm-item');
    if (!item || e.altKey || e.ctrlKey || e.metaKey) return;
    const box = item.parentElement, list = [...box.querySelectorAll('.pm-item')];
    const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (dirs[e.key]) {
      const [dx, dy] = dirs[e.key], r = item.getBoundingClientRect();
      let best = null, bestScore = Infinity;
      for (const other of list) {
        if (other === item) continue;
        const o = other.getBoundingClientRect();
        const ox = o.left + o.width / 2 - (r.left + r.width / 2), oy = o.top + o.height / 2 - (r.top + r.height / 2);
        if ((dx && Math.sign(ox) !== dx) || (dy && Math.sign(oy) !== dy) || (dx && Math.abs(oy) > r.height) || (dy && Math.abs(ox) > r.width * 1.5 && Math.abs(oy) < 4)) continue;
        const score = dx ? Math.abs(ox) + Math.abs(oy) * 3 : Math.abs(oy) + Math.abs(ox) * 3;
        if (score < bestScore) { best = other; bestScore = score; }
      }
      if (!best && dx) best = list[list.indexOf(item) + dx];
      if (best) select(best.closest('.pm-group-win').dataset.group, best.dataset.uid);
      e.preventDefault();
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      const key = e.key.toLowerCase(), start = list.indexOf(item);
      for (let n = 1; n <= list.length; n++) {
        const other = list[(start + n) % list.length];
        if (other.querySelector('strong').textContent.trim().toLowerCase().startsWith(key)) { select(other.closest('.pm-group-win').dataset.group, other.dataset.uid); e.preventDefault(); break; }
      }
    }
  }

  // Program Manager's keyboard shortcuts, from the menus.
  wm.onKey = function (e, rec) {
    if (!rec || rec.id !== 'progman' || rec.state === 'min' || wm.popupOpen() || !pm.contains(document.activeElement) && document.activeElement !== document.body) return;
    if (e.target.closest('.w31-menubar')) return;
    const k = e.key;
    let act = null;
    if (k === 'Delete' && !e.altKey) act = deleteSelection;
    else if (k === 'F7') act = () => moveOrCopy('move');
    else if (k === 'F8') act = () => moveOrCopy('copy');
    else if (k === 'Enter' && e.altKey) act = properties;
    else if (k === 'F4' && e.shiftKey) act = tileGroups;
    else if (k === 'F5' && e.shiftKey) act = cascadeGroups;
    else if (k === 'F4' && e.ctrlKey) act = () => { const g = activeGroup(); if (g && g.state !== 'min') setGroupState(g, 'min'); };
    else if ((k === 'F6' || k === 'Tab') && e.ctrlKey) act = () => nextGroup(e.shiftKey ? -1 : 1);
    else if (k === '-' && e.altKey) act = () => { const g = activeGroup(); if (!g) return; const anchor = g.state === 'max' ? pm.querySelector('.w31-child-box') : g.state === 'min' ? workspace.querySelector('#' + g.id + '-group') : workspace.querySelector('#' + g.id + '-window .w31-sysbox'); groupMenu(g, anchor, g.state === 'min'); };
    else if (k === 'F1') act = () => cfg.hooks.help('contents');
    if (!act) return;
    e.preventDefault();
    act();
  };

  // ---------------------------------------------------------------- menus
  function fileMenu() {
    const sel = selectedItem(), g = activeGroup();
    const any = !!sel || (g && g.state === 'min');
    return [
      { label: '&New...', action: newObject },
      { label: '&Open', key: 'Enter', disabled: !any, action: () => { if (sel) openItem(sel.g.id, sel.it.uid); else if (g) setGroupState(g, 'normal'); } },
      { label: '&Move...', key: 'F7', disabled: !sel, action: () => moveOrCopy('move') },
      { label: '&Copy...', key: 'F8', disabled: !sel, action: () => moveOrCopy('copy') },
      { label: '&Delete', key: 'Del', disabled: !g, action: deleteSelection },
      { label: '&Properties...', key: 'Alt+Enter', disabled: !g, action: properties },
      '-',
      { label: '&Run...', action: run },
      '-',
      { label: 'E&xit Windows...', id: 'pm-exit', action: exitWindows }
    ];
  }
  function optionsMenu() {
    const o = state.options;
    const toggle = key => () => { o[key] = !o[key]; persistOptions(); if (key === 'autoArrange') toggleArrange(); };
    return [
      { label: '&Auto Arrange', checked: o.autoArrange, action: toggle('autoArrange') },
      { label: '&Minimise on Use', checked: o.minimiseOnUse, action: toggle('minimiseOnUse') },
      { label: '&Save Settings on Exit', checked: o.saveOnExit, action: toggle('saveOnExit') },
      '-',
      { label: '&Replay startup', id: 'pm-reboot', action: () => cfg.hooks.replayStartup() }
    ];
  }
  function persistOptions() {
    // The ticks themselves are written straight away; window positions wait for Exit Windows.
    const saved = load() || state.saved || {};
    saved.options = { ...state.options };
    if (state.saved) state.saved.options = { ...state.options };
    persist(saved);
  }
  function toggleArrange() {
    if (!state.options.autoArrange) {
      // Freeze every icon where it sits now.
      for (const g of state.groups) {
        const box = workspace.querySelector('#' + g.id + '-window .pm-items');
        if (!box || box.closest('[hidden]')) { g.items.forEach((it, i) => { it.pos = it.pos || { x: (i % 4) * CELL_W, y: Math.floor(i / 4) * CELL_H }; }); continue; }
        const b = box.getBoundingClientRect();
        for (const it of g.items) {
          const r = box.querySelector('.pm-item[data-uid="' + it.uid + '"]')?.getBoundingClientRect();
          if (r) it.pos = { x: Math.round(r.left - b.left + box.scrollLeft), y: Math.round(r.top - b.top + box.scrollTop) };
        }
      }
    } else for (const g of state.groups) for (const it of g.items) it.pos = null;
    renderGroups();
    focusSelection();
  }
  function windowMenu() {
    const list = [...state.groups].sort((a, b) => a.title.localeCompare(b.title));
    return [
      { label: '&Cascade', key: 'Shift+F5', action: cascadeGroups },
      { label: '&Tile', key: 'Shift+F4', action: tileGroups },
      { label: '&Arrange Icons', action: arrangeIcons },
      '-',
      ...list.map((g, i) => ({ label: '&' + (i + 1) + ' ' + g.title, checked: g.id === state.active, id: 'pm-window-' + g.id, action: () => { if (g.state === 'min') setGroupState(g, 'normal'); else activateGroup(g.id); } }))
    ];
  }
  function helpMenu() {
    return [
      { label: '&Contents', key: 'F1', id: 'pm-help-contents', action: () => cfg.hooks.help('contents') },
      { label: '&Search for Help On...', action: () => cfg.hooks.help('contents', 'search') },
      { label: '&How to Use Help', action: () => cfg.hooks.help('using-help') },
      '-',
      { label: '&About Program Manager...', id: 'pm-about', action: about }
    ];
  }

  function openGroups() { return state.groups.filter(g => g.state !== 'min'); }
  function cascadeGroups() {
    const list = openGroups();
    const W = workspace.clientWidth, Ht = workspace.clientHeight - (state.groups.some(g => g.state === 'min') ? 72 : 0);
    list.forEach((g, i) => { g.state = 'normal'; g.geo = { x: i * 24, y: i * 24, w: Math.max(170, W * 0.62), h: Math.max(110, Ht * 0.62) }; });
    layoutGroups();
    if (list.length) activateGroup((list.find(g => g.id === state.active) || list.at(-1)).id);
  }
  function tileGroups() {
    const list = openGroups();
    if (!list.length) return;
    const cols = Math.ceil(Math.sqrt(list.length)), rows = Math.ceil(list.length / cols);
    const W = workspace.clientWidth, Ht = workspace.clientHeight - (state.groups.some(g => g.state === 'min') ? 72 : 0);
    list.forEach((g, i) => { g.state = 'normal'; g.geo = { x: (i % cols) * W / cols, y: Math.floor(i / cols) * Ht / rows, w: W / cols, h: Ht / rows }; });
    layoutGroups();
  }
  function arrangeIcons() {
    const g = activeGroup();
    if (g && g.state !== 'min') for (const it of g.items) it.pos = null;
    if (g && !state.options.autoArrange && g.state !== 'min') g.items.forEach((it, i) => {
      const box = workspace.querySelector('#' + g.id + '-window .pm-items');
      const cols = Math.max(1, Math.floor((box?.clientWidth || 360) / CELL_W));
      it.pos = { x: (i % cols) * CELL_W, y: Math.floor(i / cols) * CELL_H };
    });
    renderGroups();
    focusSelection();
  }

  // ---------------------------------------------------------------- dialogs
  const field = (label, name, value = '', extra = '') => {
    const m = wm.mnemonic(label), id = 'pmf-' + name;
    return '<div class="w31-field"><label for="' + id + '" data-key="' + m.key + '">' + m.html + '</label><input id="' + id + '" name="' + name + '" value="' + esc(value) + '" spellcheck="false" autocomplete="off" ' + extra + '></div>';
  };
  const check = (label, name, on = false) => {
    const m = wm.mnemonic(label), id = 'pmf-' + name;
    return '<div class="w31-check-row"><input type="checkbox" id="' + id + '" name="' + name + '"' + (on ? ' checked' : '') + '><label for="' + id + '" data-key="' + m.key + '">' + m.html + '</label></div>';
  };
  const helpButton = { label: '&Help', value: 'help' };
  const helpFor = topic => value => { if (value === 'help') { cfg.hooks.help(topic); return false; } };

  function newObject() {
    const g = activeGroup();
    wm.dialog({
      title: 'New Program Object', owner: pm, layout: 'side',
      body: '<fieldset class="w31-group"><legend>New</legend><div class="w31-check-row"><input type="radio" name="kind" value="group" id="pmf-kind-group"><label for="pmf-kind-group" data-key="g">Program <u>G</u>roup</label></div><div class="w31-check-row"><input type="radio" name="kind" value="item" id="pmf-kind-item" checked><label for="pmf-kind-item" data-key="i">Program <u>I</u>tem</label></div></fieldset>',
      buttons: [{ label: 'OK', value: 'ok', default: true }, { label: 'Cancel', value: 'cancel', cancel: true }, helpButton],
      onButton: helpFor('organise')
    }).then(({ button, values }) => {
      if (button !== 'ok') return;
      if (values.kind === 'group') groupProperties(null);
      else itemProperties(null, g && g.state !== 'min' ? g : openGroups().at(-1) || g);
    });
  }
  function itemProperties(found, target) {
    const it = found?.it, d = it ? describe(it) : { label: '', command: '', workdir: '' };
    wm.dialog({
      title: 'Program Item Properties', owner: pm, layout: 'side', className: 'pm-properties',
      body: field('&Description:', 'label', d.label) + field('&Command Line:', 'command', d.command) + field('&Working Directory:', 'workdir', d.workdir) +
        field('Shortcut &Key:', 'shortcut', 'None', 'readonly') + '<div class="pm-prop-icon"><span class="pm-icon" aria-hidden="true">' + (it ? describe(it).icon : APP_ICON) + '</span>' + check('&Run Minimised', 'minimised') + '</div>',
      buttons: [{ label: 'OK', value: 'ok', default: true }, { label: 'Cancel', value: 'cancel', cancel: true }, { label: '&Browse...', value: 'browse', disabled: true }, { label: 'Change &Icon...', value: 'icon', disabled: true }, helpButton],
      onButton: async (value, v) => {
        if (value === 'help') { cfg.hooks.help('organise'); return false; }
        if (value === 'ok' && !v.command.trim()) {
          await wm.message({ title: 'Program Manager', text: 'The command line specified is not valid.', icon: 'exclaim' });
          return false;
        }
      }
    }).then(({ button, values }) => {
      if (button !== 'ok') return;
      const label = values.label.trim() || values.command.trim().split(/[\\/]/).pop().replace(/\.[^.]*$/, '').toUpperCase();
      if (it) {
        const base = it.ref ? cfg.items[it.ref] : null;
        it.label = base && label === base.label ? undefined : label;
        it.command = base && values.command.trim() === base.command ? undefined : values.command.trim();
        it.workdir = values.workdir;
        renderGroups(); select(found.g.id, it.uid);
      } else if (target) {
        const item = { uid: 'u' + state.uid++, ref: null, label, command: values.command.trim(), workdir: values.workdir };
        target.items.push(item);
        if (target.state === 'min') target.state = 'normal';
        renderGroups(); select(target.id, item.uid);
      }
    });
  }
  function groupProperties(g) {
    wm.dialog({
      title: 'Program Group Properties', owner: pm, layout: 'side',
      body: field('&Description:', 'title', g?.title || '') + field('&Group File:', 'file', g?.file || ''),
      buttons: [{ label: 'OK', value: 'ok', default: true }, { label: 'Cancel', value: 'cancel', cancel: true }, helpButton],
      onButton: helpFor('organise')
    }).then(({ button, values }) => {
      if (button !== 'ok') return;
      const title = values.title.trim() || (values.file.trim().replace(/\.grp$/i, '') || 'New Group');
      if (g) { g.title = title; g.file = values.file.trim() || g.file; renderGroups(); focusSelection(); return; }
      const id = 'group' + state.uid++;
      const created = { id, title, file: values.file.trim() || title.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase() + '.GRP', state: 'normal', geo: null, items: [] };
      state.groups.push(created);
      state.active = id;
      renderGroups();
      activateGroup(id);
    });
  }
  function properties() {
    const sel = selectedItem(), g = activeGroup();
    if (sel) itemProperties(sel);
    else if (g) groupProperties(g);
  }
  function moveOrCopy(kind) {
    const sel = selectedItem();
    if (!sel) return;
    const others = state.groups.filter(g => kind === 'copy' || g !== sel.g);
    if (!others.length) return;
    const verb = kind === 'move' ? 'Move' : 'Copy';
    wm.dialog({
      title: verb + ' Program Item', owner: pm, layout: 'side',
      body: '<p class="w31-static">' + verb + ' Program Item: <b>' + esc(describe(sel.it).label) + '</b></p><p class="w31-static">From Program Group: <b>' + esc(sel.g.title) + '</b></p>' +
        '<div class="w31-field"><label for="pmf-to" data-key="t"><u>T</u>o Group:</label><select id="pmf-to" name="to">' + others.map(g => '<option value="' + g.id + '">' + esc(g.title) + '</option>').join('') + '</select></div>',
      buttons: [{ label: 'OK', value: 'ok', default: true }, { label: 'Cancel', value: 'cancel', cancel: true }, helpButton],
      onButton: helpFor('organise')
    }).then(({ button, values }) => {
      if (button !== 'ok') return;
      const to = group(values.to);
      if (!to) return;
      const item = kind === 'copy' ? { ...sel.it, uid: 'u' + state.uid++, pos: null } : sel.it;
      if (kind === 'move') sel.g.items.splice(sel.g.items.indexOf(sel.it), 1);
      item.pos = null;
      to.items.push(item);
      state.sel[to.id] = item.uid;
      renderGroups();
      focusSelection();
    });
  }
  function deleteSelection() {
    const sel = selectedItem(), g = activeGroup();
    if (!g) return;
    const text = sel ? 'Are you sure you want to delete the item \'' + esc(describe(sel.it).label) + '\'?' : 'Are you sure you want to delete the group \'' + esc(g.title) + '\'?';
    wm.message({ title: 'Delete', text, icon: 'exclaim', buttons: ['&Yes', '&No'], owner: pm }).then(answer => {
      if (answer !== 'yes') return;
      if (sel) { sel.g.items.splice(sel.g.items.indexOf(sel.it), 1); delete state.sel[sel.g.id]; }
      else {
        state.groups.splice(state.groups.indexOf(g), 1);
        state.active = (state.groups.filter(x => x.state !== 'min').at(-1) || state.groups[0])?.id || null;
      }
      renderGroups();
      focusSelection();
    });
  }

  // File > Run, and the command lines inside program items.
  function runCommand(line, owner = pm) {
    const text = String(line || '').trim();
    const file = text.split(/\s+/)[0].split(/[\\/]/).pop().toLowerCase();
    const name = file.replace(/\.(exe|com|bat|pif)$/i, '');
    const exact = Object.values(cfg.items).find(d => d.command && d.command.toLowerCase() === text.toLowerCase());
    const known = exact || Object.values(cfg.items).find(d => (d.runs || []).includes(file) || (d.runs || []).includes(name));
    if (known?.open) { known.open(); return true; }
    if (name === 'progman') { wm.restore('progman'); return true; }
    if (name === 'winhelp') { cfg.hooks.help('contents'); return true; }
    if (name === 'taskman') { wm.taskList(); return true; }
    wm.message({ title: 'Program Manager', icon: 'stop', owner, text: 'Cannot find file \'' + esc(text.split(/\s+/)[0] || ' ') + '\' (or one of its components). Check to ensure the path and filename are correct and that all required libraries are available.' });
    return false;
  }
  H.progman.run = runCommand;
  function run() {
    wm.dialog({
      title: 'Run', owner: pm, layout: 'side',
      body: field('&Command Line:', 'command', '') + check('Run &Minimised', 'minimised'),
      buttons: [{ label: 'OK', value: 'ok', default: true }, { label: 'Cancel', value: 'cancel', cancel: true }, { label: '&Browse...', value: 'browse', disabled: true }, helpButton],
      onButton: async (value, v) => {
        if (value === 'help') { cfg.hooks.help('file-menu'); return false; }
        if (value === 'ok') {
          if (!v.command.trim()) return false;
          const file = v.command.trim().split(/\s+/)[0].split(/[\\/]/).pop().toLowerCase().replace(/\.(exe|com|bat|pif)$/i, '');
          const known = Object.values(cfg.items).some(d => (d.command && d.command.toLowerCase() === v.command.trim().toLowerCase()) || (d.runs || []).some(r => r.replace(/\.(exe|com|bat|pif)$/i, '') === file)) || ['progman', 'winhelp', 'taskman'].includes(file);
          if (!known) { runCommand(v.command, document.querySelector('.w31-dialog[aria-label="Run"]')); return false; }
        }
      }
    }).then(({ button, values }) => {
      if (button !== 'ok') return;
      if (state.options.minimiseOnUse) wm.minimise('progman');
      runCommand(values.command);
    });
  }

  function exitWindows() {
    if (document.querySelector('.w31-dialog[aria-label="Exit Windows"]')) return;
    wm.dialog({
      title: 'Exit Windows', owner: pm, className: 'w31-exit',
      body: '<p>This will end your Windows session.</p>',
      buttons: [{ label: 'OK', value: 'ok', default: true, id: 'exit-ok' }, { label: 'Cancel', value: 'cancel', cancel: true, id: 'exit-cancel' }]
    }).then(({ button }) => {
      if (button !== 'ok') return;
      // Save Settings on Exit keeps the layout for next time; without it, the
      // last saved layout comes back.
      if (state.options.saveOnExit) { state.saved = JSON.parse(JSON.stringify(snapshot())); persist(state.saved); }
      else {
        const keep = { ...state.options };
        applySnapshot(state.saved);
        Object.assign(state.options, keep);
        const rec = wm.get('progman');
        if (rec && state.saved?.pm) { rec.state = state.saved.pm.state || 'normal'; rec.geo = state.saved.pm.geo || null; }
      }
      cfg.hooks.exitWindows();
    });
  }
  H.progman.exitWindows = exitWindows;

  // Help > About for Program Manager, and for the accessories that share it.
  function about(product = 'Program Manager', owner = pm) {
    const flag = document.querySelector('.windows-brand svg');
    const art = flag ? '<svg class="about-flag" viewBox="330 78 350 285" aria-hidden="true">' + [...flag.querySelectorAll(':scope > polygon')].map(p => p.outerHTML).join('') + '</svg>' : '';
    const open = wm.windows().length + state.groups.filter(g => g.state !== 'min').length;
    wm.dialog({
      title: 'About ' + product, owner, className: 'w31-about',
      body: '<div class="about-head">' + art + '<div><p><b>Microsoft ' + (product === 'Program Manager' ? 'Windows</b><br><b>' : '') + esc(product) + '</b></p><p>Version 3.1<br>Copyright © 1985-1992 Microsoft Corp.</p></div></div>' +
        '<hr><p class="about-licence">This product is licensed to:<br><b>' + esc(cfg.licensee) + '</b><br><b>' + esc(cfg.organisation || '') + '</b></p><hr>' +
        '<dl class="about-stats"><dt>386 Enhanced Mode</dt><dd></dd><dt>Memory:</dt><dd>14,862 KB Free</dd><dt>System Resources:</dt><dd>' + Math.max(41, 84 - open * 3) + '% Free</dd></dl>',
      buttons: [{ label: 'OK', value: 'ok', default: true, id: 'about-ok' }]
    });
  }
  H.progman.about = about;
})(globalThis.Hired);
