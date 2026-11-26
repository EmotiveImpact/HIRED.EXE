'use strict';
// Run with: node --test tests/simulation.test.js
// These are simulation tests. The input-driven route test never teleports,
// changes boss health or marks a level complete on behalf of the engine.
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/levels.js');
const { Game, PHYSICS } = require('../src/simulation.js');
const { LEVELS } = globalThis.Hired;
const tick = (game, input = {}, count = 1) => { for (let i = 0; i < count; i++) game.step(input); };
const controller = require('./route-controller.js');
const gameAtStart = (index = 0, options = {}) => { const game = new Game(); game.start(index, options); tick(game, {}, 2); game.drainEvents(); return game; };

test('four level layouts have distinct topology, regular checkpoints and three skills', () => {
  assert.deepEqual(LEVELS.map(l => l.width), [9350, 12880, 12920, 10500]);
  for (const l of LEVELS) {
    assert.ok(l.checkpoints.length >= 3);
    // No stretch between saves is longer than about ten seconds of running.
    const saves = [0, ...l.checkpoints.map(cp => cp.x), l.boss.x];
    for (let i = 1; i < saves.length; i++) assert.ok(saves[i] - saves[i - 1] <= 3400, `${l.name} save gap ${saves[i] - saves[i - 1]}`);
    assert.equal(l.collectibles.filter(c => c.kind === 'skill').length, 3);
    assert.ok(l.exit.x > l.boss.x);
    const grounds = l.platforms.filter(p => p.type === 'ground');
    // Only a gap bridged by a ride platform may be wider than a double jump.
    const sorted = [...grounds].sort((a, b) => a.x - b.x);
    let reach = 0;
    for (const g of sorted) {
      const bridged = l.platforms.some(p => p.ride && p.baseX - p.rangeX <= reach + 1 && p.baseX + p.rangeX + p.w >= g.x - 1);
      if (reach) assert.ok(g.x - reach <= 200 || bridged, `${l.name} gap before ${g.x}`);
      reach = Math.max(reach, g.x + g.w);
    }
  }
  assert.equal(new Set(LEVELS.map(l => JSON.stringify(l.platforms))).size, 4);
});

test('fixed-step accumulator gives the same movement at 30 Hz, 60 Hz and 120 Hz', () => {
  const a = gameAtStart(), b = gameAtStart(), c = gameAtStart();
  for (let i = 0; i < 60; i++) a.step({ right: true }, 1 / 60);
  for (let i = 0; i < 120; i++) b.step({ right: true }, 1 / 120);
  for (let i = 0; i < 30; i++) c.step({ right: true }, 1 / 30);
  assert.equal(a.state.player.x, b.state.player.x);
  assert.equal(a.state.player.y, b.state.player.y);
  assert.equal(a.state.tick, b.state.tick);
  assert.equal(a.state.player.x, c.state.player.x);
  assert.equal(a.state.player.y, c.state.player.y);
  assert.equal(a.state.tick, c.state.tick);
});

test('full jumps, released jumps and a second jump have useful distinct heights', () => {
  const held = gameAtStart(), cut = gameAtStart();
  held.step({ jumpPressed: true, jumpHeld: true });
  cut.step({ jumpPressed: true, jumpHeld: true });
  tick(held, { jumpHeld: true }, 18); tick(cut, { jumpHeld: false }, 18);
  assert.ok(cut.state.player.y - held.state.player.y > 45);
  const before = held.state.player.y;
  held.step({ jumpPressed: true, jumpHeld: true });
  assert.equal(held.state.player.jumps, 2);
  assert.ok(held.state.player.vy < -12);
  tick(held, { jumpHeld: true }, 12);
  assert.ok(held.state.player.y < before - 80);
});

test('coyote time accepts a jump just after leaving a ledge', () => {
  const g = gameAtStart(), p = g.state.player;
  Object.assign(p, { x: 750, y: 382, vx: 6.2, grounded: true, groundId: 'platform-0' });
  while (p.grounded) g.step({ right: true });
  tick(g, { right: true }, 2);
  g.step({ right: true, jumpPressed: true, jumpHeld: true });
  assert.ok(p.vy < -12); assert.equal(p.jumps, 1);
});

test('a buffered jump fires on landing after both air jumps have been used', () => {
  const g = gameAtStart(), p = g.state.player;
  Object.assign(p, { x: 200, y: 365, vy: 8, grounded: false, groundId: null, coyote: 0, jumps: 2 });
  g.step({ jumpPressed: true, jumpHeld: true });
  tick(g, { jumpHeld: true }, 4);
  assert.ok(p.vy < -10); assert.equal(p.jumps, 1);
});

