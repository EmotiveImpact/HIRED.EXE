(function (root) {
  'use strict';
  const H = root.Hired = root.Hired || {};
  const WIDTH = 960, HEIGHT = 540, STEP = 1 / 60;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const centre = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  const PHYSICS = Object.freeze({ gravity: 0.66, jump: 14.6, doubleJump: 13.5, runSpeed: 6.2,
    boostSpeed: 8.8, dashSpeed: 13.2, dashFrames: 11, dashCooldown: 48, coyoteFrames: 7, bufferFrames: 8 });

  class Game {
    constructor() {
      this.viewWidth = WIDTH; this.state = null; this.events = []; this.accumulator = 0; this.pendingJump = false; this.pendingDash = false;
    }
    start(index = 0, options = {}) {
      const world = H.createLevel(index);
      const boss = { ...world.boss, y: world.boss.floor - world.boss.h, originX: world.boss.x,
        baseY: world.boss.floor - world.boss.h, maxHealth: world.boss.health, phase: 'dormant',
        timer: 0, active: false, alive: true, hitCooldown: 0, facing: -1, cycle: 0 };
      this.state = { mode: 'playing', levelIndex: world.levelIndex, world, player: this.makePlayer(world.spawn),
        camera: { x: 0, y: 0 }, score: 0, coins: 0, skills: [], checkpoint: { ...world.spawn, id: 'start' },
        enemies: world.enemies, boss, particles: [], projectiles: [], time: 0, tick: 0, deaths: 0,
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
      const cp = s.world.checkpoints.find(point => point.id === record.checkpoint);
      if (!cp) return false;
      const picked = new Set(Array.isArray(record.collected) ? record.collected : []);
      const defeated = new Set(Array.isArray(record.defeated) ? record.defeated : []);
      for (const item of s.world.collectibles) {
        item.collected = picked.has(item.id);
        if (item.collected && item.kind === 'skill') s.skills.push(item.skill.id);
        else if (item.collected) s.coins++;
      }
      for (const enemy of s.enemies) enemy.alive = !defeated.has(enemy.id);
      for (const point of s.world.checkpoints) point.active = point.x <= cp.x;
      const number = n => Number.isFinite(n) && n >= 0 ? n : 0;
      s.score = Math.floor(number(record.score)); s.time = number(record.time); s.deaths = Math.floor(number(record.deaths));
      s.checkpoint = { id: cp.id, x: cp.x + 8, y: cp.y - s.player.h };
      s.player = this.makePlayer(s.checkpoint);
      s.player.invulnerable = 75;
      s.camera.x = clamp(s.player.x - this.viewWidth * .35, 0, s.world.width - this.viewWidth);
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
      p.x = clamp(p.x, 0, world.width - p.w);
      this.pickups(); this.checkpoints(); this.environmentEffects();
      this.moveEnemies(previousBottom);
      if (s.player !== p) return;
      this.moveBoss(previousBottom);
      if (s.player !== p) return;
      this.moveProjectiles();
      if (s.player !== p) return;
      if (p.y > 650) { this.respawn('fall'); return; }
      this.moveParticles();
      const desired = clamp(p.x + p.w / 2 - this.viewWidth * 0.35, 0, world.width - this.viewWidth);
      s.camera.x += (desired - s.camera.x) * 0.12;
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
        if (amount > 0) p.x = platform.x - p.w;
        else if (amount < 0) p.x = platform.x + platform.w;
        p.vx = 0; p.dashTime = 0;
      }
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
        if (item.kind === 'skill') { s.skills.push(item.skill.id); s.score += 250; this.emit('skill', { skill: item.skill, item }); }
        else { s.coins++; s.score += 10; this.emit('coin', { x: item.x, y: item.y }); }
        this.burst(item.x, item.y, item.kind === 'skill' ? 'purple' : 'gold', 8);
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
    environmentEffects() {
      const s = this.state, p = s.player;
      for (const spring of s.world.springs) {
        if (p.springCooldown > 0 || p.vy < 0 || !overlaps(p, { x: spring.x, y: spring.y - spring.h, w: spring.w, h: spring.h + 2 })) continue;
        p.vy = -19; p.grounded = false; p.groundId = null; p.jumps = 1; p.springCooldown = 20;
        this.emit('spring'); this.burst(spring.x + spring.w / 2, spring.y, 'gold', 7);
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
        if ((p.vy > 0 && previousBottom <= e.y + 17) || p.dashTime > 0) {
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
        b.active = true; b.phase = 'patrol'; b.timer = 70; this.emit('bossStart', { name: b.name });
      }
      if (!b.active) return;
      if (b.hitCooldown > 0) b.hitCooldown--;
      b.timer--;
      if (b.phase === 'patrol') {
        b.x = b.originX + Math.sin(s.tick * 0.035) * 24;
        if (b.timer <= 0) { b.phase = 'telegraph'; b.timer = 54; b.facing = p.x < b.x ? -1 : 1; this.emit('bossTelegraph', { type: b.type }); }
      } else if (b.phase === 'telegraph') {
        if (b.timer <= 0) { b.phase = 'attack'; b.timer = b.type === 'scopecreep' ? 65 : 72; b.cycle++; }
      } else if (b.phase === 'attack') {
        if (b.type === 'scopecreep') {
          b.x += b.facing * 5.6;
          if (b.x < s.world.width - 870 || b.x + b.w > s.world.width - 270) b.facing *= -1;
          b.x = clamp(b.x, s.world.width - 870, s.world.width - 270 - b.w);
        } else {
          const interval = b.type === 'algorithm' ? 36 : 30;
          if (b.timer % interval === 0) this.fireBossShot(b, p);
        }
        if (b.timer <= 0) { b.phase = 'vulnerable'; b.timer = 110; this.emit('bossOpening', { name: b.name }); }
      } else if (b.phase === 'vulnerable' && b.timer <= 0) {
        b.phase = 'patrol'; b.timer = 54;
      }
      if (b.type === 'algorithm') b.y = b.baseY + Math.sin(s.tick * 0.035) * 18;
      if (s.world.signoffs) {
        const target = s.world.signoffs[b.maxHealth - b.health];
        const terminal = { x: target.x - 24, y: b.floor - 72, w: 48, h: 72 };
        if (p.dashTime > 0 && overlaps(p, terminal)) {
          b.health--;
          this.emit('signoff', { label: target.label });
          this.burst(target.x, b.floor - 60, 'cyan', 15);
          s.score += 350;
          if (b.health === 0) this.clearBoss(b);
        }
        if (b.alive && overlaps(p, b) && p.dashTime === 0 && b.phase === 'attack') this.hurt(b.x + b.w / 2);
        return;
      }
      if (!overlaps(p, b)) return;
      const attack = p.dashTime > 0 || (p.vy > 0 && previousBottom <= b.y + 18);
      if (b.phase === 'vulnerable' && b.hitCooldown <= 0 && attack) {
        b.health--; b.hitCooldown = 45; p.vy = -12.5; p.jumps = 1; p.grounded = false; p.dashTime = 0;
        p.y = Math.min(p.y, b.y - p.h); p.invulnerable = Math.max(p.invulnerable, 35);
        s.score += 350; this.emit('bossHit', { health: b.health, maxHealth: b.maxHealth });
        this.burst(b.x + b.w / 2, b.y + b.h / 2, 'gold', 18);
        if (b.health <= 0) {
          this.clearBoss(b);
        } else { b.phase = 'patrol'; b.timer = 65; }
      } else if (b.phase !== 'vulnerable' || !attack) this.hurt(b.x + b.w / 2);
    }
    clearBoss(boss) {
      boss.alive = false; boss.phase = 'defeated';
      this.state.projectiles = []; this.state.score += 650;
      this.emit('bossDefeated', { name: boss.name });
      this.burst(boss.x + boss.w / 2, boss.y + boss.h / 2, 'confetti', 30);
    }
    fireBossShot(b, p) {
      const from = centre(b), to = centre(p), angle = Math.atan2(to.y - from.y, to.x - from.x);
      const speed = b.type === 'algorithm' ? 4.1 : 3.7;
      const offsets = b.type === 'algorithm' ? [-0.32, 0, 0.32] : [0];
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
      s.deaths++; s.player = this.makePlayer(s.checkpoint); s.player.invulnerable = 100;
      s.camera.x = clamp(s.player.x + s.player.w / 2 - this.viewWidth * 0.35, 0, s.world.width - this.viewWidth);
      s.projectiles = []; this.emit('respawn', { reason, checkpoint: s.checkpoint.id, deaths: s.deaths });
      // Keep collected ideas, skill tokens and boss damage; a fall never erases the application story.
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
  H.Game = Game; H.PHYSICS = PHYSICS; H.WIDTH = WIDTH; H.HEIGHT = HEIGHT;
  if (typeof module !== 'undefined' && module.exports) module.exports = { Game, PHYSICS, overlaps };
})(typeof globalThis !== 'undefined' ? globalThis : window);
