// Sea Trial: the submarine minigame behind "Submarine (final).exe".
// A 16-bit style side-scroller drawn at 320 x 180 and scaled with crisp pixels.
(function (H) {
  'use strict';
  const W = 320, VIEW = 180, SURFACE = 46, SEABED = 158;
  const SUB_X = 24, DEPTH_MIN = 50, DEPTH_MAX = 148, START_DEPTH = 86;
  const SPEED = 22, DIVE = 48, RISE = 37, FINISH = 600, BUOY = 670;
  const GATE_W = 14, GAP = 26, SHOT_SPEED = 190, COOLDOWN = 0.2, TARGET_POINTS = 250, DELIVERY_POINTS = 1000;
  const GATES = [{x:160,y:106},{x:275,y:78},{x:390,y:112},{x:520,y:84}];
  const MARKS = [{x:118,y:104},{x:236,y:124},{x:338,y:66},{x:458,y:130}];
  const C = {
    outline:'#251A43', deep:'#343064', lilac:'#B8ADF0', cyan:'#45DDFC', teal:'#17AFA8', darkTeal:'#0E7F86',
    gold:'#FFD35A', cream:'#FFF1CF', coral:'#FA5777', brickHi:'#F39A60', brick:'#BD594F', white:'#FFFFFF',
    steelHi:'#9C93D8', steelLt:'#7469C4', steel:'#5148A6', steelSh:'#3A3488', steelDk:'#2B2766'
  };
  const FONT = {
    A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[14,17,16,16,16,17,14],D:[30,17,17,17,17,17,30],
    E:[31,16,16,30,16,16,31],F:[31,16,16,30,16,16,16],G:[14,17,16,23,17,17,15],H:[17,17,17,31,17,17,17],
    I:[14,4,4,4,4,4,14],J:[7,2,2,2,2,18,12],K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],
    M:[17,27,21,21,17,17,17],N:[17,17,25,21,19,17,17],O:[14,17,17,17,17,17,14],P:[30,17,17,30,16,16,16],
    Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],
    U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,21,10],X:[17,17,10,4,10,17,17],
    Y:[17,17,10,4,4,4,4],Z:[31,1,2,4,8,16,31],
    0:[14,17,19,21,25,17,14],1:[4,12,4,4,4,4,14],2:[14,17,1,2,4,8,31],3:[31,2,4,2,1,17,14],
    4:[2,6,10,18,31,2,2],5:[31,16,30,1,1,17,14],6:[6,8,16,30,17,17,14],7:[31,1,2,4,8,8,8],
    8:[14,17,17,14,17,17,14],9:[14,17,17,15,1,2,12],
    '!':[4,4,4,4,4,0,4],'.':[0,0,0,0,0,12,12],'/':[1,2,2,4,8,8,16],'-':[0,0,0,14,0,0,0],'+':[0,4,4,31,4,4,0],
    ':':[0,12,12,0,12,12,0],' ':[0,0,0,0,0,0,0]
  };

  function surface(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function seeded(seed) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function disc(g, cx, cy, r, colour) {
    g.fillStyle = colour;
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
      if (Math.abs(dy) > r) continue;
      const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35);
      g.fillRect(Math.round(cx) - half, Math.round(cy) + dy, half * 2 + 1, 1);
    }
  }
  // Paints a sprite pixel by pixel, then wraps it in the plum outline used across the game.
  function paint(w, h, colourAt, outline = C.outline) {
    const c = surface(w + 2, h + 2), g = c.getContext('2d'), grid = [];
    for (let y = 0; y < h; y++) {
      grid[y] = [];
      for (let x = 0; x < w; x++) {
        const colour = colourAt(x, y); grid[y][x] = colour;
        if (colour) { g.fillStyle = colour; g.fillRect(x + 1, y + 1, 1, 1); }
      }
    }
    if (outline) {
      g.fillStyle = outline;
      for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
        if (grid[y]?.[x]) continue;
        if (grid[y - 1]?.[x] || grid[y + 1]?.[x] || grid[y]?.[x - 1] || grid[y]?.[x + 1]) g.fillRect(x + 1, y + 1, 1, 1);
      }
    }
    return c;
  }

  // ---- Sprites ----
  function subSprite(frame) {
    const cx = 19, cy = 13, rx = 14.5, ry = 5.6, holes = [[16,12],[23,12]];
    return paint(36, 20, (x, y) => {
      if (y === 0 && x >= 21 && x <= 23) return '#D7D3EE';
      if (y === 1 && x >= 21 && x <= 23) return '#8C86B8';
      if (y === 1 && x === 24) return C.cyan;
      if (y >= 2 && y <= 3 && (x === 21 || x === 22)) return x === 21 ? C.lilac : '#8C86B8';
      if (y >= 4 && y <= 8 && x >= 14 && x <= 23 && !((x === 14 || x === 23) && y === 4)) {
        if (y === 4 || x === 14) return '#FFE08A';
        if (x >= 22) return '#D9822F';
        if (y === 6 && x >= 16 && x <= 19) return '#C76E2B';
        return '#F2B33D';
      }
      if (x >= 33 && x <= 35 && (y === 12 || y === 13)) return y === 12 ? '#E9E6F7' : '#8C86B8';
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny > 1) {
        if ((y === 6 && x >= 6 && x <= 7) || (y === 7 && x >= 6 && x <= 9) || (y === 8 && x >= 6 && x <= 10)) return y === 6 ? '#3FD6CC' : C.teal;
        if ((y === 18 && x >= 6 && x <= 10) || (y === 19 && x >= 6 && x <= 8)) return C.darkTeal;
        if (x === 3 && y >= 12 && y <= 14) return '#8C86B8';
        if (frame === 0 && x === 2 && y >= 8 && y <= 18) return y < 13 ? '#F4F2FD' : C.lilac;
        if (frame === 1 && x === 2 && y >= 10 && y <= 16) return y < 13 ? '#F4F2FD' : C.lilac;
        if (frame === 2 && x >= 1 && x <= 2 && [9,10,16,17].includes(y)) return '#D7D3EE';
        return null;
      }
      for (const [hx, hy] of holes) {
        const d = Math.hypot(x - hx, y - hy);
        if (d <= 2.5) {
          if (d > 1.5) return '#514A7E';
          if (x === hx - 1 && y === hy - 1) return C.white;
          return x - hx + (y - hy) > 0 ? C.teal : C.cyan;
        }
      }
      if (y === 15) return C.teal;
      if (y === 16) return C.darkTeal;
      if (y === 9 && x >= 10 && x <= 25) return C.cream;
      if (y === 10 && x % 3 === 1 && x > 6 && x < 32) return '#D9822F';
      const light = -ny * 0.85 - nx * 0.2;
      if (light > 0.35) return '#FFE08A';
      if (light > -0.3) return '#F2B33D';
      if (light > -0.65) return '#D9822F';
      return '#9E4E2E';
    });
  }
  function targetSprite() {
    return paint(15, 15, (x, y) => {
      const d = Math.hypot(x - 7, y - 7);
      if (d > 7.3) return null;
      const lit = (x - 7) + (y - 7) < -2, shade = (x - 7) + (y - 7) > 3;
      if (d > 6.2) return lit ? '#E9E6F7' : shade ? '#6E6AA0' : '#B8ADF0';
      const ring = d <= 1.6 ? 0 : d <= 3.2 ? 1 : d <= 4.8 ? 0 : 1;
      if (ring === 0) return lit ? '#FF8FA3' : shade ? '#C23A5A' : C.coral;
      return lit ? C.white : shade ? '#E3CFA8' : C.cream;
    });
  }
  function buoySprite(lightOn) {
    return paint(14, 26, (x, y) => {
      if (y <= 2) { if (x >= 5 && x <= 8) return lightOn ? (y === 0 ? C.white : C.gold) : '#8E7A3A'; return null; }
      if (y <= 7) { if (x === 6 || x === 7) return x === 6 ? C.lilac : '#6E6AA0'; if ((x === 4 || x === 9) && y >= 5) return '#6E6AA0'; return null; }
      const half = Math.min(6.5, 2 + (y - 8) * 0.55);
      if (Math.abs(x + 0.5 - 7) > half) return null;
      const band = y >= 13 && y <= 15 ? 'white' : 'red';
      const left = x + 0.5 < 7 - half * 0.45, right = x + 0.5 > 7 + half * 0.5;
      if (band === 'white') return left ? C.white : right ? '#D8C9A6' : C.cream;
      return left ? '#FF8FA3' : right ? '#A8304C' : C.coral;
    });
  }
  const calculator = paint(9, 12, (x, y) => {
    if (y >= 1 && y <= 3 && x >= 1 && x <= 7) return y === 2 && x >= 3 && x <= 6 && x % 2 ? '#2F5A3A' : '#9BD46A';
    if (y >= 5 && y <= 10 && x >= 1 && x <= 7 && (x % 2 === 1) && (y % 2 === 1)) return x === 7 && y >= 7 ? C.coral : '#514A7E';
    return x === 0 || y === 0 ? '#F4F0E6' : x === 8 || y === 11 ? '#A7A0B8' : '#D9D3C7';
  });
  const bubbleSmall = paint(2, 2, (x, y) => x === 0 && y === 0 ? C.white : '#9FE6F2', null);
  const bubbleBig = paint(5, 5, (x, y) => { const d = Math.hypot(x - 2, y - 2); return d > 2.3 || d < 1.2 ? null : (x <= 1 && y <= 1 ? C.white : '#BFF4FF'); }, null);
  const fishSprites = [0, 1].map(f => paint(7, 4, (x, y) => {
    if (x === 0) return (f ? (y === 0 || y === 3) : (y === 1 || y === 2)) ? '#B0663E' : null;
    if (x === 1) return y >= 1 && y <= 2 ? '#B0663E' : null;
    if (x >= 2 && x <= 6 && y >= 0 && y <= 3 && !((x === 6 || x === 2) && (y === 0 || y === 3))) return x === 5 && y === 1 ? '#251A43' : y === 0 ? '#E9A06E' : y === 3 ? '#9B5636' : '#C9774F';
    return null;
  }, null));
  const SUBS = [0, 1, 2].map(subSprite), TARGET = targetSprite(), BUOYS = [buoySprite(true), buoySprite(false)];

  // ---- Pixel font ----
  const textCache = new Map();
  function text(str, scale = 1, colours = [C.cream], outline = C.outline, bold = scale > 1) {
    const key = [str, scale, colours.join(), outline, bold].join('|');
    if (textCache.has(key)) return textCache.get(key);
    const advance = 6 * scale, w = Math.max(1, str.length * advance), h = 7 * scale, cw = w + 2, ch = h + 4;
    const filled = new Uint8Array(cw * ch);
    [...str.toUpperCase()].forEach((ch, i) => (FONT[ch] || FONT[' ']).forEach((bits, row) => {
      for (let col = 0; col < 5; col++) if (bits & (16 >> col))
        for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale + (bold ? 1 : 0); sx++)
          filled[(1 + row * scale + sy) * cw + 1 + i * advance + col * scale + sx] = 1;
    }));
    const c = surface(cw, ch), g = c.getContext('2d'), edge = new Uint8Array(cw * ch);
    const on = (x, y) => x >= 0 && y >= 0 && x < cw && y < ch && filled[y * cw + x];
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      if (filled[y * cw + x]) { g.fillStyle = colours[Math.min(colours.length - 1, Math.floor((y - 1) / h * colours.length))]; g.fillRect(x, y, 1, 1); continue; }
      if (!outline) continue;
      for (let dy = -1; dy <= 1 && !edge[y * cw + x]; dy++) for (let dx = -1; dx <= 1; dx++) if (on(x + dx, y + dy)) { edge[y * cw + x] = 1; break; }
      if (edge[y * cw + x]) { g.fillStyle = outline; g.fillRect(x, y, 1, 1); }
    }
    if (outline && scale > 1) for (let y = 1; y < ch; y++) for (let x = 0; x < cw; x++)
      if (!filled[y * cw + x] && !edge[y * cw + x] && edge[(y - 1) * cw + x]) { g.fillStyle = C.deep; g.fillRect(x, y, 1, 1); }
    textCache.set(key, c);
    return c;
  }

  // ---- Background layers, rendered once ----
  function bands(w, h, colours) {
    const c = surface(w, h), g = c.getContext('2d'), size = h / colours.length;
    colours.forEach((colour, i) => { g.fillStyle = colour; g.fillRect(0, Math.floor(i * size), w, Math.ceil(size) + 1); });
    for (let i = 1; i < colours.length; i++) {
      const y = Math.floor(i * size); g.fillStyle = colours[i];
      for (let x = 0; x < w; x += 2) { g.fillRect(x + ((y - 1) & 1), y - 1, 1, 1); }
      g.fillStyle = colours[i - 1];
      for (let x = 0; x < w; x += 4) g.fillRect(x + (y & 1) * 2, y, 1, 1);
    }
    return c;
  }
  const SKY = bands(W, SURFACE, ['#2B3FA8','#3553C0','#4A6FD6','#6390E6','#82B2F0','#A6D3F7','#C9ECFB']);
  const SEA = bands(W, VIEW - SURFACE, ['#3BB4D0','#2C9FC4','#2588B4','#1F72A2','#1A5D8E','#164B79','#123B65','#0F2D52']);
  const CLOUDS = (() => {
    const c = surface(640, 30), g = c.getContext('2d'), rnd = seeded(7);
    for (const [x, y, s] of [[30,10,1],[180,6,1.3],[330,14,0.9],[470,8,1.2],[600,16,0.8]]) {
      for (let i = 0; i < 5; i++) { const r = (3 + rnd() * 4) * s; disc(g, x + i * 6 * s, y + rnd() * 3, r, '#F4F2FD'); }
      g.fillStyle = '#C7D7F5'; g.fillRect(x - 5 * s, y + 4 * s, 34 * s, 2);
    }
    return c;
  })();
  const CITY = (() => {
    const c = surface(640, 26), g = c.getContext('2d'), rnd = seeded(11); let x = 0;
    while (x < 640) {
      const w = Math.min(640 - x, 9 + Math.floor(rnd() * 16)), h = 7 + Math.floor(rnd() * 17);
      g.fillStyle = '#968DD3'; g.fillRect(x, 26 - h, w, h);
      g.fillStyle = C.lilac; g.fillRect(x, 26 - h, w, 1); g.fillRect(x, 26 - h, 1, h);
      g.fillStyle = C.cream;
      for (let wy = 26 - h + 3; wy < 25; wy += 3) for (let wx = x + 2; wx < x + w - 1; wx += 3) if (rnd() < 0.3) g.fillRect(wx, wy, 1, 1);
      if (rnd() < 0.3) { g.fillStyle = '#968DD3'; g.fillRect(x + (w >> 1), 26 - h - 4, 1, 4); }
      x += w + Math.floor(rnd() * 3);
    }
    return c;
  })();
  const HARBOUR = (() => {
    const c = surface(640, 40), g = c.getContext('2d'), rnd = seeded(23), base = '#5E54A8', hi = C.steelLt;
    for (let x = 0; x < 640; x += 46 + Math.floor(rnd() * 30)) {
      const w = 24 + Math.floor(rnd() * 18), h = 6 + Math.floor(rnd() * 5);
      g.fillStyle = base; g.fillRect(x, 40 - h, w, h); g.fillRect(x + 2, 39 - h, w - 4, 1);
      g.fillStyle = hi; g.fillRect(x + 2, 39 - h, w - 4, 1);
      for (let i = 0; i < 4; i++) { g.fillStyle = ['#8E5A7A','#3E7F9A','#B0954F','#6B4E8F'][Math.floor(rnd() * 4)]; g.fillRect(x + w + 2 + i * 5, 36 - (i % 2) * 3, 4, 3 + (i % 2) * 3); }
    }
    for (const cx of [70, 250, 430, 590]) {
      g.fillStyle = base;
      g.fillRect(cx, 8, 2, 32); g.fillRect(cx + 8, 8, 2, 32); g.fillRect(cx, 14, 10, 1); g.fillRect(cx, 24, 10, 1);
      g.fillRect(cx - 14, 6, 40, 2); g.fillRect(cx - 18, 4, 6, 5);
      g.fillStyle = hi; g.fillRect(cx - 14, 6, 40, 1); g.fillRect(cx, 8, 1, 32);
      g.fillStyle = base; g.fillRect(cx + 21, 8, 1, 10); g.fillRect(cx + 19, 18, 5, 2);
      g.fillStyle = C.coral; g.fillRect(cx + 25, 5, 1, 1);
    }
    return c;
  })();
  const ROCKS = (() => {
    const c = surface(480, 52), g = c.getContext('2d'), tau = Math.PI * 2;
    for (let x = 0; x < 480; x++) {
      const h = Math.round(18 + 9 * Math.sin(tau * x * 3 / 480) + 5 * Math.sin(tau * x * 7 / 480 + 1) + 2 * Math.sin(tau * x * 19 / 480 + 2));
      g.fillStyle = '#113A5E'; g.fillRect(x, 52 - h, 1, h);
      g.fillStyle = '#195279'; g.fillRect(x, 52 - h, 1, 1);
    }
    return c;
  })();
  const SEABED_TILE = (() => {
    const c = surface(160, VIEW - SEABED + 4), g = c.getContext('2d'), rnd = seeded(31), tau = Math.PI * 2;
    const rows = ['#F0D79A','#D9B877','#D9B877','#C29A5B','#C29A5B','#C29A5B','#A9834F','#A9834F','#8F6E45'];
    for (let x = 0; x < 160; x++) {
      const top = Math.round(3 + 1.6 * Math.sin(tau * x * 2 / 160) + Math.sin(tau * x * 5 / 160 + 1));
      for (let y = top; y < c.height; y++) { g.fillStyle = rows[Math.min(rows.length - 1, y - top)]; g.fillRect(x, y, 1, 1); }
      if (rnd() < 0.18) { g.fillStyle = rnd() < 0.5 ? '#8F6E45' : '#F0D79A'; g.fillRect(x, top + 3 + Math.floor(rnd() * 12), 2, 1); }
    }
    for (const [x, w, h] of [[22,12,6],[96,8,4],[132,15,7]]) {
      const rock = paint(w, h, (rx, ry) => { const nx = (rx + 0.5 - w / 2) / (w / 2), ny = (ry + 0.5 - h) / h; if (nx * nx + ny * ny > 1) return null; return ry < 2 && rx < w * 0.6 ? '#9C93D8' : rx > w * 0.65 ? '#4A4583' : '#6E6AA0'; });
      g.drawImage(rock, x, 4 - h + 3);
    }
    g.fillStyle = '#FFB3C1'; g.fillRect(60, 9, 2, 1); g.fillRect(61, 8, 1, 1); g.fillStyle = C.cream; g.fillRect(118, 12, 2, 1);
    return c;
  })();

  H.seaTrial = function (modal, delivered) {
    // The window is just the game: every control and instruction lives on the canvas.
    modal('Submarine (final).exe', '<canvas class="sea-view" tabindex="0" width="' + W + '" height="' + VIEW + '" aria-label="Sea Trial. Deliver one calculator to the buoy. Press Space or tap to start. Hold Space or the left half to dive. Press X or tap the right half to fire."></canvas><p role="status" id="sea-status" class="sea-status">Ready at the quay.</p>', true);
    const canvas = document.querySelector('.sea-view'), ctx = canvas.getContext('2d'), status = document.querySelector('#sea-status');
    const win = canvas.closest('.modal-window');
    win.classList.add('sea-window');
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches, touch = matchMedia('(pointer: coarse)').matches;
    ctx.imageSmoothingEnabled = false;
    let distance = 0, depth = START_DEPTH, running = false, previous = 0, clock = 0, phase = 'title', phaseTime = 0;
    let diveKey = false, fireKey = false, fireQueued = false, cooldown = 0, flash = 0, hits = 0, fired = 0, score = 0, shake = 0, hurt = 0, wakeTimer = 0;
    let targets = MARKS.map(t => ({...t, hit:false})), shots = [], effects = [], bubbles = [], pops = [];
    const divePointers = new Set(), firePointers = new Set();
    const diving = () => diveKey || divePointers.size > 0, firing = () => fireKey || firePointers.size > 0;
    const fish = Array.from({length: 7}, (_, i) => ({x: 40 + i * 47, y: 78 + (i * 23) % 50, speed: 6 + (i % 3) * 3}));
    canvas.seaState = () => ({distance, depth, running, hits, score, phase, shots: shots.length});

    const at = (img, x, y) => ctx.drawImage(img, Math.round(x), Math.round(y));
    function rect(x, y, w, h, colour) { ctx.fillStyle = colour; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
    function tile(img, offset, y) { const w = img.width, x0 = -(((offset % w) + w) % w); for (let x = x0; x < W; x += w) at(img, x, y); }
    function targetY(t) { return t.y + Math.round(Math.sin(clock * 2.4 + t.x) * 2); }
    function blocked(x, y) { return GATES.some(g => x >= g.x && x <= g.x + GATE_W && (y < g.y - GAP || y > g.y + GAP)); }
    function centreText(img, y) { at(img, (W - img.width) / 2, y); }
    function setPhase(next) { phase = next; phaseTime = 0; }

    function explode(x, y, big) {
      effects.push({kind:'blast', x, y, t:0, life: big ? 0.6 : 0.42, size: big ? 14 : 9});
      for (let i = 0; i < (big ? 12 : 8); i++) {
        const a = i / (big ? 12 : 8) * Math.PI * 2 + Math.random() * 0.4, v = 30 + Math.random() * 40;
        effects.push({kind:'debris', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, t:0, life: 0.7 + Math.random() * 0.4, colour: [C.coral, C.cream, C.gold, '#6E6AA0'][i % 4]});
      }
      for (let i = 0; i < (big ? 14 : 9); i++) bubbles.push({x: x + (Math.random() - 0.5) * 12, y: y + (Math.random() - 0.5) * 10, vy: -20 - Math.random() * 30, big: Math.random() < 0.4, wobble: Math.random() * 6, world: true});
      if (!calm) shake = big ? 0.35 : 0.18;
    }
    function spark(x, y) {
      effects.push({kind:'spark', x, y, t:0, life:0.18});
      bubbles.push({x, y, vy:-25, big:false, wobble:1, world:true});
    }

    function releaseControls() { diveKey = false; fireKey = false; fireQueued = false; divePointers.clear(); firePointers.clear(); }
    function stop(message) { running = false; releaseControls(); shots = []; status.textContent = message; }
    function shoot() {
      shots.push({x: distance + SUB_X + 37, y: Math.round(depth)});
      cooldown = COOLDOWN; flash = 0.07; fireQueued = false; canvas.dataset.shots = ++fired;
    }
    function updateShots(dt) {
      for (const s of shots) {
        const from = s.x; s.x += SHOT_SPEED * dt;
        if (Math.random() < 0.15) bubbles.push({x: s.x - 6, y: s.y + (Math.random() - 0.5) * 3, vy: -8, big: false, wobble: 0.5, world: true, life: 0.5});
        for (let x = from; x <= s.x && !s.done; x += 2) {
          if (blocked(x + 6, s.y)) { s.done = true; spark(x + 6, s.y); break; }
          for (const t of targets) {
            if (t.hit) continue;
            const ty = targetY(t);
            if (Math.abs(x + 6 - t.x) <= 7 && Math.abs(s.y - ty) <= 7) {
              t.hit = true; s.done = true; hits++; score += TARGET_POINTS; canvas.dataset.hits = hits;
              explode(t.x, ty, false);
              pops.push({x: t.x, y: ty - 10, t: 0, label: '+' + TARGET_POINTS});
              status.textContent = 'Target hit. ' + hits + ' of ' + targets.length + '.';
              break;
            }
          }
        }
        if (s.x - distance > W + 12) s.done = true;
      }
      shots = shots.filter(s => !s.done);
    }
    function update(dt) {
      distance = Math.min(FINISH, distance + SPEED * dt);
      depth = Math.max(DEPTH_MIN, Math.min(DEPTH_MAX, depth + (diving() ? DIVE : -RISE) * dt));
      cooldown = Math.max(0, cooldown - dt);
      if ((fireQueued || firing()) && cooldown === 0) shoot();
      wakeTimer -= dt;
      if (wakeTimer <= 0 && depth > DEPTH_MIN + 2) { wakeTimer = 0.1; bubbles.push({x: distance + SUB_X + 1, y: depth - 2 + Math.random() * 6, vy: -12 - Math.random() * 10, big: Math.random() < 0.25, wobble: Math.random() * 3, world: true, life: 1.1}); }
      updateShots(dt);
      const top = depth - 9, bottom = depth + 5;
      const gate = GATES.find(g => g.x - distance < SUB_X + 36 && g.x + GATE_W - distance > SUB_X + 5 && (top < g.y - GAP || bottom > g.y + GAP));
      if (gate) {
        explode(distance + SUB_X + 34, top < gate.y - GAP ? top + 2 : bottom - 2, true);
        hurt = 0.5; setPhase('crash');
        stop('Clipped a harbour gate. Have another go.');
        return;
      }
      if (distance >= FINISH) {
        if (depth <= DEPTH_MIN + 3) {
          score += DELIVERY_POINTS; setPhase('win'); delivered();
          stop('Delivery complete. One pocket calculator. Targets hit: ' + hits + ' of ' + targets.length + '.');
        } else status.textContent = 'Release Dive to surface beside the buoy.';
      }
    }
    function updateWorld(dt) {
      phaseTime += dt; flash = Math.max(0, flash - dt); shake = Math.max(0, shake - dt); hurt = Math.max(0, hurt - dt);
      for (const e of effects) { e.t += dt; if (e.kind === 'debris') { e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= 0.94; e.vy += 40 * dt; } }
      effects = effects.filter(e => e.t < e.life);
      for (const b of bubbles) { b.y += b.vy * dt; b.age = (b.age || 0) + dt; }
      bubbles = bubbles.filter(b => b.y > SURFACE + 1 && b.age < (b.life || 2.5));
      for (const p of pops) p.t += dt;
      pops = pops.filter(p => p.t < 0.9);
      for (const f of fish) { f.x -= (f.speed + (running ? SPEED * 0.4 : 0)) * dt; if (f.x < -10) { f.x = W + 10 + Math.random() * 40; f.y = 74 + Math.random() * 60; } }
      if (Math.random() < dt * 1.5) bubbles.push({x: distance + 30 + Math.random() * 300, y: SEABED + 2, vy: -14 - Math.random() * 8, big: Math.random() < 0.3, wobble: Math.random() * 5, world: true, life: 6});
    }

    function drawScenery() {
      at(SKY, 0, 0);
      tile(CLOUDS, distance * 0.05 + clock * 2, 4);
      tile(CITY, distance * 0.12, SURFACE - 26);
      tile(HARBOUR, distance * 0.3, SURFACE - 40);
      at(SEA, 0, SURFACE);
      ctx.globalAlpha = 0.09; ctx.fillStyle = '#DFFBFF';
      for (let i = 0; i < 4; i++) {
        const base = ((i * 97 - distance * 0.2 + Math.sin(clock * 0.5 + i) * 10) % 380 + 380) % 380 - 40;
        for (let y = SURFACE + 2; y < 140; y += 2) ctx.fillRect(Math.round(base + (y - SURFACE) * 0.45), y, 12 + (i % 2) * 6, 2);
      }
      ctx.globalAlpha = 1;
      tile(ROCKS, distance * 0.35, VIEW - 52);
      for (let i = -1; i < 7; i++) {
        const span = 64, x0 = i * span - ((distance * 0.6) % span) + 20, h = 26 + ((i + Math.floor(distance * 0.6 / span)) * 13 % 4) * 7;
        for (let s = 0; s < h; s += 3) {
          const sway = Math.round(Math.sin(clock * 1.4 + s * 0.12 + i) * s * 0.12);
          rect(x0 + sway, VIEW - 18 - s, 2, 3, s % 6 ? '#1D6A68' : '#277F74');
          if (s % 9 === 0 && s) rect(x0 + sway + (s % 18 ? 2 : -2), VIEW - 18 - s, 2, 1, '#2A8F7E');
        }
      }
      for (const f of fish) at(fishSprites[Math.floor(clock * 4 + f.x) & 1], f.x, f.y);
    }
    function drawBubbles() {
      for (const b of bubbles) {
        const x = (b.world ? b.x - distance : b.x) + Math.sin(b.age * 6 + b.wobble) * 1.2;
        at(b.big ? bubbleBig : bubbleSmall, x - (b.big ? 3 : 1), b.y - 1);
      }
    }
    function drawSeabed() {
      tile(SEABED_TILE, distance, SEABED - 3);
      for (let i = -1; i < 9; i++) {
        const span = 47, wx = Math.floor(distance / span) * span + i * span, x = wx - distance;
        for (let b = 0; b < 3; b++) {
          const lean = Math.round(Math.sin(clock * 2 + wx * 0.1 + b) * 1.5);
          for (let s = 0; s < 7 + b * 2; s++) rect(x + b * 3 + (s > 3 ? lean : 0), SEABED + 2 - s, 1, 1, s > 5 ? '#7FE08C' : '#3FAE6A');
        }
      }
    }
    function drawTargets() {
      for (const t of targets) {
        if (t.hit) continue;
        const x = t.x - distance, y = targetY(t);
        if (x < -10 || x > W + 10) continue;
        for (let cy = y + 8; cy < SEABED + 2; cy += 3) rect(x, cy, 1, 2, cy % 2 ? '#8C86B8' : '#5E5A8C');
        rect(x - 3, SEABED, 7, 3, '#4A4583'); rect(x - 3, SEABED, 7, 1, '#6E6AA0');
        at(TARGET, x - 8, y - 8);
      }
    }
    function drawGates() {
      const cols = [C.outline, C.steelHi, C.steelLt, C.steelLt, C.steel, C.steel, C.steel, C.steel, C.steel, C.steel, C.steelSh, C.steelSh, C.steelDk, C.outline];
      function column(x, y0, y1) { cols.forEach((colour, i) => rect(x + i, y0, 1, y1 - y0, colour)); for (let y = y0 + 4; y < y1 - 2; y += 8) { rect(x + 3, y, 1, 1, C.lilac); rect(x + 10, y, 1, 1, C.lilac); rect(x + 3, y + 1, 1, 1, C.steelDk); rect(x + 10, y + 1, 1, 1, C.steelDk); } }
      function lip(x, y) {
        rect(x - 2, y - 1, GATE_W + 4, 7, C.outline);
        for (let i = 0; i < GATE_W + 2; i++) rect(x - 1 + i, y, 1, 5, ((i + Math.floor(y)) >> 1) % 2 ? C.gold : '#3A3049');
        rect(x - 1, y, GATE_W + 2, 1, '#FFE89A');
      }
      for (const g of GATES) {
        const x = g.x - distance;
        if (x < -24 || x > W + 24) continue;
        column(x, 26, g.y - GAP);
        rect(x - 3, 22, GATE_W + 6, 5, C.outline); rect(x - 2, 23, GATE_W + 4, 3, C.lilac); rect(x - 2, 25, GATE_W + 4, 1, '#8C86B8');
        const lamp = Math.floor(clock * 2 + g.x) % 2 === 0;
        rect(x + 5, 18, 4, 4, C.outline); rect(x + 6, 19, 2, 2, lamp ? C.coral : '#7A2E46');
        if (lamp) { ctx.globalAlpha = 0.35; disc(ctx, x + 7, 20, 4, C.coral); ctx.globalAlpha = 1; }
        lip(x, g.y - GAP - 5);
        column(x, g.y + GAP, VIEW);
        lip(x, g.y + GAP);
        rect(x - 3, SEABED + 4, GATE_W + 6, VIEW - SEABED, '#6E6AA0'); rect(x - 3, SEABED + 4, GATE_W + 6, 1, '#9C93D8');
        const glow = 0.5 + Math.sin(clock * 5 + g.x) * 0.5;
        ctx.globalAlpha = 0.25 + glow * 0.35;
        rect(x + GATE_W - 1, g.y - GAP + 1, 2, 2, C.cyan); rect(x + GATE_W - 1, g.y + GAP - 3, 2, 2, C.cyan);
        ctx.globalAlpha = 1;
      }
    }
    function drawBuoy() {
      const x = BUOY - distance; if (x < -20 || x > W + 20) return;
      at(BUOYS[Math.floor(clock * 2) % 2], x - 8, SURFACE - 18 + Math.round(Math.sin(clock * 2.2) * 1.2));
    }
    function drawSub() {
      const blink = hurt > 0 && Math.floor(hurt * 20) % 2 === 0;
      const bob = !running && phase === 'title' ? Math.round(Math.sin(clock * 2) * 1) : 0;
      const frame = Math.floor(clock * (running ? 18 : 8)) % 3;
      const y = Math.round(depth) - 14 + bob;
      if (!blink) at(SUBS[frame], SUB_X, y);
      if (flash > 0) { rect(SUB_X + 37, depth - 2, 3, 4, C.white); rect(SUB_X + 40, depth - 1, 2, 2, C.cyan); rect(SUB_X + 37, depth - 3, 1, 6, '#BFF4FF'); }
      if (phase === 'win') {
        const rise = Math.min(1, phaseTime / 0.6), cy = y + 4 - Math.round(rise * 14);
        at(calculator, SUB_X + 13, cy);
        if (phaseTime < 1.6) for (let i = 0; i < 4; i++) { const a = phaseTime * 4 + i * Math.PI / 2; rect(SUB_X + 18 + Math.cos(a) * 11, cy + 6 + Math.sin(a) * 9, 1, 1, i % 2 ? C.gold : C.white); }
      }
    }
    function drawShots() {
      for (const s of shots) {
        const x = s.x - distance;
        rect(x - 7, s.y, 3, 1, '#2C9FC4'); rect(x - 4, s.y, 3, 1, '#7FE6F7');
        rect(x - 1, s.y - 1, 8, 3, C.cyan); rect(x, s.y, 7, 1, C.white); rect(x + 7, s.y, 1, 1, C.white);
      }
    }
    function drawEffects() {
      for (const e of effects) {
        const x = e.x - distance, k = e.t / e.life;
        if (e.kind === 'blast') {
          const r = 2 + e.size * Math.min(1, k * 2.2);
          if (k < 0.15) disc(ctx, x, e.y, r + 1, C.white);
          else if (k < 0.75) {
            disc(ctx, x, e.y, r, k < 0.45 ? C.coral : C.brick);
            disc(ctx, x, e.y, r * 0.7, k < 0.45 ? C.brickHi : C.coral);
            disc(ctx, x, e.y, r * 0.42, k < 0.45 ? C.gold : C.brickHi);
            if (k < 0.35) disc(ctx, x, e.y, r * 0.2, C.cream);
          } else {
            ctx.globalAlpha = 1 - (k - 0.75) / 0.25;
            disc(ctx, x, e.y - (k - 0.75) * 10, r * 0.9, '#5E5A8C');
            ctx.globalAlpha = 1;
          }
          if (k < 0.5) { ctx.globalAlpha = 0.6; const ring = r + 4 + k * 10; for (let a = 0; a < 16; a++) rect(x + Math.cos(a / 16 * Math.PI * 2) * ring, e.y + Math.sin(a / 16 * Math.PI * 2) * ring, 1, 1, '#BFF4FF'); ctx.globalAlpha = 1; }
        } else if (e.kind === 'debris') {
          rect(x, e.y, 2, 2, e.colour);
        } else if (e.kind === 'spark') {
          const r = 1 + k * 5;
          for (let a = 0; a < 6; a++) rect(x + Math.cos(a) * r, e.y + Math.sin(a) * r, 1, 1, a % 2 ? C.gold : C.white);
        }
      }
      for (const p of pops) {
        if (Math.floor(p.t * 12) % 4 === 3 && p.t > 0.5) continue;
        at(text(p.label, 1, [C.gold]), p.x - distance - 12, p.y - p.t * 14);
      }
    }
    function drawSurface() {
      for (let x = 0; x < W; x++) {
        const y = SURFACE + Math.round(Math.sin((x + distance * 0.9 + clock * 18) / 8) * 0.9);
        rect(x, y - 1, 1, 1, '#E8FBFF'); rect(x, y, 1, 2, '#8BE0F0');
      }
      for (let i = 0; i < 6; i++) { const sx = (i * 61 + Math.floor(clock * 3) * 37) % W; if ((Math.floor(clock * 6) + i) % 3 === 0) rect(sx, SURFACE + 3, 2, 1, C.white); }
    }
    function drawHud() {
      at(text('SCORE', 1, [C.cyan]), 3, 2);
      at(text(String(score).padStart(6, '0'), 1, [C.cream, C.gold]), 38, 2);
      const bx = 118, bw = 84, by = 6;
      rect(bx - 1, by - 1, bw + 2, 4, C.outline); rect(bx, by, bw, 2, '#6A5FB0'); rect(bx, by, Math.round(bw * distance / FINISH), 2, C.cyan);
      for (const g of GATES) rect(bx + Math.round(bw * g.x / FINISH) , by - 2, 1, 6, C.gold);
      rect(bx + bw + 1, by - 3, 4, 7, C.outline); rect(bx + bw + 2, by - 2, 2, 5, C.coral);
      const mx = bx + Math.round(bw * distance / FINISH);
      rect(mx - 3, by - 2, 7, 5, C.outline); rect(mx - 2, by - 1, 5, 3, '#F2B33D'); rect(mx - 2, by - 1, 5, 1, '#FFE08A');
      for (let i = 0; i < MARKS.length; i++) {
        const x = W - 9 - (MARKS.length - 1 - i) * 10, y = 2, on = targets[i].hit;
        disc(ctx, x + 3, y + 4, 4, C.outline);
        disc(ctx, x + 3, y + 4, 3, on ? C.coral : '#5E5A8C'); disc(ctx, x + 3, y + 4, 2, on ? C.cream : '#8C86B8'); rect(x + 3, y + 4, 1, 1, on ? C.coral : '#5E5A8C');
      }
    }
    function panel(x, y, w, h, label, hint) {
      ctx.globalAlpha = 0.6; rect(x, y, w, h, C.outline); ctx.globalAlpha = 1;
      rect(x, y, w, 1, C.lilac); rect(x, y + h - 1, w, 1, C.lilac); rect(x, y, 1, h, C.lilac); rect(x + w - 1, y, 1, h, C.lilac);
      const big = text(label, 2, [C.cream, C.gold, C.gold, C.brickHi]), small = text(hint, 1, [C.cyan]);
      at(big, x + (w - big.width) / 2, y + 10); at(small, x + (w - small.width) / 2, y + 34);
    }
    function drawBanner() {
      const blinkOn = Math.floor(clock * 2.5) % 2 === 0;
      const again = touch ? 'TAP TO ' : 'PRESS SPACE TO ';
      if (phase === 'title') {
        // The controls stay on screen until the player starts.
        centreText(text('SEA TRIAL', 3, [C.cream, C.gold, C.gold, C.brickHi, C.brickHi, C.brick]), 16);
        centreText(text('STEER THROUGH THE GATES TO THE BUOY', 1, [C.cream]), 45);
        if (blinkOn) centreText(text(again + 'START', 1, [C.gold]), 85);
        panel(12, 96, 144, 54, 'DIVE', touch ? 'HOLD THIS SIDE' : 'HOLD SPACE');
        panel(164, 96, 144, 54, 'FIRE', touch ? 'TAP THIS SIDE' : 'PRESS X');
      } else if (phase === 'go' && phaseTime < 1.2) {
        if (Math.floor(phaseTime * 8) % 2 === 0 || phaseTime < 0.6) centreText(text('GO!', 3, [C.cream, C.gold, C.gold, C.brickHi]), 66);
      } else if (phase === 'crash' && phaseTime > 0.4) {
        centreText(text('HULL CLIPPED', 3, [C.cream, C.coral, C.coral, C.brick]), 64);
        if (blinkOn && canStart()) centreText(text(again + 'TRY AGAIN', 1, [C.cream]), 96);
      } else if (phase === 'win' && phaseTime > 0.6) {
        centreText(text('DELIVERED!', 3, [C.cream, C.gold, C.gold, C.brickHi, C.brickHi, C.brick]), 62);
        centreText(text('TARGETS ' + hits + '/' + targets.length + '   SCORE ' + String(score).padStart(6, '0'), 1, [C.cyan]), 96);
        if (blinkOn) centreText(text(again + 'PLAY AGAIN', 1, [C.cream]), 110);
      }
      if (running && distance >= FINISH - 40 && depth > DEPTH_MIN + 3 && blinkOn) {
        const x = BUOY - distance - 30;
        at(text('SURFACE!', 1, [C.gold]), Math.max(70, Math.min(W - 52, x)), SURFACE + 8);
      }
    }
    function draw() {
      ctx.save();
      if (shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 3));
      drawScenery(); drawSeabed(); drawBubbles(); drawTargets(); drawGates(); drawBuoy();
      drawShots(); drawSub(); drawEffects(); drawSurface();
      ctx.restore();
      drawHud(); drawBanner();
    }
    function loop(now) {
      if (!canvas.isConnected) return;
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0; previous = now; clock += dt;
      if (running) update(dt);
      updateWorld(dt);
      draw();
      requestAnimationFrame(loop);
    }

    // A crash or delivery holds the end screen briefly so a held key or thumb does not restart at once.
    function canStart() { return !running && (phase === 'title' || phaseTime > 0.6); }
    function begin() {
      distance = 0; depth = START_DEPTH; running = true; hits = 0; fired = 0; score = 0; cooldown = 0; flash = 0; hurt = 0;
      releaseControls(); shots = []; effects = []; pops = []; bubbles = [];
      targets = MARKS.map(t => ({...t, hit:false})); canvas.dataset.hits = 0; canvas.dataset.shots = 0; setPhase('go');
      status.textContent = 'Under way.';
    }
    // On the canvas, the left half dives and the right half fires, so two thumbs can do both at once.
    canvas.onpointerdown = e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault(); canvas.focus({preventScroll:true});
      if (!running) { if (!canStart()) return; begin(); }
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      const box = canvas.getBoundingClientRect();
      if (e.clientX < box.left + box.width / 2) divePointers.add(e.pointerId);
      else { firePointers.add(e.pointerId); fireQueued = true; }
    };
    canvas.onpointerup = canvas.onlostpointercapture = canvas.onpointercancel = e => { divePointers.delete(e.pointerId); firePointers.delete(e.pointerId); };
    canvas.oncontextmenu = e => e.preventDefault();
    win.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest('button')) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!running) { if (e.repeat || !canStart()) return; begin(); }
        if (e.code === 'Space') diveKey = true;
      } else if (e.code === 'KeyX' && running) {
        e.preventDefault(); if (!e.repeat) { fireKey = true; fireQueued = true; }
      }
    });
    win.addEventListener('keyup', e => { if (e.code === 'Space') diveKey = false; if (e.code === 'KeyX') fireKey = false; });
    win.addEventListener('focusout', e => { if (!win.contains(e.relatedTarget)) { diveKey = false; fireKey = false; } });
    // The dialog focuses its close button first; move focus to the game so Space works straight away.
    requestAnimationFrame(() => canvas.focus({preventScroll:true}));
    requestAnimationFrame(loop);
  };
})(globalThis.Hired);