test('moving platforms carry their rider and keep the feet on the surface', () => {
  const g = gameAtStart(1); tick(g, {}, 20);
  const platform = g.state.world.platforms.find(p => p.type === 'moving');
  const p = g.state.player;
  Object.assign(p, { x: platform.x + 40, y: platform.y - p.h, vx: 0, vy: 0, grounded: true, groundId: platform.id });
  const startX = p.x, platformStart = platform.x;
  tick(g, {}, 25);
  assert.ok(Math.abs((p.x - startX) - (platform.x - platformStart)) < 0.0001);
  assert.ok(Math.abs(p.y + p.h - platform.y) < 0.0001);
  assert.equal(p.groundId, platform.id);
});

test('one-way platforms allow ascent and catch downward movement', () => {
  const g = gameAtStart(), p = g.state.player, platform = g.state.world.platforms.find(p => p.type === 'platform');
  Object.assign(p, { x: platform.x + 50, y: platform.y + 12, vy: -8, grounded: false, jumps: 1, coyote: 0 });
  tick(g, { jumpHeld: true }, 3); assert.ok(p.y < platform.y + 12);
  Object.assign(p, { x: platform.x + 50, y: platform.y - p.h - 12, vy: 14, grounded: false });
  g.step({ jumpHeld: true });
  assert.equal(p.y + p.h, platform.y); assert.equal(p.groundId, platform.id);
});

test('stomps defeat enemies and bounce the player', () => {
  const g = gameAtStart(), e = g.state.enemies[0], p = g.state.player;
  Object.assign(p, { x: e.x + 4, y: e.y - p.h - 7, vy: 6, grounded: false, coyote: 0, jumps: 1 });
  tick(g, { jumpHeld: true }, 3);
  assert.equal(e.alive, false); assert.ok(p.vy < 0);
  assert.ok(g.drainEvents().some(e => e.type === 'stomp'));
});

test('checkpoints heal and retries preserve collected work', () => {
  const g = gameAtStart(), p = g.state.player, first = g.state.world.checkpoints[0];
  Object.assign(p, { x: first.x, y: 382, health: 1 }); g.step({});
  assert.equal(g.state.checkpoint.id, first.id); assert.equal(p.health, 3);
  const coin = g.state.world.collectibles.find(c => c.kind === 'coin' && !c.collected);
  Object.assign(p, { x: coin.x - 17, y: coin.y - 30, vy: 0 }); g.step({});
  const coins = g.state.coins;
  assert.ok(coins > 0);
  g.state.player.y = 710; g.step({});
  assert.equal(g.state.deaths, 1); assert.equal(g.state.coins, coins);
  assert.equal(g.state.player.x, g.state.checkpoint.x);
  assert.equal(g.state.player.health, 3);
});

test('each death costs a life and the last one restarts the world', () => {
  const g = gameAtStart(0), p = g.state.player;
  assert.equal(g.state.lives, PHYSICS.lives);
  const first = g.state.world.checkpoints[0];
  Object.assign(p, { x: first.x, y: 382 }); g.step({});
  assert.equal(g.state.checkpoint.id, first.id);
  g.drainEvents();
  for (let left = PHYSICS.lives - 1; left > 0; left--) {
    g.state.player.y = 710; g.step({});
    const respawn = g.drainEvents().find(e => e.type === 'respawn');
    assert.equal(respawn.lives, left); assert.equal(g.state.lives, left);
    assert.equal(g.state.player.health, 3);
  }
  g.state.player.y = 710; g.step({});
  const events = g.drainEvents();
  assert.equal(g.state.lives, 0);
  assert.ok(events.some(e => e.type === 'gameOver' && e.levelIndex === 0));
  assert.ok(!events.some(e => e.type === 'respawn'));
});

test('relaxed mode never loses lives and fifty ideas earn one', () => {
  const relaxed = gameAtStart(0, { assist: true });
  for (let i = 0; i < 5; i++) { relaxed.state.player.y = 710; relaxed.step({}); }
  assert.equal(relaxed.state.lives, PHYSICS.lives);
  assert.ok(!relaxed.drainEvents().some(e => e.type === 'gameOver'));
  const g = gameAtStart(0), p = g.state.player;
  g.state.coins = 49;
  const coin = g.state.world.collectibles.find(c => c.kind === 'coin' && !c.collected);
  Object.assign(p, { x: coin.x - 17, y: coin.y - 30, vy: 0 }); g.step({});
  assert.equal(g.state.coins, 50); assert.equal(g.state.lives, PHYSICS.lives + 1);
  assert.ok(g.drainEvents().some(e => e.type === 'extraLife' && e.coins === 50));
});

