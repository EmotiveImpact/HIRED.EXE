(function (root) {
  'use strict';
  const H = root.Hired = root.Hired || {};
  const WIDTH = 960, HEIGHT = 540, STEP = 1 / 60;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const centre = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  const PHYSICS = Object.freeze({ lives: 3, maxLives: 9, gravity: 0.66, jump: 14.6, doubleJump: 13.5, runSpeed: 6.2,
    boostSpeed: 8.8, dashSpeed: 13.2, dashFrames: 11, dashCooldown: 48, coyoteFrames: 7, bufferFrames: 8 });

  // The HQ lift, in ticks: how long it takes to answer a call, to work its doors, to leave a floor
  // and to pull in at the next, and how far a passenger steps each tick.
  const LIFT = Object.freeze({ call: 40, doors: 22, ride: 50, arrive: 26, step: 3 });
  // The Feed, in ticks: how long it takes to arrive and to drop away, and how far and how fast it surges.
  const FEED = Object.freeze({ arrive: 50, leave: 40, surge: 0.14, pulse: 0.05 });

  class Game {
    constructor() {
      this.viewWidth = WIDTH; this.state = null; this.events = []; this.accumulator = 0; this.pendingJump = false; this.pendingDash = false;
    }
    start(index = 0, options = {}) {
      const world = H.createLevel(index);
      // Interview rounds are fought in order; the world's own boss is always last.
      const bossQueue = [...(world.rounds || []), world.boss].map(def => ({ ...def, y: def.floor - def.h, originX: def.x,
        baseY: def.floor - def.h, maxHealth: def.health, phase: 'dormant', enraged: Boolean(def.enraged),
        signoffs: def.signoffs || (def === world.boss ? world.signoffs : null) || null,
        arena: def.arena || [world.width - 870, world.width - 270],
        timer: 0, active: false, alive: true, hitCooldown: 0, facing: -1, cycle: 0 }));
      const boss = bossQueue[0];
      const chase = world.chase ? { ...world.chase, x: world.chase.startX - world.chase.lead, active: false, done: false } : null;
      const fakeExit = world.fakeExit ? { ...world.fakeExit, triggered: false, timer: 0 } : null;
      this.state = { mode: 'playing', levelIndex: world.levelIndex, world, player: this.makePlayer(world.spawn),
        camera: { x: 0, y: 0 }, score: 0, coins: 0, skills: [], checkpoint: { ...world.spawn, id: 'start' },
        enemies: world.enemies, boss, bossQueue, bossIndex: 0, chase, fakeExit, floor: 0, floorTransition: null, keys: 0, particles: [], projectiles: [], time: 0, tick: 0, deaths: 0,
        lives: PHYSICS.lives,
        assist: Boolean(options.assist), hintsShown: [], completed: false };
      this.events = []; this.accumulator = 0; this.pendingJump = false; this.pendingDash = false;
      this.emit('start', { levelIndex: world.levelIndex });
      return this.state;
    }
    checkpointRecord() {
      const s = this.state;
      if (!s || s.checkpoint.id === 'start') return null;
      return { level: s.levelIndex, checkpoint: s.checkpoint.id,
        collected: s.world.collectibles.filter(i => i.collected).map(i => i.id),
        defeated: s.enemies.filter(e => !e.alive).map(e => e.id),
        score: s.score, time: s.time, deaths: s.deaths };
    }
    restoreCheckpoint(record) {
      const s = this.state;
      if (!record || record.level !== s.levelIndex) return false;
      // A save made at a save point that has since been removed resumes at the one that replaced it.
      let id = record.checkpoint;
      while (s.world.checkpointAliases?.[id]) id = s.world.checkpointAliases[id];
      const cp = s.world.checkpoints.find(point => point.id === id);
      if (!cp) return false;
      const picked = new Set(Array.isArray(record.collected) ? record.collected : []);
      const defeated = new Set(Array.isArray(record.defeated) ? record.defeated : []);
      for (const item of s.world.collectibles) {
        item.collected = picked.has(item.id);
        if (item.collected && item.kind === 'skill') s.skills.push(item.skill.id);
        else if (item.collected && item.kind === 'coin') s.coins++;
        else if (item.collected && item.kind === 'key') s.keys++;
      }
      // Rounds, the chase and the false finish behind the checkpoint are already history.
      while (s.bossIndex < s.bossQueue.length - 1 && s.boss.originX < cp.x) {
        s.boss.alive = false; s.boss.health = 0; s.boss.phase = 'defeated';
        s.boss = s.bossQueue[++s.bossIndex];
      }
      if (s.chase) s.chase.done = cp.x >= s.chase.endX;
      if (s.fakeExit) s.fakeExit.triggered = cp.x > s.fakeExit.x;
      s.world.platforms = s.world.platforms.filter(pl => pl.type !== 'gate' || pl.x > cp.x);
      this.openGates(true);
      for (const enemy of s.enemies) enemy.alive = !defeated.has(enemy.id);
      for (const point of s.world.checkpoints) point.active = point.x <= cp.x;
      const number = n => Number.isFinite(n) && n >= 0 ? n : 0;
      s.score = Math.floor(number(record.score)); s.time = number(record.time); s.deaths = Math.floor(number(record.deaths));
      s.checkpoint = { id: cp.id, x: cp.x + 8, y: cp.y - s.player.h };
      s.player = this.makePlayer(s.checkpoint);
      s.player.invulnerable = 75;
      s.floor = s.world.floorDoors?.filter(door => cp.x >= door.landing.x).length ?? 0;
      s.camera.x = this.cameraTarget();
      s.hintsShown = s.world.hints.flatMap((hint,i) => hint.x < cp.x ? [i] : []);
      return true;
    }
    makePlayer(spawn) {
      return { x: spawn.x, y: spawn.y, w: 34, h: 58, vx: 0, vy: 0, facing: 1, grounded: false, groundId: null,
        jumps: 0, health: 3, invulnerable: 0, hurtFrames: 0, dashTime: 0, dashCooldown: 0, coyote: 0, jumpBuffer: 0,
        boostTime: 0, animation: 'idle', animationTime: 0, dropTime: 0, springCooldown: 0 };
    }
    emit(type, data = {}) { this.events.push({ type, ...data }); }
    drainEvents() { const result = this.events; this.events = []; return result; }
    setAssist(value) { if (this.state) { this.state.assist = Boolean(value); if (value) this.state.player.health = 3; } }
    step(input = {}, dt = STEP) {
      if (!this.state || this.state.mode !== 'playing') return this.state;
      this.pendingJump ||= Boolean(input.jumpPressed);
      this.pendingDash ||= Boolean(input.dashPressed);
      this.accumulator += clamp(Number(dt) || 0, 0, 0.1);
      while (this.accumulator + 1e-10 >= STEP) {
        this.tick({ ...input, jumpPressed: this.pendingJump, dashPressed: this.pendingDash });
        this.pendingJump = false; this.pendingDash = false; this.accumulator -= STEP;
        if (this.state.mode !== 'playing') { this.accumulator = 0; break; }
      }
      return this.state;
    }
    tick(input) {
      const s = this.state, p = s.player, world = s.world;
      s.tick++; s.time += STEP;
      if (s.floorTransition) {
        this.advanceFloorTransition();
        return;
      }
      for (const field of ['invulnerable', 'hurtFrames', 'dashCooldown', 'coyote', 'jumpBuffer', 'boostTime', 'dropTime', 'springCooldown']) {
        if (p[field] > 0) p[field]--;
      }
      this.movePlatforms();
      if (input.jumpPressed) p.jumpBuffer = PHYSICS.bufferFrames;
      if (p.grounded) { p.coyote = PHYSICS.coyoteFrames; p.jumps = 0; }
      if (input.down && input.jumpPressed && p.grounded) {
        const platform = world.platforms.find(pl => pl.id === p.groundId);
        if (platform && platform.oneWay) { p.dropTime = 16; p.coyote = 0; p.jumps = 1; p.y += 5; p.grounded = false; p.groundId = null; p.jumpBuffer = 0; }
      }
      if (p.jumpBuffer > 0 && (p.grounded || p.coyote > 0 || p.jumps < 2)) {
        const firstJump = p.grounded || p.coyote > 0;
        p.vy = -(firstJump ? PHYSICS.jump : PHYSICS.doubleJump);
        p.jumps = firstJump ? 1 : 2; p.grounded = false; p.groundId = null; p.coyote = 0; p.jumpBuffer = 0;
        p.dashTime = 0; this.emit('jump', { double: !firstJump }); this.burst(p.x + p.w / 2, p.y + p.h, 'dust', 5);
      }
      const axis = Number(Boolean(input.right)) - Number(Boolean(input.left));
      if (axis) p.facing = axis;
      if (input.dashPressed && p.dashCooldown <= 0) {
        p.dashTime = PHYSICS.dashFrames; p.dashCooldown = PHYSICS.dashCooldown; p.vy = 0;
        this.emit('dash'); this.burst(p.x + p.w / 2, p.y + p.h / 2, 'cyan', 7);
      }
      if (p.dashTime > 0) {
        p.dashTime--; p.vx = p.facing * PHYSICS.dashSpeed; p.vy = 0;
        if (s.tick % 2 === 0) this.burst(p.x + p.w / 2, p.y + p.h / 2, 'cyan', 1);
      } else {
        const maxSpeed = p.boostTime > 0 ? PHYSICS.boostSpeed : PHYSICS.runSpeed;
        if (axis) p.vx = clamp(p.vx + axis * (p.grounded ? 0.72 : 0.46), -maxSpeed, maxSpeed);
        else p.vx *= p.grounded ? 0.74 : 0.96;
        if (Math.abs(p.vx) < 0.08) p.vx = 0;
        // Releasing jump cuts ascent, making short and full jumps controllable.
        if (!input.jumpHeld && p.vy < -5.5) p.vy += 0.75;
        p.vy = Math.min(15, p.vy + PHYSICS.gravity);
      }
      const previousBottom = p.y + p.h;
      this.movePlayerX(p.vx);
      this.movePlayerY(p.vy);
      const room = world.floorScenes?.[s.floor];
      p.x = clamp(p.x, room?.start ?? 0, (room?.end ?? world.width) - p.w);
      this.pickups(); this.checkpoints(); this.environmentEffects(); this.openGates(); this.setPieces();
      if (s.player !== p || s.floorTransition) return;
      this.moveEnemies(previousBottom);
      if (s.player !== p) return;
      this.moveBoss(previousBottom);
      if (s.player !== p) return;
      this.moveProjectiles();
      if (s.player !== p) return;
      if (p.y > 650) { this.respawn('fall'); return; }
      this.moveParticles();
      // During the chase the camera eases back so the Feed stays in view behind the player.
      s.camera.x += (this.cameraTarget() - s.camera.x) * 0.12;
      const animation = p.hurtFrames > 0 ? 'hurt' : p.dashTime > 0 ? 'dash'
        : !p.grounded ? (p.vy < 0 ? 'jump' : 'fall') : input.down ? 'crouch' : Math.abs(p.vx) > 0.5 ? 'run' : 'idle';
      if (animation !== p.animation) { p.animation = animation; p.animationTime = 0; }
      else p.animationTime++;
      for (let i = 0; i < world.hints.length; i++) {
        if (p.x > world.hints[i].x && !s.hintsShown.includes(i)) {
          s.hintsShown.push(i); this.emit('hint', { text: world.hints[i].text });
        }
      }
      if (!s.boss.alive && overlaps(p, world.exit)) {
        s.mode = 'complete'; s.completed = true; p.animation = 'victory'; p.animationTime = 0; p.vx = p.vy = 0;
        this.burst(p.x + p.w / 2, p.y, 'confetti', 36);
        this.emit('complete', { levelIndex: s.levelIndex, score: s.score, coins: s.coins,
          skills: [...s.skills], time: s.time, deaths: s.deaths });
      }
    }
    movePlatforms() {
      const s = this.state, p = s.player;
      for (const platform of s.world.platforms) {
        platform.dx = platform.dy = 0;
        if (platform.crumble) {
          // The all-time high holds for a moment, then drops with its rider to the floor.
          const riding = p.grounded && p.groundId === platform.id;
          if (riding && !platform.shake) { platform.shake = 1; this.emit('crash'); }
          else if (platform.shake) platform.shake++;
          if (platform.shake > 26 && platform.y < platform.crumble.to) {
            platform.fall = Math.min(11, (platform.fall || 0) + 0.5);
            platform.dy = Math.min(platform.fall, platform.crumble.to - platform.y);
            platform.y += platform.dy;
            if (riding) p.y += platform.dy;
          }
          continue;
        }
        if (platform.type !== 'moving') continue;
        const oldX = platform.x, oldY = platform.y;
        const wave = Math.sin(s.tick * platform.speed + platform.phase);
        platform.x = platform.baseX + wave * platform.rangeX;
        platform.y = platform.baseY + wave * platform.rangeY;
        platform.dx = platform.x - oldX; platform.dy = platform.y - oldY;
        if (p.grounded && p.groundId === platform.id) {
          p.x += platform.dx; p.y += platform.dy;
        }
      }
    }
    movePlayerX(amount) {
      const p = this.state.player;
      p.x += amount;
      for (const platform of this.state.world.platforms) {
        if (platform.oneWay || !overlaps(p, platform)) continue;
        if (platform.type === 'breakable' && p.dashTime > 0) {
          platform.broken = true; this.state.score += 300;
          this.emit('secret', { name: platform.name });
          this.burst(platform.x + platform.w / 2, platform.y + platform.h / 2, 'gold', 20);
          continue;
        }
        if (amount > 0) p.x = platform.x - p.w;
        else if (amount < 0) p.x = platform.x + platform.w;
        p.vx = 0; p.dashTime = 0;
      }
      if (this.state.world.platforms.some(pl => pl.broken)) this.state.world.platforms = this.state.world.platforms.filter(pl => !pl.broken);
    }
    movePlayerY(amount) {
      const p = this.state.player, oldY = p.y, oldBottom = p.y + p.h, wasGrounded = p.grounded;
      p.y += amount; p.grounded = false; p.groundId = null;
      const candidates = this.state.world.platforms.filter(platform => p.x + p.w > platform.x + 1 && p.x < platform.x + platform.w - 1)
        .sort((a, b) => amount >= 0 ? a.y - b.y : b.y + b.h - a.y - a.h);
      for (const platform of candidates) {
        if (platform.oneWay && p.dropTime > 0) continue;
        if (amount >= 0 && oldBottom <= platform.y + Math.max(4, Math.abs(platform.dy) + 1) && p.y + p.h >= platform.y) {
          p.y = platform.y - p.h; p.vy = 0; p.grounded = true; p.groundId = platform.id; p.jumps = 0;
          if (!wasGrounded && amount > 3) { this.emit('land'); this.burst(p.x + p.w / 2, p.y + p.h, 'dust', 4); }
          break;
        }
        if (!platform.oneWay && amount < 0 && oldY >= platform.y + platform.h - 2 && p.y < platform.y + platform.h && overlaps(p, platform)) {
          p.y = platform.y + platform.h; p.vy = 0;
        }
      }
    }
    pickups() {
      const s = this.state, p = s.player;
      for (const item of s.world.collectibles) {
        if (item.collected || !overlaps(p, { x: item.x - 17, y: item.y - 17, w: 34, h: 34 })) continue;
        item.collected = true;
        if (item.kind === 'key') {
          s.keys++; s.score += 100;
          this.emit('key', { word: item.word, bell: Boolean(item.bell), count: s.keys, total: s.world.collectibles.filter(i => i.kind === 'key').length });
        }
        else if (item.kind === 'skill') { s.skills.push(item.skill.id); s.score += 250; this.emit('skill', { skill: item.skill, item }); }
        else if (item.kind === 'bonus') this.emit('bonus', { item });
        else {
          s.coins++; s.score += 10; this.emit('coin', { x: item.x, y: item.y });
          // Every fifty ideas buys another go, up to a sensible ceiling.
          if (s.coins % 50 === 0 && s.lives < PHYSICS.maxLives) { s.lives++; this.emit('extraLife', { lives: s.lives, coins: s.coins }); }
        }
        this.burst(item.x, item.y, item.kind === 'coin' ? 'gold' : 'purple', 8);
      }
    }
    checkpoints() {
      const s = this.state, p = s.player;
      for (const cp of s.world.checkpoints) {
        // High routes cross the same save line, so jumping above a flag still saves.
        if (cp.active || p.x + p.w < cp.x - 15 || p.x > cp.x + 46 || p.y >= cp.y) continue;
        cp.active = true; s.checkpoint = { x: cp.x + 8, y: cp.y - p.h, id: cp.id }; p.health = 3;
        this.emit('checkpoint', { checkpoint: cp }); this.burst(cp.x + 8, cp.y - 64, 'cyan', 12);
      }
    }
    openGates(silent = false) {
      const s = this.state, world = s.world;
      if (!world.gates) return;
      const keysLeft = world.collectibles.some(item => item.kind === 'key' && !item.collected);
      // A keyword gate opens for good. The wall behind an interview lift never does: the lift is the way on.
      const open = world.platforms.filter(pl => pl.type === 'gate' && pl.needs === 'keys' && !keysLeft);
      if (!open.length) return;
      world.platforms = world.platforms.filter(pl => !open.includes(pl));
      for (const g of open) {
        if (silent) continue;
        this.emit('gateOpen', { label: g.label }); this.burst(g.x + g.w / 2, g.y + g.h - 90, 'gold', 16);
      }
    }
    setPieces() {
      const s = this.state, p = s.player, f = s.fakeExit, c = s.chase;
      if (f) {
        if (!f.triggered && overlaps(p, { x: f.x - 30, y: f.y, w: f.w + 30, h: f.h })) {
          f.triggered = true; this.emit('fakeExit'); this.burst(f.x + f.w / 2, f.y + 40, 'confetti', 24);
        }
        // Scope Creep drags the finish line away to the real end of the level.
        if (f.triggered && f.timer < 150) { f.timer++; f.x += 3 + f.timer * 0.16; }
      }
      // The lift you arrived in shuts behind you.
      const behind = s.world.floorDoors?.[s.floor - 1];
      if (behind?.shut < LIFT.doors) behind.shut++;
      // Clearing the round calls the lift. It travels to this floor, opens, and takes whoever
      // walks up to its doors.
      const door = s.world.floorDoors?.[s.floor];
      if (door && s.bossIndex > door.round) {
        if (door.called === 0) this.emit('liftCall', { floor: s.floor + 1 });
        if (door.called < LIFT.call + LIFT.doors) {
          if (++door.called === LIFT.call) this.emit('liftDing', { floor: s.floor + 1 });
        } else if (p.grounded && p.y + p.h === door.y && p.x + p.w / 2 >= door.car - 32) {
          s.floorTransition = { door, phase: 'board', tick: 0 };
          p.vx = 0; p.vy = 0; p.dashTime = 0;
          s.projectiles = [];
        }
      }
      if (c && !c.done) {
        // The Feed arrives from off screen, then keeps a set distance behind a runner. That distance
        // shrinks to fit a narrow view, so the wall is always in sight, and it surges and eases so it
        // reads as something in the world giving chase.
        const reach = Math.min(c.trail, this.viewWidth / 2 - 40);
        if (!c.active && p.x > c.startX) { c.active = true; c.age = 0; c.x = p.x - reach - c.lead; this.emit('chaseStart'); }
        if (c.active) {
          c.age++;
          const arriving = c.lead * Math.max(0, 1 - c.age / FEED.arrive) ** 2;
          const surge = reach * FEED.surge * (1 - Math.cos(c.age * FEED.pulse)) / 2;
          c.x = Math.max(c.x + (s.assist ? c.speed * 0.8 : c.speed), p.x - reach - arriving + surge);
          if (p.x > c.endX) { c.active = false; c.done = true; c.gone = 0; this.emit('chaseEnd'); }
          else if (c.x > p.x + 6) this.respawn('feed');
        }
      }
      // Outrun, the Feed stops where it is and drops away.
      if (c?.gone < FEED.leave) c.gone++;
    }
    cameraTarget() {
      const s = this.state, p = s.player;
      const room = s.world.floorScenes?.[s.floor];
      const start = room?.start ?? 0;
      const end = room?.end ?? s.world.width;
      const lookBehind = s.chase?.active ? .5 : .35;
      return clamp(p.x + p.w / 2 - this.viewWidth * lookBehind, start, Math.max(start, end - this.viewWidth));
    }
    // A lift ride: step in, doors close, the car leaves, the next floor arrives, doors open, step out.
    advanceFloorTransition() {
      const s = this.state, p = s.player, ride = s.floorTransition, door = ride.door;
      const pose = name => { if (p.animation === name) p.animationTime++; else { p.animation = name; p.animationTime = 0; } };
      const walkTo = centre => {
        const gap = centre - (p.x + p.w / 2);
        if (Math.abs(gap) > LIFT.step) { p.facing = Math.sign(gap); p.x += p.facing * LIFT.step; pose('run'); return false; }
        p.x = centre - p.w / 2; p.facing = 1; pose('idle');
        return true;
      };
      const next = phase => { ride.phase = phase; ride.tick = 0; };
      ride.tick++;
      if (ride.phase === 'board') {
        if (walkTo(door.car)) { this.emit('liftDoor'); next('close'); }
      } else if (ride.phase === 'close') {
        pose('idle');
        if (ride.tick >= LIFT.doors) { this.emit('liftMove'); next('ride'); }
      } else if (ride.phase === 'ride') {
        if (ride.tick >= LIFT.ride) {
          s.floor = door.round + 1;
          p.x = door.arrival.x - p.w / 2; p.y = door.arrival.y - p.h;
          p.jumpBuffer = 0; p.coyote = 0;
          s.particles = [];
          s.camera.x = this.cameraTarget();
          next('arrive');
        }
      } else if (ride.phase === 'arrive') {
        if (ride.tick >= LIFT.arrive) { this.emit('liftDing', { floor: s.floor + 1 }); next('open'); }
      } else if (ride.phase === 'open') {
        pose('idle');
        if (ride.tick >= LIFT.doors) next('exit');
      } else if (walkTo(door.landing.x + 8 + p.w / 2)) {
        door.shut = 0;
        this.emit('liftDoor');
        s.floorTransition = null;
        p.grounded = false; p.groundId = null;
        p.invulnerable = Math.max(p.invulnerable, 60);
        this.checkpoints();
      }
      s.camera.x += (this.cameraTarget() - s.camera.x) * 0.12;
    }
    environmentEffects() {
      const s = this.state, p = s.player;
      for (const spring of s.world.springs) {
        if (p.springCooldown > 0 || p.vy < 0 || !overlaps(p, { x: spring.x, y: spring.y - spring.h, w: spring.w, h: spring.h + 2 })) continue;
        p.vy = -19; p.grounded = false; p.groundId = null; p.jumps = 1; p.springCooldown = 20;
        this.emit('spring'); this.burst(spring.x + spring.w / 2, spring.y, 'gold', 7);
      }
      const under = p.grounded && s.world.platforms.find(pl => pl.id === p.groundId);
      if (under && under.belt) { const vx = p.vx; this.movePlayerX(under.belt); p.vx = vx; }
      for (const c of s.world.crushers || []) {
        // Raised for half the cycle, then slam, hold and lift.
        const t = ((s.tick + c.offset) % c.period) / c.period;
        const reach = t < 0.5 ? 0 : t < 0.58 ? (t - 0.5) / 0.08 : t < 0.74 ? 1 : 1 - (t - 0.74) / 0.26;
        c.reach = reach; c.warn = t > 0.36 && t < 0.5;
        c.h = 40 + reach * (c.floor - c.top - 40);
        if (reach > 0.45 && overlaps(p, { x: c.x, y: c.top, w: c.w, h: c.h })) {
          this.hurt(c.x + c.w / 2 + (p.x + p.w / 2 < c.x + c.w / 2 ? 30 : -30));
          if (s.player !== p) return;
        }
      }
      for (const boost of s.world.boosts) {
        if (p.grounded && Math.abs(p.y + p.h - boost.y) < 5 && p.x + p.w > boost.x && p.x < boost.x + boost.w && p.vx > 0 && p.facing > 0) {
          if (p.boostTime < 10) this.emit('boost');
          p.boostTime = 40; p.vx = Math.max(p.vx, PHYSICS.boostSpeed);
        }
      }
    }
    moveEnemies(previousBottom) {
      const s = this.state, p = s.player;
      for (const e of s.enemies) {
        if (!e.alive) continue;
        e.phase++;
        e.x += e.speed * e.facing;
        if (e.x < e.minX) { e.x = e.minX; e.facing = 1; }
        if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; e.facing = -1; }
        if (e.type === 'plane') e.y = e.baseY + Math.sin(e.phase * 0.045) * 26;
        if (!overlaps(p, e)) continue;
        if ((p.vy > 0 && previousBottom <= e.y + 26) || p.dashTime > 0) {
          e.alive = false; s.score += 100;
          if (p.dashTime <= 0) { p.y = e.y - p.h; p.vy = -10.8; p.jumps = 1; p.grounded = false; }
          this.emit('stomp', { enemy: e.type }); this.burst(e.x + e.w / 2, e.y + e.h / 2, 'purple', 12);
        } else this.hurt(e.x + e.w / 2);
      }
    }
    moveBoss(previousBottom) {
      const s = this.state, p = s.player, b = s.boss;
      if (!b.alive) return;
      if (b.type === 'finalreview') {
        if (p.x + p.w >= b.x - 80) {
          b.health = 0; b.alive = false; b.phase = 'welcome';
          this.emit('welcome');
        }
        return;
      }
      if (!b.active && p.x > b.originX - 430) {
        b.active = true; b.phase = 'patrol'; b.timer = b.interviewRound ? 36 : 70; this.emit('bossStart', { name: b.name });
      }
      if (!b.active) return;
      if (b.hitCooldown > 0) b.hitCooldown--;
      b.timer--;
      // After two hits the review escalates: quicker warnings, shorter openings, one extra move.
      if (!b.enraged && b.maxHealth >= 4 && b.health <= b.maxHealth - 2) { b.enraged = true; this.emit('bossPhase', { name: b.name }); }
      const fast = b.enraged;
      if (b.phase === 'patrol') {
        // Walk back towards the starting spot rather than snapping there after a charge or a hit.
        const home = b.originX + Math.sin(s.tick * 0.035) * 24;
        b.x += clamp(home - b.x, -3, 3);
        if (b.timer <= 0) { b.phase = 'telegraph'; b.timer = fast ? 42 : 54; b.facing = p.x < b.x ? -1 : 1; this.emit('bossTelegraph', { type: b.type }); }
      } else if (b.phase === 'telegraph') {
        if (b.timer <= 0) {
          b.phase = 'attack'; b.timer = b.type === 'scopecreep' ? 43 : 60; b.cycle++;
          if (fast && b.type === 'scopecreep') this.fireBossShot(b, p);
        }
      } else if (b.phase === 'attack') {
        if (b.type === 'scopecreep') {
          b.x += b.facing * (fast ? 5.4 : 4.6);
          if (b.x < b.arena[0] || b.x + b.w > b.arena[1]) b.facing *= -1;
          b.x = clamp(b.x, b.arena[0], b.arena[1] - b.w);
        } else {
          const interval = b.type === 'algorithm' ? 36 : fast ? 24 : 30;
          if (b.timer % interval === 0) this.fireBossShot(b, p);
        }
        if (b.timer <= 0) { b.phase = 'vulnerable'; b.timer = b.type === 'scopecreep' ? 210 : fast ? 135 : 155; this.emit('bossOpening', { name: b.name }); }
      } else if (b.phase === 'vulnerable' && b.timer <= 0) {
        b.phase = 'patrol'; b.timer = 54;
      }
      if (b.type === 'algorithm') b.y = b.baseY + Math.sin(s.tick * 0.035) * 18;
      if (b.signoffs && b.hitCooldown <= 0) {
        const target = b.signoffs[b.maxHealth - b.health];
        const terminal = { x: target.x - 24, y: b.floor - 72, w: 48, h: 72 };
        if (p.dashTime > 0 && overlaps(p, terminal)) {
          b.health--; b.hitCooldown = 24;
          this.emit('signoff', { label: target.label });
          this.burst(target.x, b.floor - 60, 'cyan', 15);
          s.score += 350;
          if (b.health === 0) this.clearBoss(b);
          return;
        }
      }
      if (!overlaps(p, b)) return;
      const attack = p.dashTime > 0 || (p.vy > 0 && previousBottom <= b.y + 29);
      if (b.phase === 'vulnerable' && b.hitCooldown <= 0 && attack) {
        b.health--; b.hitCooldown = 45; p.vy = -12.5; p.jumps = 1; p.grounded = false; p.dashTime = 0;
        p.y = Math.min(p.y, b.y - p.h); p.invulnerable = Math.max(p.invulnerable, 35);
        s.score += 350; this.emit('bossHit', { health: b.health, maxHealth: b.maxHealth });
        this.burst(b.x + b.w / 2, b.y + b.h / 2, 'gold', 18);
        if (b.health <= 0) {
          this.clearBoss(b);
        } else { b.phase = 'patrol'; b.timer = b.interviewRound ? 34 : 65; }
      } else if (b.phase === 'attack' && !attack) this.hurt(b.x + b.w / 2);
    }
    clearBoss(boss) {
      const s = this.state;
      boss.alive = false; boss.phase = 'defeated';
      s.projectiles = []; s.score += 650;
      const last = s.bossIndex >= s.bossQueue.length - 1;
      this.emit(last ? 'bossDefeated' : 'roundCleared', { name: boss.name, round: s.bossIndex + 1 });
      if (!last) s.boss = s.bossQueue[++s.bossIndex];
      this.burst(boss.x + boss.w / 2, boss.y + boss.h / 2, 'confetti', 30);
    }
    fireBossShot(b, p) {
      const from = centre(b), to = centre(p), angle = Math.atan2(to.y - from.y, to.x - from.x);
      const speed = b.type === 'algorithm' ? 4.1 : 3.7;
      const offsets = b.type !== 'algorithm' ? [0] : b.enraged ? [-0.56, -0.28, 0, 0.28, 0.56] : [-0.32, 0, 0.32];
      // The escalated CV Filter also sweeps the floor with a keyword scan that has to be jumped.
      if (b.enraged && b.type === 'recruitmentbot') {
        this.state.projectiles.push({ x: from.x, y: b.floor - 26, w: 14, h: 14, vx: Math.sign(to.x - from.x || -1) * 4.4, vy: 0, life: 150, kind: 'cyan' });
      }
      for (const offset of offsets) {
        this.state.projectiles.push({ x: from.x, y: from.y, w: 14, h: 14,
          vx: Math.cos(angle + offset) * speed, vy: Math.sin(angle + offset) * speed,
          life: 170, kind: b.type === 'algorithm' ? 'purple' : 'cyan' });
      }
      this.emit('shot');
    }
    moveProjectiles() {
      const s = this.state, p = s.player;
      for (const shot of s.projectiles) {
        shot.x += shot.vx; shot.y += shot.vy; shot.life--;
        if (overlaps(p, shot)) {
          if (p.dashTime > 0) { shot.life = 0; this.burst(shot.x, shot.y, 'cyan', 4); }
          else { this.hurt(shot.x); shot.life = 0; }
        }
      }
      s.projectiles = s.projectiles.filter(shot => shot.life > 0);
    }
    hurt(sourceX) {
      const s = this.state, p = s.player;
      if (s.assist || p.invulnerable > 0) return;
      p.health--; p.hurtFrames = 13; p.invulnerable = 90; p.dashTime = 0;
      p.vx = p.x + p.w / 2 < sourceX ? -6 : 6; p.vy = -7; p.grounded = false; p.groundId = null;
      this.emit('hurt', { health: p.health }); this.burst(p.x + p.w / 2, p.y + p.h / 2, 'pink', 10);
      if (p.health <= 0) this.respawn('health');
    }
    respawn(reason) {
      const s = this.state;
      s.deaths++; if (!s.assist) s.lives = Math.max(0, s.lives - 1);
      s.player = this.makePlayer(s.checkpoint); s.player.invulnerable = 100;
      s.camera.x = this.cameraTarget();
      if (s.chase && !s.chase.done) { s.chase.active = false; s.chase.x = s.chase.startX - s.chase.lead; }
      s.projectiles = [];
      // A boss mid-charge does not carry on while the player walks back from the checkpoint.
      if (s.boss.alive && s.boss.active && s.boss.type !== 'finalreview') { s.boss.phase = 'patrol'; s.boss.timer = 90; }
      // With no lives left the app restarts the world from its first screen. Relaxed mode never runs out.
      if (!s.assist && s.lives === 0) this.emit('gameOver', { reason, levelIndex: s.levelIndex, deaths: s.deaths });
      else this.emit('respawn', { reason, checkpoint: s.checkpoint.id, deaths: s.deaths, lives: s.lives });
      // Keep collected ideas, skill tokens and boss damage on an ordinary retry.
      this.burst(s.player.x + s.player.w / 2, s.player.y + s.player.h / 2, 'cyan', 16);
    }
    burst(x, y, kind, count) {
      const s = this.state;
      for (let i = 0; i < count; i++) {
        // Deterministic particles keep replay and physics checks reproducible.
        const phase = ((s.tick * 17 + i * 37) % 360) * Math.PI / 180;
        const speed = 0.7 + (i % 5) * 0.5;
        s.particles.push({ x, y, vx: Math.cos(phase) * speed, vy: Math.sin(phase) * speed - 1,
          life: 20 + i % 16, maxLife: 36, kind, size: kind === 'confetti' ? 5 : 3 });
      }
    }
    moveParticles() {
      for (const particle of this.state.particles) {
        particle.x += particle.vx; particle.y += particle.vy; particle.vy += 0.09; particle.life--;
      }
      this.state.particles = this.state.particles.filter(p => p.life > 0);
    }
  }
  H.Game = Game;
  H.LIFT = LIFT; H.FEED = FEED; H.PHYSICS = PHYSICS; H.WIDTH = WIDTH; H.HEIGHT = HEIGHT;
  if (typeof module !== 'undefined' && module.exports) module.exports = { Game, PHYSICS, overlaps };
})(typeof globalThis !== 'undefined' ? globalThis : window);
