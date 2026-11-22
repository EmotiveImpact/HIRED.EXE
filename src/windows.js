(function (H) {
  'use strict';
  // Window behaviour for the Windows 3.11 style desktop: Program Manager can be
  // moved, minimised to a desktop icon and maximised; program groups open as
  // their own child windows; utility windows (Calculator and friends) can be
  // moved by their title bars. State lives here so it survives the desktop
  // being re-rendered each time the player returns from the game.
  const state = { pm: { min: false, max: false, x: null, y: null }, groups: {}, front: '' };
  const fine = () => matchMedia('(pointer:fine)').matches;
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
  function draggable(win, handle, area, { before, after } = {}) {
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.pointerType === 'touch' || !fine()) return;
      if (e.target.closest('button,a,input,summary,.pm-popup') || win.classList.contains('is-max')) return;
      e.preventDefault();
      const from = win.getBoundingClientRect(), box = area.getBoundingClientRect();
      const offsetX = e.clientX - from.left, offsetY = e.clientY - from.top;
      before?.(from);
      place(win, area, from.left - box.left, from.top - box.top);
      win.classList.add('is-dragging');
      handle.setPointerCapture(e.pointerId);
      const move = ev => {
        const now = area.getBoundingClientRect();
        place(win, area, ev.clientX - now.left - offsetX, ev.clientY - now.top - offsetY);
      };
      const end = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', end);
        handle.removeEventListener('pointercancel', end);
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
      if (floating) { pm.style.width = s.width ? s.width + 'px' : ''; [s.x, s.y] = place(pm, shell, s.x, s.y); }
      else for (const side of ['left', 'top', 'right', 'bottom', 'width']) pm.style[side] = '';
    }
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
      group.open = saved.open;
      const restorePlace = () => { if (saved.x !== null) [saved.x, saved.y] = place(child, workspace, saved.x, saved.y); };
      if (group.open) requestAnimationFrame(restorePlace);
      group.addEventListener('toggle', () => {
        saved.open = group.open;
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
  addEventListener('resize', () => {
    const current = document.querySelector('.program-manager.is-floating');
    if (current) [state.pm.x, state.pm.y] = place(current, current.closest('#os-shell') || current.parentElement, state.pm.x, state.pm.y);
  });

  // Utility windows (Calculator, Portfolio, About, Sea Trial) open in the
  // desktop dialog layer. Let the mouse move them by their title bars.
  H.desktopDialog = function (dialog) {
    const win = dialog.querySelector('.modal-window'), bar = win?.querySelector('.small-title');
    if (!bar || bar.dataset.draggable) return;
    bar.dataset.draggable = '1';
    draggable(win, bar, dialog, { before: from => { win.style.width = Math.round(from.width) + 'px'; win.classList.add('is-floating'); } });
  };
})(globalThis.Hired);