test('damage is bounded by invulnerability and assist prevents damage', () => {
  const normal = gameAtStart(), assist = gameAtStart(0, { assist: true });
  normal.hurt(500); normal.hurt(500);
  assert.equal(normal.state.player.health, 2);
  assist.hurt(500); assert.equal(assist.state.player.health, 3);
  assert.equal(normal.state.player.invulnerable, 90);
});

test('the player can reverse direction on a boost lane', () => {
  const g = gameAtStart(2), p = g.state.player;
  Object.assign(p, { x: 350, y: 382, vx: PHYSICS.boostSpeed, facing: 1, grounded: true, groundId: 'platform-0' });
  g.step({ right: true });
  assert.ok(p.boostTime > 0);
  tick(g, { left: true }, 22);
  assert.ok(p.vx < 0); assert.equal(p.facing, -1);
});

test('bosses accept a stomp only during their opening', () => {
  for (const vulnerable of [false, true]) {
    const g = gameAtStart(), p = g.state.player, b = g.state.boss;
    Object.assign(b, { active: true, phase: vulnerable ? 'vulnerable' : 'telegraph', timer: 100 });
    Object.assign(p, { x: b.x + 20, y: b.y - p.h - 3, vy: 6, grounded: false, coyote: 0, jumps: 1 });
    g.step({ jumpHeld: true });
    assert.equal(b.health, vulnerable ? b.maxHealth - 1 : b.maxHealth);
    assert.equal(p.health, 3);
  }
});

test('input-only controller can cross every layout, defeat its boss and reach the exit', () => {
  for (let level = 0; level < LEVELS.length; level++) {
    const g = gameAtStart(level, { assist: true });
    for (let frame = 0; frame < 15000 && g.state.mode !== 'complete'; frame++) g.step(controller(g));
    const s = g.state;
    assert.equal(s.mode, 'complete', `Level ${level + 1} stopped at x=${s.player.x.toFixed(1)}, y=${s.player.y.toFixed(1)}, phase=${s.boss.phase}, hp=${s.boss.health}, deaths=${s.deaths}`);
    assert.equal(s.boss.health, 0);
    assert.equal(s.deaths, 0, `Level ${level + 1} route should not require a pit retry`);
    assert.ok(s.coins > 0);
    assert.ok(s.world.checkpoints.every(cp => cp.active));
    console.log(`Input route: world ${level + 1}, ${s.time.toFixed(1)}s, ${s.coins} ideas, ${s.skills.length}/3 skills, zero falls, boss defeated through input.`);
  }
});

test('input-only controller can complete normal mode without an endless damage loop', () => {
  for (let level = 0; level < LEVELS.length; level++) {
    const g = gameAtStart(level);
    for (let frame = 0; frame < 20000 && g.state.mode !== 'complete'; frame++) g.step(controller(g));
    const s = g.state;
    assert.equal(s.mode, 'complete', `Normal world ${level + 1}: x=${s.player.x.toFixed(1)}, y=${s.player.y.toFixed(1)}, phase=${s.boss.phase}, hp=${s.boss.health}, deaths=${s.deaths}`);
    assert.ok(s.deaths <= 2, `Normal world ${level + 1} needed too many retries: ${s.deaths}`);
    console.log(`Normal input route: world ${level + 1}, ${s.time.toFixed(1)}s, ${s.deaths} retries, ${s.player.health} hearts at exit.`);
  }
});

test('checkpoint records resume normal geometry and keep only recognised collectibles and enemies', () => {
  const original = gameAtStart(1);
  for (let i = 0; i < 5000 && original.state.checkpoint.id === 'start'; i++) original.step(controller(original));
  const record = JSON.parse(JSON.stringify(original.checkpointRecord()));
  assert.ok(record.collected.length);
  record.collected.push('unknown-id');
  const fresh = gameAtStart(1);
  assert.equal(fresh.restoreCheckpoint(record), true);
  assert.deepEqual(fresh.state.checkpoint, original.state.checkpoint);
  assert.equal(fresh.state.coins, original.state.coins);
  assert.deepEqual(fresh.state.skills, original.state.skills);
  assert.equal(fresh.state.player.x, fresh.state.checkpoint.x);
  assert.equal(fresh.state.deaths, original.state.deaths);
  assert.equal(fresh.state.time, original.state.time);
  assert.equal(gameAtStart(0).restoreCheckpoint(record), false);
  assert.equal(gameAtStart(1).restoreCheckpoint({...record,checkpoint:'retired'}), false);
});

