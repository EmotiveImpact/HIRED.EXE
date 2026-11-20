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
  const skill = (x, y, id, title) => ({ x, y, kind: 'skill', skill: { id, title } });
  const arc = (x, y, count = 5, step = 40) => Array.from({ length: count }, (_, i) => ({
    x: x + i * step, y: y - Math.sin(i / Math.max(1, count - 1) * Math.PI) * 48, kind: 'coin'
  }));

  const definitions = [
    {
      id: 'application-alley', name: 'Application Alley', subtitle: 'Every good story starts somewhere.',
      objective: 'Find your feet, collect ideas and get past the CV Filter.',
      theme: 'alley', width: 4600, height: 540, spawn: { x: 96, y: 382 },
      platforms: [ground(0, 780), ground(900, 760), ground(1780, 740, 420), ground(2680, 680), ground(3500, 1100),
        ledge(448, 344, 192), ledge(1100, 342), ledge(1920, 326), ledge(2160, 276, 192),
        ledge(2910, 342), ledge(3160, 310, 192), ledge(3650, 332, 144)],
      enemies: [enemy('cv', 1060, 440, 980, 1250), enemy('inbox', 1520, 440, 1350, 1600),
        enemy('cv', 2070, 420, 1860, 2330), enemy('plane', 2450, 324, 2230, 2530, 1.5),
        enemy('inbox', 2870, 440, 2750, 3100), enemy('cv', 3590, 440, 3530, 3710)],
      collectibles: [skill(540, 292, 'creative-direction', 'Creative direction'),
        skill(2256, 224, 'product-thinking', 'Product thinking'),
        skill(3260, 258, 'problem-solving', 'Problem solving'),
        ...arc(726, 346, 6, 38), ...arc(1608, 336, 6, 38), ...arc(2460, 320, 7, 38), ...arc(3290, 330, 7, 36)],
      checkpoints: [{ x: 1370, y: 440 }, { x: 3770, y: 440 }],
      springs: [{ x: 1950, y: 420, w: 44, h: 16 }], boosts: [],
      boss: { type: 'recruitmentbot', name: 'CV Filter', x: 3950, floor: 440, w: 82, h: 82, health: 3 },
      decor: [{ type: 'cafe', x: 50, y: 440 }, { type: 'sign', x: 280, y: 440, text: 'APPLICATION ALLEY' },
        { type: 'tree', x: 620, y: 440 }, { type: 'banner', x: 1110, y: 440 },
        { type: 'arch', x: 1810, y: 420 }, { type: 'tree', x: 2360, y: 420 },
        { type: 'terminal', x: 3030, y: 440 }, { type: 'banner', x: 3580, y: 440 },
        { type: 'sign', x: 3790, y: 440, text: 'STOMP WHEN THE SHIELD IS DOWN' }],
      hints: [{ x: 100, text: 'Move with A/D or the arrow keys. Space to jump.' },
        { x: 570, text: 'Jump again in the air. Gold ideas show a safe route.' },
        { x: 1150, text: 'Land on enemies, or dash through them with Shift / X.' },
        { x: 3750, text: 'Watch the warning, dodge the scan, then stomp or dash during the opening.' }]
    },
    {
      id: 'ship-it-city', name: 'Ship It City', subtitle: 'Ideas are good. Finished work is better.',
      objective: 'Ride the lifts, cross the works and stop Scope Creep.',
      theme: 'works', width: 5000, height: 540, spawn: { x: 96, y: 382 },
      platforms: [ground(0, 690), ground(820, 660, 400), ground(1610, 770), ground(2530, 500, 384),
        ground(3170, 430), ground(3710, 1290), ledge(460, 344), ledge(610, 292, 144),
        moving(1350, 310, 144, 95, 0, 0.022), ledge(1820, 332), ledge(2080, 232, 192),
        moving(1950, 340, 144, 0, 88, 0.021, -1.57), ledge(2660, 292),
        moving(3100, 300, 144, 96, 0, 0.025), ledge(3430, 282, 192), ledge(3880, 336)],
      enemies: [enemy('cv', 960, 400, 880, 1150, 1.4), enemy('inbox', 1320, 400, 1200, 1430),
        enemy('cv', 1720, 440, 1660, 1880, 1.4), enemy('inbox', 2290, 440, 2090, 2330),
        enemy('plane', 2780, 260, 2600, 2960, 1.7), enemy('cv', 3280, 440, 3220, 3500),
        enemy('inbox', 3950, 440, 3800, 4100)],
      collectibles: [skill(682, 240, 'delivery', 'From idea to delivery'),
        skill(2176, 180, 'building', 'Building useful products'),
        skill(3520, 230, 'iteration', 'Iteration and judgement'),
        ...arc(646, 310, 6, 38), ...arc(1430, 295, 6, 38), ...arc(2310, 306, 7, 40), ...arc(3530, 310, 7, 38)],
      checkpoints: [{ x: 1100, y: 400 }, { x: 4000, y: 440 }],
      springs: [{ x: 1770, y: 440, w: 44, h: 16 }], boosts: [],
      signoffs: [
        { x: 4250, label: 'BRIEF' }, { x: 4510, label: 'BUILD' }, { x: 4740, label: 'SHIP' }
      ],
      boss: { type: 'scopecreep', name: 'Scope Creep', x: 4350, floor: 440, w: 94, h: 88, health: 3 },
      decor: [{ type: 'sign', x: 100, y: 440, text: 'SHIP IT CITY' }, { type: 'crate', x: 340, y: 440 },
        { type: 'crane', x: 900, y: 400 }, { type: 'terminal', x: 1110, y: 400 },
        { type: 'crate', x: 1700, y: 440 }, { type: 'banner', x: 2280, y: 440 },
        { type: 'crane', x: 2550, y: 384 }, { type: 'terminal', x: 2870, y: 384 },
        { type: 'crate', x: 3350, y: 440 }, { type: 'sign', x: 4120, y: 440, text: 'DASH THROUGH LIT TERMINALS' }],
      hints: [{ x: 100, text: 'The lifts carry you. The lower route is always available.' },
        { x: 1680, text: 'Springs reveal higher routes and optional skill tokens.' },
        { x: 4110, text: 'Scope Creep keeps adding work. Dodge its charge and dash through each lit terminal to sign off the brief.' }]
    },
    {
      id: 'growth-run', name: 'Growth Run', subtitle: 'Keep the momentum. Keep learning.',
      objective: 'Follow the fast lanes and outmanoeuvre the Algorithm.',
      theme: 'growth', width: 5200, height: 540, spawn: { x: 96, y: 382 },
      platforms: [ground(0, 650), ground(850, 530), ground(1560, 660), ground(2420, 590),
        ground(3210, 650), ground(4020, 1180), ledge(420, 342, 192),
        ledge(1050, 318), moving(1360, 306, 144, 90, 0, 0.027), ledge(1760, 320),
        ledge(1960, 228, 192), ledge(2600, 320, 192), moving(3020, 300, 144, 0, 65, 0.025),
        ledge(3570, 308, 192), ledge(4120, 322)],
      enemies: [enemy('plane', 1030, 300, 900, 1260, 1.8), enemy('cv', 1180, 440, 950, 1310, 1.5),
        enemy('inbox', 1840, 440, 1620, 2100, 1.4), enemy('plane', 2160, 304, 1950, 2240, 2),
        enemy('plane', 2690, 300, 2490, 2910, 2), enemy('cv', 2810, 440, 2500, 2940, 1.5),
        enemy('inbox', 3440, 440, 3290, 3770, 1.4), enemy('plane', 3770, 304, 3550, 3950, 1.9),
        enemy('cv', 4170, 440, 4070, 4300, 1.5)],
      collectibles: [skill(524, 290, 'curiosity', 'Curiosity and learning'),
        skill(2056, 176, 'systems', 'Systems thinking'),
        skill(3666, 256, 'growth', 'Experiments and growth'),
        ...arc(584, 310, 9, 38), ...arc(1300, 310, 9, 38), ...arc(2150, 310, 9, 38),
        ...arc(2940, 308, 9, 38), ...arc(3790, 310, 8, 38)],
      checkpoints: [{ x: 1250, y: 440 }, { x: 4270, y: 440 }],
      springs: [{ x: 1690, y: 440, w: 44, h: 16 }],
      boosts: [{ x: 300, y: 440, w: 280 }, { x: 1720, y: 440, w: 380 }, { x: 3300, y: 440, w: 390 }],
      boss: { type: 'algorithm', name: 'The Algorithm', x: 4550, floor: 405, w: 88, h: 76, health: 3 },
      decor: [{ type: 'sign', x: 90, y: 440, text: 'GROWTH RUN' }, { type: 'banner', x: 330, y: 440 },
        { type: 'satellite', x: 890, y: 440 }, { type: 'terminal', x: 1260, y: 440 },
        { type: 'banner', x: 1790, y: 440 }, { type: 'satellite', x: 2580, y: 440 },
        { type: 'terminal', x: 3480, y: 440 }, { type: 'sign', x: 4300, y: 440, text: 'READ THE PATTERN' }],
      hints: [{ x: 100, text: 'Cyan lanes give you a burst of speed. Jump before the edge.' },
        { x: 2460, text: 'Planes are safe to stomp from above. Keep one jump in reserve.' },
        { x: 4280, text: 'The Algorithm fires a pattern, then cools down. Time your opening.' }]
    },
    {
      id: 'final-interview', name: 'Final Interview HQ', subtitle: 'Bring the work. Be yourself.',
      objective: 'Climb the headquarters and meet your interview host.',
      theme: 'hq', width: 4200, height: 540, spawn: { x: 96, y: 382 },
      platforms: [ground(0, 620), ground(720, 580, 400), ground(1410, 510, 360), ground(2040, 480, 400),
        ground(2640, 540, 360), ground(3300, 900, 320), ledge(370, 338, 192),
        ledge(850, 290), moving(1210, 250, 144, 80, 0, 0.02), ledge(1640, 222, 192),
        ledge(2160, 292), moving(2460, 270, 144, 0, 65, 0.02), ledge(2910, 242, 192),
        ledge(3350, 210, 144)],
      enemies: [enemy('cv', 850, 400, 770, 1030), enemy('plane', 1180, 266, 1010, 1320, 1.6),
        enemy('inbox', 1570, 360, 1470, 1830), enemy('cv', 2270, 400, 2100, 2440, 1.3),
        enemy('plane', 2790, 246, 2690, 3030, 1.6), enemy('inbox', 3000, 360, 2820, 3100)],
      collectibles: [skill(466, 286, 'storytelling', 'Storytelling'),
        skill(1736, 170, 'collaboration', 'Collaboration'),
        skill(3006, 190, 'judgement', 'Creative judgement'),
        ...arc(575, 300, 6, 36), ...arc(1240, 270, 6, 38), ...arc(1850, 260, 7, 38),
        ...arc(2450, 280, 7, 38), ...arc(3100, 240, 7, 38)],
      checkpoints: [{ x: 1100, y: 400 }, { x: 3390, y: 320 }],
      springs: [{ x: 1450, y: 360, w: 44, h: 16 }], boosts: [],
      boss: { type: 'finalreview', name: 'Interview host', x: 3550, floor: 320, w: 84, h: 88, health: 3 },
      decor: [{ type: 'sign', x: 90, y: 440, text: 'FINAL INTERVIEW HQ' }, { type: 'tree', x: 520, y: 440 },
        { type: 'terminal', x: 1110, y: 400 }, { type: 'banner', x: 1460, y: 360 },
        { type: 'satellite', x: 2180, y: 400 }, { type: 'terminal', x: 2860, y: 360 },
        { type: 'sign', x: 3330, y: 320, text: 'BRING YOUR STORY' }, { type: 'banner', x: 3930, y: 320 }],
      hints: [{ x: 100, text: 'The final climb. Checkpoints keep your progress safe.' },
        { x: 3320, text: 'The interview host has your file. Head through the doors and choose what to talk about.' }]
    }
  ];

  const bonusItems = [
    { id: 'chatgpt-pass', x: 189, y: 397, badge: 'GPT', colour: '#9ce8cf', title: 'ChatGPT subscription', line: 'One quick question. A 14-point plan.' },
    { id: 'claude-pass', x: 189, y: 397, badge: 'CLD', colour: '#f7ad8d', title: 'Claude subscription', line: 'It estimated the fix at one change. The diff has notes.' },
    { id: 'cold-coffee', x: 189, y: 397, badge: 'COF', colour: '#ffc977', title: 'Cold coffee', line: 'Hot when the build started.' },
    { id: 'final-final', x: 189, y: 397, badge: 'ZIP', colour: '#cbb7fa', title: 'FINAL_final_ACTUALLY_FINAL.zip', line: 'There’s a newer one.' }
  ];

  const LEVELS = definitions.map((level, levelIndex) => {
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
    const finalGround = level.platforms.filter(p => p.type === 'ground').at(-1);
    level.exit = { x: level.width - 160, y: finalGround.y - 104, w: 84, h: 104 };
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
