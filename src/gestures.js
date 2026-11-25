// Accidental browser gestures. A swipe, a long press or a stray Ctrl+A meant for the game or
// the desktop must not reload the page, bounce it, zoom it, select it or raise a browser menu.
// Text meant to be read and copied (Notepad, Help, the email address, any text box) is left alone.
// The stylesheet does most of this; the listeners here cover what browsers ignore in CSS, chiefly
// Safari on iOS, which pulls to refresh whatever overscroll-behavior says.
(function () {
  'use strict';
  const TEXT = 'input, textarea, [contenteditable=""], [contenteditable="true"], .help-topic';
  const inText = target => !!(target instanceof Element ? target : target?.parentElement)?.closest(TEXT);
  const touchScreen = () => navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;

  // Can anything under the finger scroll the way the finger is going? If nothing can, the browser
  // would spend the swipe on pull-to-refresh or an edge bounce.
  function canPan(target, dx, dy) {
    const vertical = Math.abs(dy) >= Math.abs(dx), move = vertical ? dy : dx;
    const root = document.documentElement, rootFlow = getComputedStyle(root)[vertical ? 'overflowY' : 'overflowX'];
    for (let el = target instanceof Element ? target : target?.parentElement; el; el = el.parentElement) {
      const flow = el === root ? rootFlow : getComputedStyle(el)[vertical ? 'overflowY' : 'overflowX'];
      // The page itself scrolls unless it is locked; body only scrolls on its own when html does not.
      const scrolls = el === root ? flow !== 'hidden' && flow !== 'clip'
        : el === document.body && rootFlow === 'visible' ? false : /auto|scroll/.test(flow);
      if (!scrolls) continue;
      const at = vertical ? el.scrollTop : el.scrollLeft;
      const end = vertical ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
      if (end > 1 && (move > 0 ? at > 0 : at < end - 1)) return true;
    }
    return false;
  }

  let from = null, verdict = null;
  document.addEventListener('touchstart', e => {
    verdict = null;
    from = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true, capture: true });
  document.addEventListener('touchmove', e => {
    if (!e.cancelable) return;
    // Two fingers: a pinch. Nothing here zooms.
    if (e.touches.length > 1) { e.preventDefault(); return; }
    if (!from || e.target instanceof HTMLInputElement) return;
    if (verdict === null) {
      const dx = e.touches[0].clientX - from.x, dy = e.touches[0].clientY - from.y;
      // Hold the swipe until it has a direction, then decide once for the whole gesture.
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) { e.preventDefault(); return; }
      verdict = canPan(e.target, dx, dy);
    }
    if (!verdict) e.preventDefault();
  }, { passive: false, capture: true });

  // Safari's own pinch events, on phones and tablets only: a Mac trackpad keeps its zoom.
  for (const type of ['gesturestart', 'gesturechange'])
    document.addEventListener(type, e => { if (touchScreen()) e.preventDefault(); }, { passive: false });

  // The long-press menu (Open in new tab, Download image, Select all) on a touch screen.
  document.addEventListener('contextmenu', e => {
    const touch = e.pointerType ? e.pointerType !== 'mouse' : touchScreen();
    if (touch && !inText(e.target)) e.preventDefault();
  });

  // Nothing on the desktop or in the game is dragged out of the page as a picture or a link.
  document.addEventListener('dragstart', e => { if (!inText(e.target)) e.preventDefault(); });

  // Ctrl+A (Cmd+A on a Mac) selects all only inside text.
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'a' && !inText(e.target)) e.preventDefault();
  });
})();