test('each world has one discoverable field note and the final host welcomes without combat after three rounds', () => {
  for (const level of LEVELS) assert.equal(level.collectibles.filter(item => item.secret).length, 1);
  const game = gameAtStart(3);
  for(let i = 0; game.state.mode !== 'complete' && i < 6000; i++) game.step(controller(game));
  const events = game.drainEvents();
  assert.ok(events.some(e => e.type === 'welcome'));
  assert.equal(events.filter(e => e.type === 'roundCleared').length, 3);
  const afterRounds = events.slice(events.map(e => e.type).lastIndexOf('roundCleared') + 1);
  assert.ok(!afterRounds.some(e => ['bossHit','shot','bossDefeated','signoff'].includes(e.type)));
});

test('all twelve skill tokens and four upper-route field notes are reachable using movement alone', () => {
  for (let level = 0; level < LEVELS.length; level++) {
    const game = new Game();
    game.start(level);
    for (let tick = 0; tick < 18000 && game.state.mode === 'playing'; tick++) {
      const {player,world} = game.state;
      const token = world.collectibles.find(item => item.kind === 'skill' && !item.collected);
      const input = controller(game);
      if (token) {
        const distance = token.x - player.x - player.w / 2;
        if (Math.abs(distance) < 230) {
          input.right = distance > 5; input.left = distance < -5;
          const needsHeight = player.jumps === 1 && player.vy > -1 && token.y < player.y + 30;
          if (player.grounded || needsHeight) input.jumpPressed = true;
        }
      }
      game.step(input);
    }
    assert.equal(game.state.skills.length, 3, game.state.world.name);
    assert.ok(game.state.world.collectibles.filter(item => item.secret).every(item => item.collected));
    assert.equal(game.state.mode, 'complete');
  }
});

test('the keyword gate stays shut until all three keywords are collected', () => {
  const g = gameAtStart(0), p = g.state.player;
  const gate = g.state.world.platforms.find(pl => pl.type === 'gate');
  Object.assign(p, { x: gate.x - 120, y: 382 });
  tick(g, { right: true }, 90);
  assert.ok(p.x + p.w <= gate.x, 'the closed gate blocks the street');
  const keys = g.state.world.collectibles.filter(item => item.kind === 'key');
  assert.equal(keys.length, 3);
  for (const k of keys) { Object.assign(p, { x: k.x - 17, y: k.y - 30, vx: 0, vy: 0 }); g.step({}); }
  assert.equal(g.state.keys, 3);
  assert.ok(!g.state.world.platforms.some(pl => pl.type === 'gate'));
  assert.ok(g.drainEvents().some(e => e.type === 'gateOpen'));
});

test('every world keeps one finish line, after its boss, at the end of the level', () => {
  for (let level = 0; level < LEVELS.length; level++) {
    const g = gameAtStart(level), l = LEVELS[level];
    assert.equal(g.state.fakeExit, null, `${l.name} has a decoy exit`);
    assert.ok(l.exit.x > l.boss.x, `${l.name} exit before boss`);
    assert.ok(l.width - l.exit.x <= 400, `${l.name} exit is not at the end`);
    assert.equal(g.state.world.exit.x, l.exit.x, `${l.name} exit moved at start`);
  }
});

test('every finish portal stands on the ground beneath it', () => {
  for (const l of LEVELS) {
    const centre = l.exit.x + l.exit.w / 2;
    const floor = l.platforms.find(p => p.type === 'ground' && p.x <= centre && p.x + p.w >= centre);
    assert.equal(l.exit.y + l.exit.h, floor.y, `${l.name} portal floats or sinks`);
  }
});

test('Scope Creep terminals sit inside the arena, in order, with room for their labels', () => {
  const g = gameAtStart(1), b = g.state.boss, xs = b.signoffs.map(t => t.x);
  assert.equal(xs.length, b.maxHealth);
  for (let i = 0; i < xs.length; i++) {
    assert.ok(xs[i] - 55 >= b.arena[0] && xs[i] + 55 <= b.arena[1], `${b.signoffs[i].label} outside the arena`);
    if (i) assert.ok(xs[i] - xs[i - 1] >= 160, `${b.signoffs[i].label} crowds ${b.signoffs[i - 1].label}`);
  }
});

test('bosses walk back after a charge or a hit instead of jumping', () => {
  for (const level of [0, 1, 2]) {
    const g = gameAtStart(level), b = g.state.boss, p = g.state.player;
    Object.assign(p, { x: b.originX - 360, y: b.floor - p.h, vx: 0, vy: 0 });
    g.step({});
    assert.equal(b.active, true);
    Object.assign(b, { x: b.arena[0] + 4, phase: 'vulnerable', timer: 1 });
    let last = b.x;
    for (let i = 0; i < 60; i++) {
      Object.assign(p, { x: b.originX - 360, invulnerable: 99 }); g.step({});
      assert.ok(Math.abs(b.x - last) <= 3.001, `${LEVELS[level].name} boss jumped ${Math.round(b.x - last)}px`);
      last = b.x;
    }
  }
});

