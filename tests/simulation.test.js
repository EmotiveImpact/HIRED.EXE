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
const gameAtStart = (index = 0, options = {}) => { const game = new Game(); game.start(index, options); tick(game, {}, 2); game.drainEvents(); return game; };

test('four level layouts have distinct topology, two checkpoints and three skills', () => {
  assert.deepEqual(LEVELS.map(l => l.width), [4600, 5000, 5200, 4200]);
  for (const l of LEVELS) {
    assert.equal(l.checkpoints.length, 2);
    assert.equal(l.collectibles.filter(c => c.kind === 'skill').length, 3);
    assert.ok(l.exit.x > l.boss.x);
    const grounds = l.platforms.filter(p => p.type === 'ground');
    for (let i = 1; i < grounds.length; i++) assert.ok(grounds[i].x - (grounds[i - 1].x + grounds[i - 1].w) <= 200);
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
  const g = gameAtStart(), p = g.state.player;
  Object.assign(p, { x: 1370, y: 382, health: 1 }); g.step({});
  assert.equal(g.state.checkpoint.id, 'checkpoint-0'); assert.equal(p.health, 3);
  const coin = g.state.world.collectibles.find(c => c.kind === 'coin' && !c.collected);
  Object.assign(p, { x: coin.x - 17, y: coin.y - 30, vy: 0 }); g.step({});
  const coins = g.state.coins;
  assert.ok(coins > 0);
  g.state.player.y = 710; g.step({});
  assert.equal(g.state.deaths, 1); assert.equal(g.state.coins, coins);
  assert.equal(g.state.player.x, g.state.checkpoint.x);
  assert.equal(g.state.player.health, 3);
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
    assert.equal(b.health, vulnerable ? 2 : 3);
    assert.equal(p.health, vulnerable ? 3 : 2);
  }
});

const controller = require('./route-controller.js');

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

test('each world has one discoverable field note and the final host welcomes without combat', () => {
  for (const level of LEVELS) assert.equal(level.collectibles.filter(item => item.secret).length, 1);
  const game = gameAtStart(3);
  for(let i = 0; game.state.mode !== 'complete' && i < 6000; i++) game.step(controller(game));
  const events = game.drainEvents();
  assert.ok(events.some(e => e.type === 'welcome'));
  assert.ok(!events.some(e => ['bossHit','shot','bossDefeated'].includes(e.type)));
});
