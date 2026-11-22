(function (H) {
  'use strict';
  // Window behaviour for the Windows 3.11 style desktop: Program Manager can be
  // moved, minimised to a desktop icon and maximised; program groups open as
  // their own child windows; utility windows (Calculator and friends) can be
  // moved by their title bars. State lives here so it survives the desktop
  // being re-rendered each time the player returns from the game.
  const state = { pm: { min: false, max: false, x: null, y: null }, groups: {}, front: '' };
  let layer = 10;

  function clamp(win, area, x, y) {
    const maxX = Math.max(0, area.clientWidth - win.offsetWidth);
    const maxY = Math.max(0, area.clientHeight - 28);
    return [Math.round(Math.min(Math.max(0, x), maxX)), Math.round(Math.min(Math.max(0, y), maxY))];
  }
  function place(win, area, x, y) {
    [x, y] = clamp(win, area, x, y);
    win.style.left = x + 'px'; win.style.top = y + 'px'; win.style.right = 'auto'; win.style.bottom = 'auto';
    return [x, y];
  }

  // Mouse and pen drag a window by its title bar. Touch keeps scrolling the page.
  // A plain click on the title bar leaves the window where it is: it only lifts
  // out of the layout once the pointer has moved a few pixels.
  function draggable(win, handle, area, { before, after } = {}) {
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.pointerType === 'touch') return;
      if (e.target.closest('button,a,input,summary,.pm-popup') || win.classList.contains('is-max')) return;
      e.preventDefault();
      const startX = e.clientX, startY = e.clientY;
      let offsetX = 0, offsetY = 0, moving = false;
      handle.setPointerCapture(e.pointerId);
      const move = ev => {
        if (!moving) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 4) return;
          const from = win.getBoundingClientRect(), box = area.getBoundingClientRect();
          offsetX = startX - from.left; offsetY = startY - from.top;
          before?.(from);
          place(win, area, from.left - box.left, from.top - box.top);
          win.classList.add('is-dragging');
          moving = true;
        }
        const now = area.getBoundingClientRect();
        place(win, area, ev.clientX - now.left - offsetX, ev.clientY - now.top - offsetY);
      };
      const end = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', end);
        handle.removeEventListener('pointercancel', end);
        if (!moving) return;
        win.classList.remove('is-dragging');
        after?.(parseFloat(win.style.left), parseFloat(win.style.top));
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
    });
  }

  function raise(win) { win.style.zIndex = ++layer; }

  H.desktopWindows = function (root) {
    const pm = root.querySelector('.program-manager');
    if (!pm) return;
    const shell = root.closest('#os-shell') || root;
    const workspace = pm.querySelector('.pm-workspace');
    const control = pm.querySelector('.pm-control');
    const minButton = pm.querySelector('.pm-min'), maxButton = pm.querySelector('.pm-max');

    const icon = document.createElement('button');
    icon.id = 'pm-icon'; icon.className = 'desk-min-icon'; icon.type = 'button';
    icon.title = 'Restore Program Manager';
    icon.innerHTML = '<span class="pm-icon-art" aria-hidden="true"><i></i><i></i><i></i><i></i></span>Program Manager';
    root.append(icon);

    function apply() {
      const s = state.pm;
      pm.hidden = s.min; icon.hidden = !s.min;
      pm.classList.toggle('is-max', s.max);
      maxButton.textContent = s.max ? '⬍' : '▲';
      maxButton.setAttribute('aria-label', (s.max ? 'Restore' : 'Maximise') + ' Program Manager');
      maxButton.title = s.max ? 'Restore' : 'Maximise';
      control.querySelector('[data-window="restore"]').disabled = !s.max && !s.min;
      control.querySelector('[data-window="max"]').disabled = s.max;
      const floating = !s.max && s.x !== null;
      pm.classList.toggle('is-floating', floating);
      if (floating) { pm.style.width = s.width ? s.width + 'px' : ''; place(pm, shell, s.x, s.y); }
      else for (const side of ['left', 'top', 'right', 'bottom', 'width']) pm.style[side] = '';
      placeChildren();
    }
    // Saved positions are where the player left each window; what is shown is
    // that position clamped to the current workspace, so a smaller layout
    // never pushes a window out of reach and a larger one gets it back.
    function placeChildren() {
      for (const group of pm.querySelectorAll('.pm-folders details[open]')) {
        const saved = state.groups[group.id];
        if (saved && saved.x !== null) place(group.querySelector('.pm-child'), workspace, saved.x, saved.y);
      }
    }
    H.desktopWindows.refresh = () => {
      if (!pm.isConnected || !pm.getClientRects().length) return;
      if (pm.classList.contains('is-floating')) place(pm, shell, state.pm.x, state.pm.y);
      placeChildren();
    };
    H.desktopWindows.raiseGroup = id => {
      const child = pm.querySelector('#' + id + ' .pm-child');
      if (child) { raise(child); state.front = id; }
    };
    function minimise() { state.pm.min = true; control.open = false; apply(); icon.focus({ preventScroll: true }); }
    function maximise(on = !state.pm.max) { state.pm.max = on; state.pm.min = false; control.open = false; apply(); }
    function restore() {
      if (state.pm.min) state.pm.min = false; else state.pm.max = false;
      control.open = false; apply();
      pm.querySelector('#start-game')?.focus({ preventScroll: true });
    }

    minButton.onclick = minimise;
    maxButton.onclick = () => maximise();
    icon.onclick = restore;
    pm.querySelector('.pm-caption').addEventListener('dblclick', e => { if (!e.target.closest('button,summary,.pm-popup')) maximise(); });
    control.querySelector('[data-window="restore"]').onclick = restore;
    control.querySelector('[data-window="min"]').onclick = minimise;
    control.querySelector('[data-window="max"]').onclick = () => maximise(true);
    control.querySelector('summary').onclick = e => { e.preventDefault(); control.open = !control.open; };
    control.addEventListener('keydown', e => { if (e.key === 'Escape' && control.open) { e.stopPropagation(); control.open = false; control.querySelector('summary').focus(); } });

    draggable(pm, pm.querySelector('.pm-caption'), shell, {
      before: from => { if (!pm.classList.contains('is-floating')) { pm.style.width = Math.round(from.width) + 'px'; pm.classList.add('is-floating'); } },
      after: (x, y) => { Object.assign(state.pm, { x, y, width: pm.offsetWidth }); }
    });

    // Program groups: each <details> keeps its icon in the bottom row and shows
    // its contents as a child window inside the workspace.
    for (const group of pm.querySelectorAll('.pm-folders details')) {
      const child = group.querySelector('.pm-child'), id = group.id;
      const saved = state.groups[id] || (state.groups[id] = { open: false, x: null, y: null });
      // Reopening a saved group fires one toggle event of its own; that one
      // puts the window back without changing which window is in front.
      let restoring = saved.open;
      group.open = saved.open;
      const restorePlace = () => { if (saved.x !== null) place(child, workspace, saved.x, saved.y); };
      if (group.open) requestAnimationFrame(restorePlace);
      group.addEventListener('toggle', () => {
        saved.open = group.open;
        if (restoring) { restoring = false; if (group.open) return; }
        if (group.open) { restorePlace(); raise(child); state.front = id; }
      });
      child.querySelector('.pm-child-min').onclick = () => { group.open = false; group.querySelector('summary').focus({ preventScroll: true }); };
      child.addEventListener('pointerdown', () => raise(child));
      draggable(child, child.querySelector('h3'), workspace, { after: (x, y) => Object.assign(saved, { x, y }) });
      if (group.open && state.front === id) raise(child);
    }
    const main = pm.querySelector('.pm-group');
    main.addEventListener('pointerdown', () => { raise(main); state.front = 'main'; });
    if (state.front === 'main') raise(main);

    apply();
  };

  // Listeners installed once for whichever desktop is currently rendered.
  document.addEventListener('pointerdown', e => {
    for (const menu of document.querySelectorAll('.pm-control[open]')) if (!menu.contains(e.target)) menu.open = false;
  });
  addEventListener('resize', () => H.desktopWindows.refresh?.());

  // Utility windows (Calculator, Portfolio, About, Sea Trial) open in the
  // desktop dialog layer. Let the mouse move them by their title bars.
  H.desktopDialog = function (dialog) {
    const win = dialog.querySelector('.modal-window'), bar = win?.querySelector('.small-title');
    if (!bar || bar.dataset.draggable) return;
    bar.dataset.draggable = '1';
    draggable(win, bar, dialog, { before: from => { win.style.width = Math.round(from.width) + 'px'; win.classList.add('is-floating'); } });
  };
})(globalThis.Hired);