test('the Feed catches a player who stops and resets for the retry', () => {
  const g = gameAtStart(2), p = g.state.player, c = g.state.chase;
  Object.assign(p, { x: c.startX + 160, y: 382 }); tick(g, {}, 3);
  assert.equal(c.active, true);
  for (let i = 0; i < 400 && g.state.deaths === 0; i++) g.step({});
  assert.equal(g.state.deaths, 1); assert.equal(c.active, false);
  assert.ok(g.drainEvents().some(e => e.type === 'respawn' && e.reason === 'feed'));
});

test('the Feed arrives from off screen, stays in sight on any view and drops away once outrun', () => {
  const { FEED } = globalThis.Hired;
  for (const view of [960, 480]) {
    const g = new Game(); g.viewWidth = view; g.start(2, { assist: true });
    const s = g.state, c = s.chase, edges = [];
    let ended = -1;
    for (let frame = 0; frame < 9000 && ended < 0; frame++) {
      const was = c.active;
      g.step(controller(g));
      if (c.active) {
        if (!was) assert.ok(c.x < s.camera.x, `At ${view} wide the Feed should start off screen`);
        if (c.age > FEED.arrive + 30) edges.push(c.x - s.camera.x);
      } else if (was) ended = frame;
    }
    assert.ok(ended > 0, `At ${view} wide the route should outrun the Feed`);
    assert.equal(s.deaths, 0);
    assert.ok(Math.min(...edges) > 20, `At ${view} wide the Feed left the screen (${Math.min(...edges).toFixed(0)})`);
    assert.ok(Math.max(...edges) - Math.min(...edges) > 15, `At ${view} wide the Feed sat still against the edge of the screen`);
    // It does not vanish: it falls behind, harmless, and stays in the picture until it has dropped away.
    assert.equal(c.done, true); assert.equal(c.gone, 1);
    const sign = s.world.decor.find(d => d.text === 'YOU’RE ALL CAUGHT UP');
    assert.ok(c.endX > sign.x && c.endX < sign.x + 180, 'The chase should end at the sign that says so');
    let gap = s.player.x - c.x;
    while (c.gone < FEED.leave) {
      g.step(controller(g));
      assert.ok(c.x > s.camera.x, `At ${view} wide the Feed left the screen ${c.gone} ticks into dropping away`);
      assert.ok(s.player.x - c.x >= gap, 'The Feed should only fall further behind once outrun'); gap = s.player.x - c.x;
    }
    tick(g, {}, 200);
    assert.equal(s.deaths, 0); assert.equal(c.gone, FEED.leave);
  }
});

test('a player who stops has the same time before the Feed arrives on a wide and a narrow screen', () => {
  const caught = [960, 480].map(view => {
    const g = new Game(); g.viewWidth = view; g.start(2);
    const s = g.state, c = s.chase;
    // Run until the Feed has settled in behind, at the same point of its surge, then stand still.
    for (let frame = 0; frame < 9000 && !(c.active && c.age === 200); frame++) g.step(controller(g));
    assert.equal(c.age, 200);
    let ticks = 0;
    while (s.deaths === 0 && ticks < 600) { g.step({}); ticks++; }
    assert.equal(s.deaths, 1, `At ${view} wide the Feed never caught a player who stopped`);
    return ticks;
  });
  assert.ok(Math.abs(caught[0] - caught[1]) <= 8, `Caught after ${caught[0]} ticks on a wide screen and ${caught[1]} on a narrow one`);
});

test('a game saved with ideas the level no longer holds keeps them', () => {
  for (const [index, level] of LEVELS.entries()) {
    assert.ok(level.retiredPickups.length > 0);
    assert.ok(level.retiredPickups.every(id => !level.collectibles.some(c => c.id === id)));
    const first = level.checkpoints[0], kept = level.collectibles.find(c => c.kind === 'coin');
    const old = { level: index, checkpoint: first.id, collected: [kept.id, ...level.retiredPickups.slice(0, 3)], score: 400, time: 12, deaths: 0 };
    const g = gameAtStart(index);
    assert.equal(g.restoreCheckpoint(old), true);
    assert.equal(g.state.coins, 4);
    // Saving again does not forget them.
    const again = g.checkpointRecord();
    assert.deepEqual([...again.collected].sort(), [...old.collected].sort());
    const h = gameAtStart(index);
    assert.equal(h.restoreCheckpoint(again), true); assert.equal(h.state.coins, 4);
  }
});

