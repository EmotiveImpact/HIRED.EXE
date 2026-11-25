// Program Manager icons for the edition's links, drawn pixel by pixel on a
// 32 by 32 grid in the sixteen VGA colours, the way Windows 3.1 icons were:
// black outlines, flat fills and a grey drop shadow. H.linkIcon(name) returns
// the icon for a link, or null when the name has none.
(function (H) {
  'use strict';
  const COLOURS = { k: '#000', w: '#fff', s: '#c0c0c0', g: '#808080', r: '#f00', R: '#800000', y: '#ff0', Y: '#808000',
    G: '#008000', l: '#0f0', b: '#00f', n: '#000080', c: '#0ff', t: '#008080', m: '#f0f', p: '#800080' };
  const SIZE = 32;

  function draw(paint) {
    const px = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
    const at = (x, y) => (x >= 0 && x < SIZE && y >= 0 && y < SIZE ? px[y][x] : '');
    const P = {
      set(x, y, c) { if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) px[y][x] = c; },
      rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) P.set(i, j, c); },
      // A rectangle with its four corner pixels left off.
      pill(x, y, w, h, c) { P.rect(x + 1, y, w - 2, h, c); P.rect(x, y + 1, w, h - 2, c); },
      // Rows as [y, first x, last x].
      rows(c, list) { for (const [y, a, b] of list) P.rect(a, y, b - a + 1, 1, c); },
      disc(cx, cy, r, c) { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.8) P.set(cx + i, cy + j, c); },
      line(x0, y0, x1, y1, c, thick = 1) {
        const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        for (;;) {
          P.rect(x0, y0, 1, thick, c);
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 > -dy) { err -= dy; x0 += sx; }
          if (e2 < dx) { err += dx; y0 += sy; }
        }
      },
      // Every pixel chosen by test(x, y) gets the colour it returns.
      each(test) { for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) { const c = test(x, y); if (c) px[y][x] = c; } },
      // A black line round everything drawn so far.
      outline(c = 'k') {
        const edge = [];
        for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (!px[y][x] && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) edge.push([x, y]);
        for (const [x, y] of edge) px[y][x] = c;
      },
      // The grey shadow that falls down and to the right of everything drawn so far.
      shadow(d = 2, c = 'g') {
        const fall = [];
        for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (!px[y][x] && at(x - d, y - d)) fall.push([x, y]);
        for (const [x, y] of fall) px[y][x] = c;
      }
    };
    paint(P);
    // One path per colour, a run of pixels at a time.
    const paths = {};
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const c = px[y][x];
      if (!c) continue;
      let w = 1;
      while (x + w < SIZE && px[y][x + w] === c) w++;
      paths[c] = (paths[c] || '') + 'M' + x + ' ' + y + 'h' + w + 'v1h-' + w + 'z';
      x += w - 1;
    }
    return '<span class="pm-glyph pm-glyph-art" aria-hidden="true"><svg viewBox="0 0 32 32" shape-rendering="crispEdges">' +
      Object.entries(paths).map(([c, d]) => '<path fill="' + COLOURS[c] + '" d="' + d + '"/>').join('') + '</svg></span>';
  }

  const HEART = [[6, 8, 12], [6, 18, 22], [7, 7, 13], [7, 17, 23], [8, 6, 24], [9, 5, 25], [10, 5, 25], [11, 5, 25], [12, 5, 25], [13, 5, 25], [14, 6, 24],
    [15, 7, 23], [16, 8, 22], [17, 9, 21], [18, 10, 20], [19, 11, 19], [20, 12, 18], [21, 13, 17], [22, 14, 16], [23, 15, 15]];
  const SHIELD = [[4, 6, 24], [5, 5, 25], [6, 5, 25], [7, 5, 25], [8, 5, 25], [9, 5, 25], [10, 5, 25], [11, 5, 25], [12, 5, 25], [13, 5, 25], [14, 5, 25], [15, 6, 24],
    [16, 6, 24], [17, 7, 23], [18, 7, 23], [19, 8, 22], [20, 9, 21], [21, 10, 20], [22, 11, 19], [23, 12, 18], [24, 13, 17], [25, 14, 16], [26, 15, 15]];

  const ICONS = {
    // Vimeo holds the film portfolio: a clapperboard.
    vimeo: P => {
      P.rect(3, 5, 24, 6, 'k'); P.rect(4, 6, 22, 4, 'w');
      for (const x of [7, 13, 19, 25]) for (let i = 0; i < 4; i++) P.rect(x - i, 6 + i, 3, 1, 'k');
      P.rect(26, 6, 1, 4, 'k');
      P.rect(3, 11, 24, 16, 'k'); P.rect(4, 12, 22, 14, 'n');
      P.rect(6, 15, 18, 1, 'w'); P.rect(6, 18, 10, 1, 'w'); P.rect(6, 21, 8, 1, 'w');
      P.rows('y', [[18, 19, 19], [19, 19, 20], [20, 19, 22], [21, 19, 24], [22, 19, 22], [23, 19, 20], [24, 19, 19]]);
      P.shadow();
    },
    // Vlume makes a Mac louder: a loudspeaker.
    vlume: P => {
      P.rect(3, 12, 6, 8, 's');
      for (let i = 0; i < 8; i++) P.rect(9 + i, 12 - i, 1, 8 + i * 2, i === 7 ? 'g' : 's');
      P.rect(4, 13, 4, 1, 'w'); for (let i = 0; i < 7; i++) P.set(9 + i, 12 - i, 'w');
      P.rect(3, 19, 6, 1, 'g'); for (let i = 0; i < 7; i++) P.set(9 + i, 19 + i, 'g');
      P.outline(); P.shadow();
      P.rows('b', [[12, 20, 20], [13, 21, 21], [14, 21, 21], [15, 21, 21], [16, 21, 21], [17, 21, 21], [18, 21, 21], [19, 20, 20]]);
      P.rows('n', [[8, 23, 23], [9, 24, 24], [10, 25, 25], [11, 25, 25], [12, 26, 26], [13, 26, 26], [14, 26, 26], [15, 26, 26], [16, 26, 26], [17, 26, 26], [18, 26, 26], [19, 26, 26], [20, 25, 25], [21, 25, 25], [22, 24, 24], [23, 23, 23]]);
      P.rows('b', [[4, 26, 26], [5, 27, 27], [6, 28, 28], [7, 29, 29], [8, 29, 29], [9, 30, 30], [10, 30, 30], [11, 31, 31], [12, 31, 31], [13, 31, 31], [14, 31, 31], [15, 31, 31], [16, 31, 31], [17, 31, 31], [18, 31, 31], [19, 31, 31], [20, 31, 31], [21, 30, 30], [22, 30, 30], [23, 29, 29], [24, 29, 29], [25, 28, 28], [26, 27, 27], [27, 26, 26]]);
    },
    // Cairn: a pile of stones.
    cairn: P => {
      const stone = (x, y, w, h) => { P.pill(x - 1, y - 1, w + 2, h + 2, 'k'); P.pill(x, y, w, h, 's'); P.rect(x + 2, y, Math.ceil(w / 3), 1, 'w'); P.rect(x + 1, y + h - 1, w - 2, 1, 'g'); P.rect(x + w - 1, y + 2, 1, h - 3, 'g'); };
      stone(5, 21, 21, 6); stone(8, 14, 15, 6); stone(10, 8, 11, 5); stone(13, 3, 6, 4);
      P.rect(1, 28, 30, 2, 'G'); P.rows('l', [[27, 2, 3], [27, 28, 29], [28, 1, 6], [28, 25, 30]]);
    },
    // Emotive Impact: the heart of it.
    'emotive-impact': P => {
      P.rows('r', HEART); P.rows('R', HEART.filter(([y]) => y > 8).map(([y, a, b]) => [y, Math.max(a, b - 2), b]));
      P.rows('w', [[8, 8, 10], [9, 7, 8], [10, 7, 7]]);
      P.outline(); P.shadow();
    },
    // SALEANE books appointments: a diary page with one day taken.
    saleane: P => {
      P.rect(4, 6, 23, 21, 'k'); P.rect(5, 7, 21, 19, 'w'); P.rect(5, 7, 21, 4, 'r'); P.rect(5, 11, 21, 1, 'k');
      P.rect(9, 4, 2, 5, 'k'); P.rect(20, 4, 2, 5, 'k'); P.set(9, 4, 's'); P.set(20, 4, 's');
      for (const y of [14, 18, 22]) for (const x of [7, 12, 17, 22]) P.rect(x, y, 3, 3, 's');
      P.rect(12, 18, 3, 3, 'n');
      P.shadow();
      P.line(16, 23, 19, 26, 'G', 3); P.line(19, 26, 27, 16, 'G', 3);
    },
    // NoSpoilers guards a release: a shield with a tick.
    nospoilers: P => {
      P.rows('b', SHIELD); P.rows('n', SHIELD.map(([y, a, b]) => [y, 16, b]));
      P.rows('c', [[5, 7, 14], [6, 6, 7], [7, 6, 6], [8, 6, 6]]);
      P.outline(); P.shadow();
      P.line(10, 14, 14, 18, 'w', 3); P.line(14, 18, 21, 9, 'w', 3);
    },
    // DraftHR drafts HR letters: a letter and a pencil.
    drafthr: P => {
      P.rect(4, 3, 19, 25, 'k'); P.rect(5, 4, 17, 23, 'w');
      P.rect(7, 6, 7, 2, 'n'); for (const y of [11, 14, 17, 20]) P.rect(7, y, 13, 1, 'g'); P.rect(7, 23, 6, 1, 'b');
      P.shadow();
      // The pencil lies across the corner: u runs across it, v along it.
      const U = 41, FROM = -17, TO = 7;
      P.each((x, y) => {
        const u = x + y - U, v = y - x;
        if (v < FROM || v > TO) return '';
        const half = v > TO - 5 ? Math.floor((TO - v) / 2) : 2;
        if (Math.abs(u) > half) return '';
        if (v > TO - 5) return v > TO - 2 ? 'k' : 'Y';
        if (Math.abs(u) === 2 || v === FROM || v === FROM + 4 || v === TO - 5) return 'k';
        return v < FROM + 4 ? 'r' : u === 1 ? 'Y' : 'y';
      });
    },
    // Lumalook is a camera app.
    lumalook: P => {
      P.rect(10, 6, 12, 5, 'k'); P.rect(11, 7, 10, 4, 's'); P.rect(4, 8, 5, 3, 'k'); P.rect(5, 9, 3, 1, 'r');
      P.rect(2, 10, 28, 16, 'k'); P.rect(3, 11, 26, 14, 's'); P.rect(3, 11, 26, 1, 'w'); P.rect(3, 24, 26, 1, 'g');
      P.rect(4, 13, 3, 10, 'g'); P.rect(24, 13, 4, 2, 'y');
      P.disc(16, 18, 6, 'k'); P.disc(16, 18, 5, 'n'); P.disc(16, 18, 3, 'b'); P.disc(16, 18, 1, 'n');
      P.rows('w', [[15, 13, 14], [16, 12, 12]]);
      P.shadow();
    },
    // Commune is for people who share a home: a house.
    commune: P => {
      P.rect(20, 5, 4, 7, 'R');
      for (let i = 0; i < 11; i++) P.rect(15 - i, 4 + i, 2 + i * 2, 1, i > 8 ? 'R' : 'r');
      P.rect(7, 15, 18, 12, 'w');
      P.outline();
      P.rect(7, 15, 18, 1, 'k'); P.rect(14, 20, 4, 7, 'n'); P.set(16, 23, 'y');
      P.rect(9, 18, 4, 4, 'k'); P.rect(10, 19, 2, 2, 'c'); P.rect(19, 18, 4, 4, 'k'); P.rect(20, 19, 2, 2, 'c');
      P.rect(1, 28, 30, 2, 'G'); P.rows('l', [[28, 1, 5], [28, 26, 30]]);
    },
    // CV.PDF: a page with a turned corner and the red PDF band across it.
    'cv-pdf': P => {
      P.rect(7, 2, 19, 27, 'k'); P.rect(8, 3, 17, 25, 'w');
      for (let i = 0; i < 6; i++) { P.rect(21 + i, 2 + i, 5 - i, 1, ''); P.rect(21, 2 + i, i - 1, 1, 's'); P.set(20 + i, 2 + i, 'k'); }
      P.rect(20, 2, 1, 6, 'k'); P.rect(20, 7, 6, 1, 'k');
      P.rect(10, 6, 8, 1, 'g'); P.rect(10, 9, 13, 1, 'g'); P.rect(10, 26, 13, 1, 'g');
      P.rect(2, 12, 21, 11, 'k'); P.rect(3, 13, 19, 9, 'r');
      const letters = ['###..###..####', '#..#.#..#.#...', '#..#.#..#.#...', '###..#..#.###.', '#....#..#.#...', '#....#..#.#...', '#....###..#...'];
      letters.forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') P.set(5 + i, 14 + j, 'w'); }));
      P.shadow();
    }
  };

  const made = {};
  H.linkIcon = name => {
    const id = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!ICONS[id]) return null;
    return made[id] || (made[id] = draw(ICONS[id]));
  };
})(globalThis.Hired);
