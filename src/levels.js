(function (root) {
  'use strict';
  const H = root.Hired = root.Hired || {};
  const rect = (x, y, w, h, type = 'ground') => ({ x, y, w, h, type, oneWay: type !== 'ground' });
  const ground = (x, w, y = 440) => rect(x, y, w, 680 - y);
  const ledge = (x, y, w = 144) => rect(x, y, w, 24, 'platform');
  const moving = (x, y, w, rangeX, rangeY, speed, phase = 0) => ({
    ...rect(x, y, w, 24, 'moving'), baseX: x, baseY: y, rangeX, rangeY, speed, phase
  });
  const enemy = (type, x, floor, min, max, speed = 1.15) => ({
    type, x, y: floor - ({ cv: 44, inbox: 38, plane: 32 }[type]),
    w: type === 'plane' ? 46 : 42, h: { cv: 44, inbox: 38, plane: 32 }[type],
    minX: min, maxX: max, speed, facing: -1
  });
  const key = (x, y, word) => ({ x, y, kind: 'key', word });
  const gate = (x, floor, needs, label) => ({ x, y: floor - 420, w: 40, h: 420, needs, label });
  const skill = (x, y, id, title) => ({ x, y, kind: 'skill', skill: { id, title } });
  const arc = (x, y, count = 5, step = 40) => Array.from({ length: count }, (_, i) => ({
    x: x + i * step, y: y - Math.sin(i / Math.max(1, count - 1) * Math.PI) * 48, kind: 'coin'
  }));

  const wall = (x, y, w, h, extra = {}) => ({ x, y, w, h, type: 'wall', oneWay: false, ...extra });

  // ---- Inserted stretches. Each builder receives the x where it starts and returns
  // its pieces plus its width; everything authored after that point moves right.
  const secretStretch = (name, floor) => x0 => {
    const top = floor - 232, x = x0 + 340, w = 220;
    return { width: 850,
      platforms: [ground(x0, 700, floor), ledge(x0 + 60, floor - 122), ledge(x0 + 200, top, 140),
        wall(x, top, w, 24), wall(x, top - 134, w, 24), wall(x + w - 24, top - 110, 24, 110),
        wall(x, top - 110, 24, 110, { type: 'breakable', name })],
      collectibles: [0, 1, 2, 3].flatMap(i => [{ x: x + 56 + i * 38, y: top - 30, kind: 'coin' }, { x: x + 56 + i * 38, y: top - 72, kind: 'coin' }]),
      checkpoints: [{ x: x0 + 30, y: floor }],
      enemies: [enemy('inbox', x0 + 420, floor, x0 + 380, x0 + 640)] };
  };
  const coverLetterClimb = x0 => ({ width: 700,
    platforms: [ground(x0, 560, 200)],
    enemies: [enemy('cv', x0 + 300, 200, x0 + 220, x0 + 500)],
    collectibles: [...arc(x0 - 120, 250, 4, 36), ...arc(x0 + 560, 190, 4, 40)],
    decor: [{ type: 'sign', x: x0 + 40, y: 200, text: 'COVER LETTER CLIMB' }],
    hints: [{ x: x0 - 330, text: 'A rooftop. Jump, then jump again at the top of your arc.' }] });
  const beltsAndPresses = x0 => ({ width: 2330,
    platforms: [{ ...ground(x0, 620, 400), belt: 2.2 }, { ...ground(x0 + 760, 520, 400), belt: -2.4 }, ground(x0 + 1420, 760, 400),
      ledge(x0 + 860, 270, 192)],
    crushers: [{ x: x0 + 1680, w: 96, top: 150, floor: 400, period: 150, offset: 0 },
      { x: x0 + 1980, w: 96, top: 150, floor: 400, period: 150, offset: 75 }],
    collectibles: [...arc(x0 + 620, 300, 4, 38), ...arc(x0 + 880, 220, 4, 40)],
    checkpoints: [{ x: x0 + 1450, y: 400 }],
    decor: [{ type: 'sign', x: x0 + 40, y: 400, text: 'CONVEYOR A: WITH YOU' }, { type: 'sign', x: x0 + 800, y: 400, text: 'CONVEYOR B: AGAINST YOU' },
      { type: 'sign', x: x0 + 1470, y: 400, text: 'QUALITY CONTROL' }],
    hints: [{ x: x0 + 20, text: 'Conveyors carry you. The second one runs the wrong way, so keep moving.' },
      { x: x0 + 1440, text: 'Presses slam on a rhythm. Wait for one to lift, then run or dash under it.' }] });
  const craneRide = x0 => ({ width: 920,
    platforms: [ground(x0, 300), { ...moving(x0 + 514, 440, 192, 214, 0, 0.012, -1.57), ride: true }],
    enemies: [enemy('plane', x0 + 600, 330, x0 + 350, x0 + 880, 1.6)],
    collectibles: [...arc(x0 + 380, 370, 5, 44), ...arc(x0 + 640, 370, 5, 44)],
    checkpoints: [{ x: x0 + 40, y: 440 }],
    decor: [{ type: 'sign', x: x0 + 90, y: 440, text: 'CRANE RIDE: WAIT FOR IT' }],
    hints: [{ x: x0 + 20, text: 'The gap is too wide to jump. Step onto the crane platform and ride it across.' }] });
  const abTest = x0 => ({ width: 1650,
    platforms: [ground(x0, 1500), ledge(x0 + 190, 262, 380), ledge(x0 + 700, 262, 380), ledge(x0 + 1210, 262, 250)],
    springs: [{ x: x0 + 90, y: 440, w: 44, h: 16 }],
    boosts: [{ x: x0 + 200, y: 262, w: 300 }, { x: x0 + 710, y: 262, w: 300 }],
    enemies: [enemy('cv', x0 + 560, 440, x0 + 480, x0 + 820, 1.5), enemy('inbox', x0 + 1080, 440, x0 + 980, x0 + 1320, 1.4),
      enemy('plane', x0 + 620, 220, x0 + 560, x0 + 720, 1.2)],
    collectibles: [...arc(x0 + 230, 232, 3, 60), ...arc(x0 + 760, 232, 3, 60),
      ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ x: x0 + 300 + i * 140, y: 350, kind: 'coin' }))],
    checkpoints: [{ x: x0 + 30, y: 440 }, { x: x0 + 1420, y: 440 }],
    decor: [{ type: 'sign', x: x0 + 150, y: 440, text: 'A/B TEST: A IS UP, B IS DOWN' }, { type: 'sign', x: x0 + 1290, y: 440, text: 'RESULT: INCONCLUSIVE' }],
    hints: [{ x: x0 + 10, text: 'Two lanes. The spring takes you to A, fast and risky. B stays low with more ideas.' }] });
  const barChart = x0 => ({ width: 1700,
    platforms: [...[400, 350, 300, 250, 200].map((y, i) => ground(x0 + i * 200, 130, y)),
      ...[0, 1, 2, 3].map(i => ground(x0 + 130 + i * 200, 70)), ground(x0 + 930, 620),
      { ...ledge(x0 + 990, 200, 170), crumble: { to: 416 }, label: 'ALL-TIME HIGH' }],
    collectibles: [...[400, 350, 300, 250, 200].map((y, i) => ({ x: x0 + 65 + i * 200, y: y - 44, kind: 'coin' })),
      ...arc(x0 + 1010, 150, 4, 40)],
    checkpoints: [{ x: x0 + 1180, y: 440 }],
    decor: [{ type: 'sign', x: x0 + 1290, y: 440, text: 'MARKET CORRECTION' }],
    hints: [{ x: x0 - 260, text: 'Up and to the right. Climb the chart one bar at a time.' }] });
  const waitingRoom = x0 => ({ width: 910,
    platforms: [ground(x0, 760, 400), ledge(x0 + 330, 250, 180)],
    gates: [gate(x0 + 690, 400, 'keys', 'PLEASE WAIT')],
    collectibles: [{ ...key(x0 + 420, 170, 'BELL'), bell: true }],
    checkpoints: [{ x: x0 + 40, y: 400 }],
    decor: [{ type: 'sign', x: x0 + 110, y: 400, text: 'WE WILL BE WITH YOU SHORTLY' }, { type: 'tree', x: x0 + 470, y: 400 }],
    hints: [{ x: x0 + 20, text: 'The waiting room. Nobody is coming. There must be a bell somewhere.' }] });
  const liftRide = x0 => ({ width: 970,
    platforms: [ground(x0, 820, 360)],
    gates: [gate(x0 + 730, 360, 'lift', 'LIFT DOORS')],
    lift: { x0: x0 + 90, x1: x0 + 730, floor: 360, waveTicks: 230, waves: [['cv', 'inbox'], ['plane', 'cv'], ['inbox', 'plane', 'cv']] },
    checkpoints: [{ x: x0 + 30, y: 360 }],
    hints: [{ x: x0 + 10, text: 'The lift stops at three floors. Someone gets on at every one. Hold out until the doors open.' }] });
  const INSERTS = [
    [{ at: 1780, build: secretStretch('The Spam Folder', 440) }, { at: 4360, build: coverLetterClimb }],
    [{ at: 2530, build: secretStretch('The Backlog', 384) }, { at: 5160, build: beltsAndPresses }, { at: 6700, build: craneRide }],
    [{ at: 1560, build: secretStretch('The Vanity Metrics Vault', 440) }, { at: 2420, build: abTest }, { at: 3210, build: barChart }],
    [{ at: 720, build: secretStretch('The Stationery Cupboard', 400) }, { at: 2040, build: waitingRoom }, { at: 3340, build: liftRide }]
  ];
  const LISTS = ['platforms', 'enemies', 'collectibles', 'checkpoints', 'springs', 'boosts', 'decor', 'hints', 'gates', 'crushers', 'signoffs', 'rounds'];
  function shiftRight(level, from, dx) {
    for (const name of LISTS) for (const item of level[name] || []) {
      if (item.x < from) continue;
      item.x += dx;
      for (const field of ['baseX', 'minX', 'maxX']) if (field in item) item[field] += dx;
      if (item.arena) item.arena = item.arena.map(v => v + dx);
      for (const terminal of item.signoffs || []) terminal.x += dx;
    }
    if (level.boss.x >= from) level.boss.x += dx;
    if (level.fakeExit && level.fakeExit.x >= from) level.fakeExit.x += dx;
    if (level.chase) for (const field of ['startX', 'endX']) if (level.chase[field] >= from) level.chase[field] += dx;
    if (level.lift && level.lift.x0 >= from) { level.lift.x0 += dx; level.lift.x1 += dx; }
    level.width += dx;
  }
  function applyInserts(level, inserts) {
    for (const insert of [...inserts].sort((a, b) => b.at - a.at)) {
      const part = insert.build(insert.at);
      shiftRight(level, insert.at, part.width);
      for (const name of LISTS) if (part[name]) level[name] = [...(level[name] || []), ...part[name]];
      if (part.lift) level.lift = part.lift;
    }
    level.checkpoints.sort((a, b) => a.x - b.x);
    level.hints.sort((a, b) => a.x - b.x);
  }

  const definitions = [
    {
      id: 'application-alley', name: 'Application Alley', subtitle: 'Twenty years of work. One upload field.',
      objective: 'Find your feet, collect ideas and get past the CV Filter.',
      theme: 'alley', width: 7800, height: 540, spawn: { x: 96, y: 382 },
      platforms: [ground(0, 780), ground(900, 760), ground(1780, 740, 420), ground(2680, 680), ground(3500, 700),
        ground(4360, 620, 420), ground(5140, 1420), ground(6700, 1100),
        ledge(448, 344, 192), ledge(1100, 342), ledge(1920, 326), ledge(2160, 276, 192),
        ledge(2910, 342), ledge(3160, 310, 192), ledge(3650, 332, 144),
        ledge(3960, 300, 192), moving(4220, 300, 144, 0, 60, 0.022), ledge(4520, 300, 192), ledge(4800, 250),
        ledge(5640, 330, 192), ledge(6130, 215, 192)],
      enemies: [enemy('cv', 1060, 440, 980, 1250), enemy('inbox', 1520, 440, 1350, 1600),
        enemy('cv', 2070, 420, 1860, 2330), enemy('plane', 2450, 324, 2230, 2530, 1.5),
        enemy('inbox', 2870, 440, 2750, 3100), enemy('cv', 3590, 440, 3530, 3710),
        enemy('inbox', 4050, 440, 3900, 4180), enemy('cv', 4560, 420, 4420, 4760),
        enemy('plane', 4900, 290, 4700, 5080, 1.5), enemy('inbox', 5240, 440, 5180, 5360)],
      collectibles: [skill(540, 292, 'creative-direction', 'Creative direction'),
        skill(2256, 224, 'product-thinking', 'Product thinking'),
        skill(3260, 258, 'problem-solving', 'Problem solving'),
        ...arc(726, 346, 6, 38), ...arc(1608, 336, 6, 38), ...arc(2460, 320, 7, 38), ...arc(3290, 330, 7, 36),
        ...arc(4190, 330, 6, 36), ...arc(4980, 320, 6, 36), ...arc(4540, 250, 4, 40), ...arc(6150, 165, 4, 40),
        key(5420, 396, 'SYNERGY'), key(5736, 280, 'PASSIONATE'), key(6072, 150, 'NINJA')],
      checkpoints: [{ x: 1370, y: 440 }, { x: 3770, y: 440 }, { x: 5180, y: 440 }, { x: 6440, y: 440 }],
      springs: [{ x: 1950, y: 420, w: 44, h: 16 }, { x: 6050, y: 440, w: 44, h: 16 }], boosts: [],
      gates: [gate(6520, 440, 'keys', 'KEYWORD GATE')],
      boss: { type: 'recruitmentbot', name: 'CV Filter', x: 7150, floor: 440, w: 82, h: 82, health: 3 },
      decor: [{ type: 'cafe', x: 50, y: 440 }, { type: 'sign', x: 280, y: 440, text: 'APPLICATION ALLEY' },
        { type: 'sign', x: 690, y: 440, text: 'MIND THE GAP IN YOUR CV' },
        { type: 'tree', x: 620, y: 440 }, { type: 'banner', x: 1110, y: 440 },
        { type: 'arch', x: 1810, y: 420 }, { type: 'tree', x: 2360, y: 420 },
        { type: 'terminal', x: 3030, y: 440 }, { type: 'banner', x: 3580, y: 440 },
        { type: 'tree', x: 4420, y: 420 }, { type: 'sign', x: 5230, y: 440, text: 'THE FILTER READS KEYWORDS' },
        { type: 'banner', x: 5860, y: 440 }, { type: 'sign', x: 6800, y: 440, text: 'STOMP WHEN THE SHIELD IS DOWN' }],
      hints: [{ x: 100, text: 'Move with A/D or the arrow keys. Space to jump.' },
        { x: 570, text: 'Jump again in the air. Gold ideas show a safe route.' },
        { x: 1150, text: 'Land on enemies, or dash through them with Shift / X.' },
        { x: 5150, text: 'The gate ahead opens for three keywords. Look low, on the ledge and high above the spring.' },
        { x: 6760, text: 'Watch the warning, dodge the scan, then stomp or dash during the opening.' }]
    },
    {
      id: 'ship-it-city', name: 'Ship It City', subtitle: 'Ideas are good. Finished work is better.',
      objective: 'Ride the lifts, cross the works and stop Scope Creep.',
      theme: 'works', width: 8780, height: 540, spawn: { x: 96, y: 382 },
      platforms: [ground(0, 690), ground(820, 660, 400), ground(1610, 770), ground(2530, 500, 384),
        ground(3170, 430), ground(3710, 1290), ground(5160, 560, 400), ground(5880, 640, 384),
        ground(6700, 520), ground(7380, 1400), ledge(460, 344), ledge(610, 292, 144),
        moving(1350, 310, 144, 95, 0, 0.022), ledge(1820, 332), ledge(2080, 232, 192),
        moving(1950, 340, 144, 0, 88, 0.021, -1.57), ledge(2660, 292),
        moving(3100, 300, 144, 96, 0, 0.025), ledge(3430, 282, 192), ledge(3880, 336),
        moving(5020, 320, 144, 70, 0, 0.024), ledge(5330, 290, 192), moving(5760, 280, 144, 0, 70, 0.022),
        ledge(6040, 270, 192), ledge(6300, 200), moving(6600, 300, 144, 80, 0, 0.026), ledge(6880, 330, 192),
        moving(7260, 320, 144, 0, 60, 0.023, 1.2)],
      enemies: [enemy('cv', 960, 400, 880, 1150, 1.4), enemy('inbox', 1320, 400, 1200, 1430),
        enemy('cv', 1720, 440, 1660, 1880, 1.4), enemy('inbox', 2290, 440, 2090, 2330),
        enemy('plane', 2780, 260, 2600, 2960, 1.7), enemy('cv', 3280, 440, 3220, 3500),
        enemy('inbox', 3950, 440, 3800, 4100),
        enemy('cv', 5420, 400, 5240, 5660, 1.4), enemy('plane', 5700, 250, 5500, 5900, 1.7),
        enemy('inbox', 6150, 384, 5960, 6440), enemy('cv', 6900, 440, 6760, 7160, 1.5),
        enemy('plane', 7200, 290, 7000, 7360, 1.8)],
      collectibles: [skill(682, 240, 'delivery', 'From idea to delivery'),
        skill(2176, 180, 'building', 'Building useful products'),
        skill(3520, 230, 'iteration', 'Iteration and judgement'),
        ...arc(646, 310, 6, 38), ...arc(1430, 295, 6, 38), ...arc(2310, 306, 7, 40), ...arc(3530, 310, 7, 38),
        ...arc(4990, 330, 6, 36), ...arc(5710, 300, 6, 36), ...arc(6510, 290, 6, 38), ...arc(7210, 330, 6, 36),
        ...arc(6310, 150, 4, 36)],
      checkpoints: [{ x: 1100, y: 400 }, { x: 4000, y: 440 }, { x: 5230, y: 400 }, { x: 7460, y: 440 }],
      springs: [{ x: 1770, y: 440, w: 44, h: 16 }, { x: 5960, y: 384, w: 44, h: 16 }], boosts: [],
      signoffs: [
        // Left to right in filing order, far enough apart that the labels never touch.
        { x: 7965, label: 'BRIEF' }, { x: 8125, label: 'BUILD' }, { x: 8285, label: 'SHIP' },
        { x: 8445, label: 'SHIP AGAIN' }
      ],
      boss: { type: 'scopecreep', name: 'Scope Creep', x: 8130, floor: 440, w: 94, h: 88, health: 4 },
      decor: [{ type: 'sign', x: 100, y: 440, text: 'SHIP IT CITY' }, { type: 'crate', x: 340, y: 440 },
        { type: 'crane', x: 900, y: 400 }, { type: 'terminal', x: 1110, y: 400 },
        { type: 'crate', x: 1700, y: 440 }, { type: 'banner', x: 2280, y: 440 },
        { type: 'crane', x: 2550, y: 384 }, { type: 'terminal', x: 2870, y: 384 },
        { type: 'crate', x: 3350, y: 440 }, { type: 'sign', x: 4300, y: 440, text: 'NEARLY DONE' },
        { type: 'sign', x: 5180, y: 400, text: 'PHASE 2' }, { type: 'crate', x: 5560, y: 400 },
        { type: 'sign', x: 5900, y: 384, text: 'PHASE 2 (QUICK TWEAK)' }, { type: 'crane', x: 6360, y: 384 },
        { type: 'sign', x: 6720, y: 440, text: 'PHASE 2 FINAL_final v3' }, { type: 'crate', x: 7080, y: 440 },
        { type: 'sign', x: 7640, y: 440, text: 'DASH THROUGH LIT TERMINALS' }],
      hints: [{ x: 100, text: 'The lifts carry you. The lower route is always available.' },
        { x: 1680, text: 'Springs reveal higher routes and optional skill tokens.' },
        { x: 7560, text: 'Scope Creep keeps adding work. Dodge its charge and dash through each lit terminal to sign off the brief.' }]
    },
    {
      id: 'growth-run', name: 'Growth Run', subtitle: 'Keep the momentum. Keep learning.',
      objective: 'Follow the fast lanes and outmanoeuvre the Algorithm.',
      theme: 'growth', width: 8720, height: 540, spawn: { x: 96, y: 382 },
      platforms: [ground(0, 650), ground(850, 530), ground(1560, 660), ground(2420, 590),
        ground(3210, 650), ground(4020, 500), ground(4660, 700), ground(5500, 560), ground(6200, 640),
        ground(6980, 420), ground(7540, 1180), ledge(420, 342, 192),
        ledge(1050, 318), moving(1360, 306, 144, 90, 0, 0.027), ledge(1760, 320),
        ledge(1960, 228, 192), ledge(2600, 320, 192), moving(3020, 300, 144, 0, 65, 0.025),
        ledge(3570, 308, 192), ledge(4120, 322),
        ledge(4900, 320, 192), ledge(5640, 310, 192), ledge(6420, 320, 192), ledge(7080, 310)],
      enemies: [enemy('plane', 1030, 300, 900, 1260, 1.8), enemy('cv', 1180, 440, 950, 1310, 1.5),
        enemy('inbox', 1840, 440, 1620, 2100, 1.4), enemy('plane', 2160, 304, 1950, 2240, 2),
        enemy('plane', 2690, 300, 2490, 2910, 2), enemy('cv', 2810, 440, 2500, 2940, 1.5),
        enemy('inbox', 3440, 440, 3290, 3770, 1.4), enemy('plane', 3770, 304, 3550, 3950, 1.9),
        enemy('cv', 4170, 440, 4070, 4300, 1.5),
        enemy('inbox', 5760, 440, 5640, 5960, 1.4), enemy('plane', 6600, 300, 6400, 6800, 2),
        enemy('cv', 7200, 440, 7100, 7340, 1.5)],
      collectibles: [skill(524, 290, 'curiosity', 'Curiosity and learning'),
        skill(2056, 176, 'systems', 'Systems thinking'),
        skill(3666, 256, 'growth', 'Experiments and growth'),
        ...arc(584, 310, 9, 38), ...arc(1300, 310, 9, 38), ...arc(2150, 310, 9, 38),
        ...arc(2940, 308, 9, 38), ...arc(3790, 310, 8, 38),
        ...arc(4500, 320, 6, 36), ...arc(5340, 320, 6, 36), ...arc(6040, 320, 6, 36), ...arc(6820, 320, 6, 36),
        ...arc(7380, 320, 6, 36)],
      checkpoints: [{ x: 1250, y: 440 }, { x: 4270, y: 440 }, { x: 7600, y: 440 }],
      springs: [{ x: 1690, y: 440, w: 44, h: 16 }],
      boosts: [{ x: 300, y: 440, w: 280 }, { x: 1720, y: 440, w: 380 }, { x: 3300, y: 440, w: 390 },
        { x: 4700, y: 440, w: 320 }, { x: 6240, y: 440, w: 320 }],
      chase: { startX: 4560, endX: 7440, speed: 4.7, lead: 320, trail: 380 },
      boss: { type: 'algorithm', name: 'The Algorithm', x: 8070, floor: 405, w: 88, h: 76, health: 4 },
      decor: [{ type: 'sign', x: 90, y: 440, text: 'GROWTH RUN' }, { type: 'banner', x: 330, y: 440 },
        { type: 'satellite', x: 890, y: 440 }, { type: 'terminal', x: 1260, y: 440 },
        { type: 'banner', x: 1790, y: 440 }, { type: 'satellite', x: 2580, y: 440 },
        { type: 'terminal', x: 3480, y: 440 }, { type: 'sign', x: 4330, y: 440, text: 'DO NOT STOP SCROLLING' },
        { type: 'banner', x: 5120, y: 440 }, { type: 'satellite', x: 5900, y: 440 }, { type: 'banner', x: 6600, y: 440 },
        { type: 'sign', x: 7760, y: 440, text: 'READ THE PATTERN' }],
      hints: [{ x: 100, text: 'Cyan lanes give you a burst of speed. Jump before the edge.' },
        { x: 2460, text: 'Planes are safe to stomp from above. Keep one jump in reserve.' },
        { x: 4300, text: 'The Feed is coming. Keep running right and do not let it scroll past you.' },
        { x: 7700, text: 'The Algorithm fires a pattern, then cools down. Time your opening.' }]
    },
    {
      id: 'final-interview', name: 'Final Interview HQ', subtitle: 'Bring the work. Be yourself.',
      objective: 'Climb the headquarters and meet your interview host.',
      theme: 'hq', width: 7420, height: 540, spawn: { x: 96, y: 382 },
      platforms: [ground(0, 620), ground(720, 580, 400), ground(1410, 510, 360), ground(2040, 480, 400),
        ground(2640, 540, 360), ground(3340, 900, 350), ground(4400, 900, 340), ground(5460, 900, 330),
        ground(6520, 900, 320), ledge(370, 338, 192),
        ledge(850, 290), moving(1210, 250, 144, 80, 0, 0.02), ledge(1640, 222, 192),
        ledge(2160, 292), moving(2460, 270, 144, 0, 65, 0.02), ledge(2910, 242, 192),
        ledge(6570, 210, 144)],
      enemies: [enemy('cv', 850, 400, 770, 1030), enemy('plane', 1180, 266, 1010, 1320, 1.6),
        enemy('inbox', 1570, 360, 1470, 1830), enemy('cv', 2270, 400, 2100, 2440, 1.3),
        enemy('plane', 2790, 246, 2690, 3030, 1.6), enemy('inbox', 3000, 360, 2820, 3100)],
      collectibles: [skill(466, 286, 'storytelling', 'Storytelling'),
        skill(1736, 170, 'collaboration', 'Collaboration'),
        skill(3006, 190, 'judgement', 'Creative judgement'),
        ...arc(575, 300, 6, 36), ...arc(1240, 270, 6, 38), ...arc(1850, 260, 7, 38),
        ...arc(2450, 280, 7, 38), ...arc(3120, 250, 7, 38), ...arc(4240, 250, 5, 36), ...arc(5300, 240, 5, 36),
        ...arc(6360, 230, 5, 36)],
      checkpoints: [{ x: 1100, y: 400 }, { x: 3400, y: 350 }, { x: 4450, y: 340 }, { x: 5510, y: 330 }, { x: 6590, y: 320 }],
      springs: [{ x: 1450, y: 360, w: 44, h: 16 }], boosts: [],
      rounds: [
        { type: 'recruitmentbot', name: 'Round 1 · Phone screen', x: 3840, floor: 350, w: 82, h: 82, health: 1, enraged: true },
        { type: 'scopecreep', name: 'Round 2 · Take-home task', x: 4860, floor: 340, w: 94, h: 88, health: 1, enraged: true,
          arena: [4560, 5220], signoffs: [{ x: 5100, label: 'SUBMIT' }] },
        { type: 'algorithm', name: 'Round 3 · The panel', x: 5950, floor: 295, w: 88, h: 76, health: 1, enraged: true }
      ],
      gates: [gate(4190, 350, 0, 'ROUND 1 OF 3'), gate(5250, 340, 1, 'ROUND 2 OF 3'), gate(6310, 330, 2, 'ROUND 3 OF 3')],
      boss: { type: 'finalreview', name: 'Interview host', x: 6770, floor: 320, w: 84, h: 88, health: 3 },
      decor: [{ type: 'sign', x: 90, y: 440, text: 'FINAL INTERVIEW HQ' }, { type: 'tree', x: 520, y: 440 },
        { type: 'terminal', x: 1110, y: 400 }, { type: 'banner', x: 1460, y: 360 },
        { type: 'satellite', x: 2180, y: 400 }, { type: 'terminal', x: 2860, y: 360 },
        { type: 'sign', x: 3160 - 180, y: 360, text: 'JUST THREE MORE ROUNDS' },
        { type: 'sign', x: 6550, y: 320, text: 'BRING YOUR STORY' }, { type: 'banner', x: 7150, y: 320 }],
      hints: [{ x: 100, text: 'The final climb. Checkpoints keep your progress safe.' },
        { x: 3300, text: 'Three interview rounds stand between you and the room. You have met them all before.' },
        { x: 6540, text: 'The interview host has your file. Head through the doors and choose what to talk about.' }]
    }
  ];

  const bonusItems = [
    { id: 'chatgpt-pass', x: 189, y: 397, badge: 'GPT', colour: '#9ce8cf', title: 'ChatGPT subscription', line: 'Finally, someone who thinks you’re absolutely right. £20 a month.' },
    { id: 'claude-pass', x: 189, y: 397, badge: 'CLD', colour: '#f7ad8d', title: 'Claude subscription', line: 'Brilliant find. You’ve hit your usage limit. Try again at 4pm.' },
    { id: 'cold-coffee', x: 189, y: 397, badge: 'COF', colour: '#ffc977', title: 'Cold coffee', line: 'Made at nine. Found at four. Drunk anyway.' },
    { id: 'final-final', x: 189, y: 397, badge: 'ZIP', colour: '#cbb7fa', title: 'FINAL_final_ACTUALLY_FINAL.zip', line: 'There’s a v2.' }
  ];

  const LEVELS = definitions.map((level, levelIndex) => {
    applyInserts(level, INSERTS[levelIndex]);
    level.platforms.forEach((p, i) => { p.id = 'platform-' + i; p.dx = 0; p.dy = 0; });
    level.enemies.forEach((e, i) => { e.id = 'enemy-' + i; e.baseY = e.y; e.alive = true; e.phase = 0; });
    // The regular trail stays on solid ground; extra arcs describe the jumps across gaps.
    for (const p of level.platforms.filter(p => p.type === 'ground')) {
      for (let x = Math.max(240, p.x + 90); x < Math.min(p.x + p.w - 60, level.boss.x - 140); x += 118) {
        level.collectibles.push({ x, y: p.y - 44, kind: 'coin' });
      }
    }
    // Each level's highest skill ledge carries an optional portfolio field note.
    const skills = level.collectibles.filter(item => item.kind === 'skill');
    const secret = skills.reduce((highest, item) => item.y < highest.y ? item : highest);
    secret.secret = true;
    level.collectibles.forEach((c, i) => { c.id = level.id + '-pickup-' + i; c.collected = false; });
    // The original pickup IDs remain stable for saved checkpoints.
    level.collectibles.push({ ...bonusItems[levelIndex], kind: 'bonus', collected: false });
    level.checkpoints.forEach((c, i) => { c.id = 'checkpoint-' + i; c.active = false; });
    level.springs.forEach((s, i) => { s.id = 'spring-' + i; });
    level.boosts.forEach((b, i) => { b.id = 'boost-' + i; });
    (level.crushers || []).forEach((c, i) => { c.id = 'crusher-' + i; c.h = 40; });
    // Gates are solid until their condition is met: every keyword found, or an interview round cleared.
    (level.gates || []).forEach((g, i) => {
      level.platforms.push({ x: g.x, y: g.y, w: g.w, h: g.h, type: 'gate', oneWay: false, id: 'gate-' + i,
        dx: 0, dy: 0, needs: g.needs, label: g.label });
    });
    // The portal stands on whichever ground is under it. Set pieces are appended to the platform
    // list, so the last ground in the list is not necessarily the last ground in the world.
    const exitX = level.width - 160;
    const exitGround = level.platforms.find(p => p.type === 'ground' && p.x <= exitX && p.x + p.w >= exitX + 84);
    level.exit = { x: exitX, y: exitGround.y - 104, w: 84, h: 104 };
    level.levelIndex = levelIndex;
    return level;
  });

  function createLevel(index) {
    const i = Math.max(0, Math.min(LEVELS.length - 1, Number(index) || 0));
    return JSON.parse(JSON.stringify(LEVELS[i]));
  }
  H.LEVELS = LEVELS;
  H.createLevel = createLevel;
  if (typeof module !== 'undefined' && module.exports) module.exports = { LEVELS, createLevel };
})(typeof globalThis !== 'undefined' ? globalThis : window);