test('signs stay readable, pickups stay out of ledges and no two save points share a screen', () => {
  LEVELS.forEach((level, index) => {
    const signs = level.decor.filter(d => d.type === 'sign');
    for (const sign of signs) {
      const legs = [sign.x + 15, sign.x + 165];
      const stands = level.platforms.some(p => p.y === sign.y && legs.every(x => x >= p.x && x <= p.x + p.w));
      assert.ok(stands, `${level.name}: "${sign.text}" has a leg over a gap`);
      const covered = level.collectibles.find(c => c.kind !== 'skill' && c.x > sign.x - 10 && c.x < sign.x + 190 && c.y > sign.y - 95 && c.y < sign.y - 18);
      assert.ok(!covered, `${level.name}: a ${covered?.kind} covers "${sign.text}"`);
      const save = level.checkpoints.find(cp => cp.y === sign.y && cp.x + 40 > sign.x && cp.x - 8 < sign.x + 180);
      assert.ok(!save, `${level.name}: a save point stands in front of "${sign.text}"`);
    }
    const fixed = level.platforms.filter(p => !p.rangeX && !p.rangeY && p.type !== 'furniture');
    const buried = level.collectibles.find(c => fixed.some(p => c.x > p.x && c.x < p.x + p.w && c.y > p.y && c.y < p.y + p.h));
    assert.ok(!buried, `${level.name}: a ${buried?.kind} at x ${buried?.x} is inside a platform`);
    level.checkpoints.forEach((cp, i) => {
      const next = level.checkpoints[i + 1];
      assert.ok(!next || next.x - cp.x >= 500, `${level.name}: save points at ${cp.x} and ${next?.x} share a screen`);
    });
    // A game saved at a save point that has gone resumes at the one that stayed.
    for (const [old, kept] of Object.entries(level.checkpointAliases)) {
      const g = gameAtStart(index);
      assert.equal(g.restoreCheckpoint({ level: index, checkpoint: old }), true);
      assert.equal(g.state.checkpoint.id, kept);
    }
  });
});

test('main bosses escalate after two hits and interview rounds run in order', () => {
  assert.deepEqual(LEVELS.slice(0, 3).map(l => l.boss.health), [3, 4, 4]);
  const first = gameAtStart(0), cv = first.state.boss;
  assert.equal(cv.maxHealth, 3);
  Object.assign(cv, { active: true, phase: 'patrol', timer: 50, health: 1 }); first.step({});
  assert.equal(cv.enraged, false, 'the first boss stays simple');
  const g = gameAtStart(1), b = g.state.boss;
  assert.equal(b.maxHealth, 4);
  Object.assign(b, { active: true, phase: 'patrol', timer: 50, health: 2 }); g.step({});
  assert.equal(b.enraged, true);
  assert.ok(g.drainEvents().some(e => e.type === 'bossPhase'));
  const hq = gameAtStart(3);
  assert.deepEqual(hq.state.bossQueue.map(boss => boss.type), ['recruitmentbot', 'scopecreep', 'algorithm', 'finalreview']);
  assert.equal(hq.state.world.platforms.filter(pl => pl.type === 'gate' && typeof pl.needs === 'number').length, 3);
});

test('resuming at a late checkpoint skips the rounds already cleared', () => {
  const g = gameAtStart(3);
  const third = g.state.bossQueue[2];
  const before = g.state.world.checkpoints.filter(cp => cp.x < third.originX).at(-1);
  const record = { level: 3, checkpoint: before.id, collected: [], defeated: [], score: 0, time: 60, deaths: 0 };
  assert.equal(g.restoreCheckpoint(record), true);
  assert.equal(g.state.bossIndex, 2); assert.equal(g.state.boss.type, 'algorithm');
  assert.equal(g.state.floor, 2);
  // Only the wall behind this floor's lift is left to stop anyone.
  const gates = g.state.world.platforms.filter(pl => pl.type === 'gate');
  assert.deepEqual(gates.map(gate => gate.needs), [2]);
});

test('conveyors carry a standing player and presses hurt only when they slam', () => {
  const g = gameAtStart(1), p = g.state.player;
  const belt = g.state.world.platforms.find(pl => pl.belt > 0);
  Object.assign(p, { x: belt.x + 100, y: belt.y - p.h, vx: 0, vy: 0 }); tick(g, {}, 3);
  const startX = p.x; tick(g, {}, 20);
  assert.ok(Math.abs(p.x - startX - belt.belt * 20) < 0.001);
  const press = g.state.world.crushers[0];
  const phase = fraction => { g.state.tick = press.period * 10 + Math.round(press.period * fraction) - press.offset - 1; };
  Object.assign(p, { x: press.x + 30, y: press.floor - p.h, vx: 0, vy: 0, invulnerable: 0 });
  phase(0.2); g.step({}); assert.equal(p.health, 3);
  phase(0.62); g.step({}); assert.equal(p.health, 2);
});

test('each world has an open ledge beneath its two rows of bonus coins', () => {
  for (const level of LEVELS) {
    assert.ok(!level.platforms.some(p => p.type === 'wall' || p.type === 'breakable'));
    const terrace = level.platforms.find(p => p.w === 220 && level.collectibles.some(c =>
      c.x === p.x + 56 && c.y === p.y - 30));
    assert.ok(terrace && terrace.oneWay);
  }
});

test('the crane platform docks level with both banks and the all-time high gives way', () => {
  const ride = LEVELS[1].platforms.find(pl => pl.ride);
  const grounds = LEVELS[1].platforms.filter(pl => pl.type === 'ground');
  const from = ride.baseX - ride.rangeX, to = ride.baseX + ride.rangeX + ride.w;
  assert.ok(grounds.some(gr => gr.x + gr.w === from && gr.y === ride.y));
  assert.ok(grounds.some(gr => gr.x === to && gr.y === ride.y));
  const g = gameAtStart(2), p = g.state.player;
  const high = g.state.world.platforms.find(pl => pl.crumble), startY = high.y;
  Object.assign(p, { x: high.x + 60, y: high.y - p.h - 2, vx: 0, vy: 2 });
  tick(g, {}, 20); assert.equal(high.y, startY); assert.equal(p.groundId, high.id);
  tick(g, {}, 90);
  assert.equal(high.y, high.crumble.to); assert.equal(g.state.deaths, 0);
  assert.ok(p.y + p.h <= 440);
});

test('the charging boss can be defeated directly by dashing into its opening', () => {
  const g = gameAtStart(1), { boss, player } = g.state;
  Object.assign(boss, { active: true, phase: 'attack', timer: 1, facing: 1 });
  Object.assign(player, { x: boss.x - 100, y: boss.floor - player.h });
  g.step({});
  assert.ok(boss.timer >= 180);
  Object.assign(player, { x: boss.x - player.w - 4, y: boss.floor - player.h, facing: 1 });
  g.step({ dashPressed: true, right: true });
  assert.equal(boss.health, boss.maxHealth - 1);
});

test('clearing each interview round calls a lift that carries the player to a distinct, saved floor', () => {
  const g = gameAtStart(3, { assist: true }), p = g.state.player, L = globalThis.Hired.LIFT;
  for (const door of g.state.world.floorDoors) {
    const wall = g.state.world.platforms.find(pl => pl.type === 'gate' && pl.needs === door.round);
    Object.assign(p, { x: door.car - p.w / 2, y: door.y - p.h, vx: 0, vy: 0, grounded: true });
    g.setPieces();
    assert.equal(g.state.floorTransition, null, 'the lift stays shut until the round is cleared');
    g.clearBoss(g.state.boss);
    g.drainEvents();
    // The lift takes a moment to arrive and open, and announces itself.
    for (let i = 0; i < L.call + L.doors; i++) { g.setPieces(); assert.equal(g.state.floorTransition, null); }
    assert.deepEqual(g.drainEvents().map(e => e.type), ['liftCall', 'liftDing']);
    g.setPieces();
    assert.equal(g.state.floorTransition.door, door);
    // Step in, doors close, ride. Input does nothing until the player steps out upstairs.
    const phases = [];
    for (let i = 0; i < 400 && g.state.floorTransition; i++) {
      const { phase } = g.state.floorTransition;
      if (phases.at(-1) !== phase) phases.push(phase);
      assert.equal(g.state.floor, ['board', 'close', 'ride'].includes(phase) ? door.round : door.round + 1);
      tick(g, { left: true, jumpPressed: true }, 1);
    }
    assert.deepEqual(phases, ['board', 'close', 'ride', 'arrive', 'open', 'exit']);
    assert.equal(g.state.floorTransition, null);
    assert.equal(g.state.floor, door.round + 1);
    assert.equal(p.x, door.landing.x + 8);
    assert.equal(p.y + p.h, door.landing.y, 'the player steps out onto the floor');
    assert.equal(door.landing.y, 440, 'rooms keep their floor at floor height');
    assert.ok(g.state.camera.x >= g.state.world.floorScenes[g.state.floor].start);
    assert.equal(g.state.checkpoint.id, door.landing.id);
    assert.ok(g.state.world.platforms.includes(wall), 'the wall behind the lift stays solid');
    assert.deepEqual(g.drainEvents().map(e => e.type).filter(type => type.startsWith('lift')),
      ['liftDoor', 'liftMove', 'liftDing', 'liftDoor']);
  }
});

test('no idea, sign or save point stands in a lift doorway', () => {
  const hq = globalThis.Hired.LEVELS[3];
  for (const door of hq.floorDoors) {
    for (const x of [door.car, door.arrival.x]) {
      const near = item => Math.abs(item.x - x) < 64;
      assert.ok(!hq.collectibles.some(item => item.kind === 'coin' && near(item)));
      assert.ok(!hq.checkpoints.some(near));
      assert.ok(!hq.decor.some(near));
    }
    const ground = hq.platforms.find(pl => pl.type === 'ground' && pl.x <= door.arrival.x - 64 && pl.x + pl.w >= door.landing.x + 60);
    assert.equal(ground?.y, door.arrival.y, 'solid floor runs from the lift to the save point');
  }
});

test('room furniture stands on the floor at the size it was cut, and leaves the arena clear', () => {
  const hq = globalThis.Hired.LEVELS[3];
  const frames = require('../assets/production/environment/furniture-atlas.json').frames;
  const pieces = hq.decor.filter(item => item.type === 'furniture');
  for (const room of hq.floorScenes.slice(1)) {
    assert.ok(pieces.some(item => item.x > room.start && item.x < room.end), `${room.title} is furnished`);
  }
  for (const item of pieces) {
    assert.deepEqual([item.w, item.h], [frames[item.piece].w, frames[item.piece].h], `${item.piece} matches the atlas`);
    const support = [...hq.platforms].filter(pl => pl.x <= item.x + item.w / 2 && pl.x + pl.w >= item.x + item.w / 2 && pl.y === item.y);
    assert.ok(support.length, `${item.piece} stands on something`);
  }
  const tops = hq.platforms.filter(pl => pl.type === 'furniture');
  assert.ok(tops.length >= 6);
  for (const top of tops) assert.ok(top.y < 440 && 440 - top.y <= 110, `${top.piece} can be reached with one jump`);
  const arena = hq.rounds.find(round => round.arena).arena;
  assert.ok(!tops.some(top => top.x + top.w > arena[0] && top.x < arena[1]), 'nothing to stand on inside the arena');
  // A piece can be stood on from above and walked past from the side.
  const game = gameAtStart(3), p = game.state.player, desk = tops.find(top => top.piece === 'desk');
  game.state.floor = 1;
  Object.assign(p, { x: desk.x + desk.w / 2 - p.w / 2, y: desk.y - p.h - 30, vx: 0, vy: 0 });
  tick(game, {}, 30);
  assert.equal(p.y + p.h, desk.y, 'lands on the desk');
  Object.assign(p, { x: desk.x - 80, y: 440 - p.h, vx: 0, vy: 0 });
  tick(game, { right: true }, 40);
  assert.ok(p.x > desk.x + desk.w, 'walks past the desk');
});

test('cutscene panels: every ready panel exists and is used, and every beat id is well formed', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  require('../src/scenes.js');
  const { SCENES, PANELS } = globalThis.Hired;
  const used = new Set(SCENES.flatMap(s => s.beats.map(b => b.panel).filter(Boolean)));
  for (const id of used) assert.match(id, /^p\d\d-[a-z0-9-]+$/, id);
  assert.equal(used.size, 20);
  assert.equal(SCENES.flatMap(scene => scene.beats).length, used.size);
  for (const id of PANELS.ready) {
    assert.ok(used.has(id), `${id} is ready but no beat uses it`);
    assert.ok(fs.existsSync(path.join(__dirname, '..', PANELS.folder, id + '.jpg')), `${id}.jpg is missing`);
  }
});

test('the Feed has its art: a leading edge taller than the screen, its face inside it, and six icons', () => {
  const feed = require('../assets/production/enemies/feed-atlas.json');
  const front = feed.frames.front;
  assert.ok(front.h >= 550, 'tall enough to bob without showing an end');
  assert.ok(feed.edge > 100 && feed.edge < front.w, 'the face stands inside the picture, with the body behind it');
  assert.ok(feed.crest[0] >= feed.edge && feed.crest[1] < front.h / 2, 'the crest leads from the upper half');
  for (const icon of ['heart', 'like', 'bell', 'badge', 'bubble', 'share']) assert.ok(feed.frames[icon]?.w > 8, `${icon} is cut out`);
  assert.ok(feed.body.size[0] >= 200 && feed.body.size[1] >= 200, 'the body tile is big enough to repeat quietly');
});
