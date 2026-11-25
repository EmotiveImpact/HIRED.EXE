(function (root) {
  'use strict';
  const H = root.Hired = root.Hired || {};
  const W = 960, HGT = 540;
  const ink = '#201b4d';
  const BACKGROUNDS = ['application-alley', 'ship-it-city', 'growth-run', 'interview-hq'];
  const THEMES = [
    { top: 'grass', body: 'brick', extra: 'vine', platform: 'grass_platform', accent: '#ffe681', base: '#804471' },
    { top: 'hazard', body: 'brick_metal', extra: 'vent', platform: 'metal_platform', accent: '#ffd56b', base: '#51567f' },
    { top: 'neon', body: 'tech', extra: 'window', platform: 'neon_platform', accent: '#69edff', base: '#392564' },
    { top: 'stone_gold', body: 'stone', extra: 'stone_ivy', platform: 'stone_platform', accent: '#ffe9a2', base: '#817aa6' }
  ];
  const COLOURS = { cyan: '#6af4ff', gold: '#ffda5e', purple: '#bb8cff', pink: '#ff83b4', dust: '#fff1d0' };
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const round = Math.round;
  // An HQ room's back wall is a flat plate that stands on the floor and scrolls with it.
  const ROOM_WALL = { height: 448, floor: 440, base: ['#3d6f7c', '#a488cf', '#cbbbe6'] };
  const LIFT_ART = { half: 64, door: 40, height: 112, header: 28 };

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      canvas.width = W; canvas.height = HGT;
      this.ctx.imageSmoothingEnabled = false;
      this.images = {};
      this.meta = root.HIRED_ASSET_META || {};
      this.ready = false;
      this.failed = [];
      this.time = 0;
      this.camera = 0;
      this.levelIndex = 0;
      this.lastAnimation = 'idle';
      this.animationStarted = 0;
    }

    async load() {
      this.meta = root.HIRED_ASSET_META || {};
      const specs = {
        hero: this.meta.hero?.image || 'assets/production/characters/hero-atlas.png',
        enemies: this.meta.enemies?.image || 'assets/production/enemies/enemy-atlas.png',
        terrain: this.meta.terrain?.image || 'assets/production/environment/terrain-atlas.png',
        props: this.meta.props?.image || 'assets/production/environment/props-atlas.png',
        furniture: this.meta.furniture?.image || 'assets/production/environment/furniture-atlas.png',
        feed: this.meta.feed?.image || 'assets/production/enemies/feed-atlas.png',
        feedBody: this.meta.feed?.body?.image || 'assets/production/enemies/feed-body.webp'
      };
      BACKGROUNDS.forEach((name, i) => { specs['background' + i] = 'assets/production/backgrounds/' + name + '.webp'; });
      for (let i = 2; i <= 4; i++) specs['hqRoom' + i] = 'assets/production/backgrounds/interview-room-' + i + '.webp';
      const results = await Promise.allSettled(Object.entries(specs).map(([key, path]) => new Promise((resolve, reject) => {
        const im = new root.Image();
        im.onload = () => {
          if (!im.naturalWidth) { reject(new Error(path)); return; }
          this.images[key] = im; resolve(key);
        };
        im.onerror = () => reject(new Error(path));
        im.src = root.HIRED_EMBEDDED_ASSETS?.[path] || path;
      })));
      this.failed = results.flatMap((r, i) => r.status === 'rejected' ? [Object.entries(specs)[i][1]] : []);
      for (const key of ['hero', 'enemies', 'terrain', 'props', 'furniture', 'feed']) {
        if (!this.meta[key]?.frames) this.failed.push(key + ' frame metadata');
      }
      const report = { loaded: Object.keys(this.images), failed: [...this.failed] };
      if (this.failed.length) {
        const error = new Error('Could not load game artwork: ' + this.failed.join(', '));
        error.assetReport = report;
        throw error;
      }
      this.ready = true;
      return report;
    }

    draw(state, realTimeSeconds = 0) {
      const ctx = this.ctx;
      this.time = Number(realTimeSeconds) || 0;
      this.camera = state?.camera?.x || 0;
      this.levelIndex = state?.levelIndex || 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, W, HGT);
      const room = state?.world.floorScenes?.[state.floor];
      this.indoors = Boolean(state?.floor);
      this.background(state?.floor ?? 0, room?.start ?? 0);
      if (!state) return;
      this.ambient();
      ctx.save();
      ctx.translate(-round(this.camera), 0);
      if (room) { ctx.beginPath(); ctx.rect(room.start, 0, room.end - room.start, HGT); ctx.clip(); }
      if (this.indoors) this.roomWall(state.floor, room);
      this.decor(state.world, false);
      for (const p of state.world.platforms) {
        if (!this.visible(p.x, p.w)) continue;
        if (p.type === 'ground') { if (this.indoors) this.roomFloor(p); else this.ground(p); if (p.belt) this.belt(p); }
      }
      this.lifts(state, room);
      this.decor(state.world, true);
      for (const p of state.world.platforms) {
        if (!this.visible(p.x, p.w) || p.type === 'ground') continue;
        // An interview floor ends at its lift, which draws the wall that stops you.
        if (p.type === 'gate' && typeof p.needs === 'number') continue;
        // Furniture is drawn as itself; its platform is only the top you stand on.
        if (p.type === 'furniture') continue;
        if (p.type === 'gate') this.gate(p, state);
        else if (p.type === 'wall' || p.type === 'breakable') this.wall(p, state);
        else this.platform(p);
      }
      for (const b of state.world.boosts) if (this.visible(b.x, b.w)) this.boost(b);
      for (const c of state.world.crushers || []) if (this.visible(c.x, c.w)) this.crusher(c);
      for (const s of state.world.springs) if (this.visible(s.x, s.w)) this.spring(s, state);
      for (const cp of state.world.checkpoints) if (this.visible(cp.x - 40, 120)) this.checkpoint(cp);
      this.exit(state);
      this.fakeExit(state);
      for (const item of state.world.collectibles) {
        if (!item.collected && this.visible(item.x - 24, 48)) this.collectible(item, state);
      }
      for (const enemy of state.enemies) if (enemy.alive && this.visible(enemy.x, enemy.w)) this.enemy(enemy);
      this.signoffs(state);
      this.boss(state);
      for (const shot of state.projectiles) this.projectile(shot);
      if (!this.riding(state)) this.player(state.player, state);
      for (const p of state.particles) this.particle(p);
      this.feed(state);
      ctx.restore();
      // A quiet lower-edge vignette reinforces depth without covering the playfield.
      const shade = ctx.createLinearGradient(0, 512, 0, HGT);
      shade.addColorStop(0, 'rgba(19,15,48,0)'); shade.addColorStop(1, 'rgba(19,15,48,.12)');
      ctx.fillStyle = shade; ctx.fillRect(0, 512, W, 28);
      if (state.floorTransition) this.roomFade(state);
    }

    visible(x, width = 0) { return x + width > this.camera - 220 && x < this.camera + W + 220; }

    background(floor, start) {
      const ctx = this.ctx, im = this.images['background' + this.levelIndex];
      // Indoors the room's own wall, drawn with the world, is the whole backdrop.
      if (floor) { ctx.fillStyle = ROOM_WALL.base[floor - 1]; ctx.fillRect(0, 0, W, HGT); return; }
      if (!im) {
        ctx.fillStyle = ['#88c7ff', '#e5abc4', '#7773dc', '#a3ceec'][this.levelIndex];
        ctx.fillRect(0, 0, W, HGT); return;
      }
      // One painted plate drifts slowly behind the physical world. Alternating
      // mirrored copies share an edge without pretending it is a layered source.
      const width = Math.ceil(HGT * im.width / im.height);
      const offset = (this.camera - start) * 0.12;
      const first = Math.floor(offset / width);
      for (let i = first; i <= first + 2; i++) {
        const x = round(i * width - offset);
        ctx.save();
        if (i % 2) { ctx.translate(x + width, 0); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, width, HGT); }
        else ctx.drawImage(im, x, 0, width, HGT);
        ctx.restore();
      }
      // Push the painted city slightly into the distance. Collision art stays crisp.
      ctx.fillStyle = this.levelIndex === 2 ? 'rgba(28,26,84,.08)' : 'rgba(230,239,255,.09)';
      ctx.fillRect(0, 0, W, HGT);
    }

    ambient() {
      const ctx = this.ctx, t = this.time;
      ctx.save();
      for (let i = 0; i < 16; i++) {
        const x = ((i * 173 + t * (3 + i % 3) - this.camera * .21) % 1060 + 1060) % 1060 - 50;
        const y = 120 + (i * 67) % 290 + Math.sin(t * .6 + i * 2) * 12;
        ctx.globalAlpha = .18 + .2 * (1 + Math.sin(t * 1.2 + i)) / 2;
        ctx.fillStyle = this.levelIndex === 2 ? '#93f6ff' : '#fff8d8';
        ctx.fillRect(round(x), round(y), i % 3 ? 2 : 3, i % 3 ? 2 : 3);
      }
      ctx.restore();
    }

    frame(group, name) { return this.meta[group]?.frames?.[name]; }

    sprite(group, name, centreX, feet, height, flip = false, opacity = 1) {
      const f = this.frame(group, name), im = this.images[group];
      if (!f || !im) return false;
      const ctx = this.ctx, width = height * f.w / f.h;
      ctx.save();
      ctx.globalAlpha *= opacity;
      ctx.translate(round(centreX), round(feet));
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(im, f.x, f.y, f.w, f.h, round(-width / 2), -round(height), round(width), round(height));
      ctx.restore();
      return true;
    }

    tile(name, x, y, size = 96) {
      const f = this.frame('terrain', name), im = this.images.terrain;
      if (f && im) this.ctx.drawImage(im, f.x, f.y, f.w, f.h, round(x), round(y), size, size);
    }

    ground(p) {
      const ctx = this.ctx, theme = THEMES[this.levelIndex];
      const top = p.y - (this.levelIndex === 0 ? 6 : this.levelIndex === 3 ? 9 : 3);
      ctx.save();
      ctx.beginPath(); ctx.rect(round(p.x), round(top), round(p.w), p.h + 12); ctx.clip();
      ctx.fillStyle = theme.base; ctx.fillRect(p.x, p.y, p.w, p.h);
      const start = Math.max(0, Math.floor((this.camera - p.x - 96) / 96));
      const last = Math.min(Math.ceil(p.w / 96), Math.ceil((this.camera + W - p.x + 96) / 96));
      for (let col = start; col < last; col++) {
        const x = p.x + col * 96;
        this.tile(theme.top, x, top);
        for (let row = 1; top + row * 96 < Math.min(HGT + 96, p.y + p.h); row++) {
          const chooseExtra = (col + Math.floor(p.x / 96) + row * 3) % 5 === 1;
          this.tile(chooseExtra ? theme.extra : theme.body, x, top + row * 96);
        }
      }
      // Fine face-edge shade reads as the side of a ledge, never a false platform.
      ctx.fillStyle = 'rgba(29,22,57,.24)'; ctx.fillRect(p.x + p.w - 4, p.y + 18, 4, p.h);
      ctx.restore();
    }

    platform(p) {
      const ctx = this.ctx, theme = THEMES[this.levelIndex];
      const name = p.type === 'moving' && this.levelIndex !== 2 ? 'metal_platform' : theme.platform;
      const f = this.frame('props', name), im = this.images.props;
      if (p.crumble) {
        if (p.shake && p.y < p.crumble.to) { ctx.save(); ctx.translate(Math.sin(this.time * 60) * 2, 0); }
        this.label(p.y >= p.crumble.to ? 'CORRECTED' : p.label, p.x + p.w / 2, p.y - 16, p.shake ? '#ffb3b3' : '#b4ffcb', 10);
      }
      if (p.type === 'moving') {
        ctx.save();
        ctx.strokeStyle = 'rgba(236,246,255,.40)'; ctx.lineWidth = 2; ctx.setLineDash([4, 7]);
        ctx.beginPath();
        ctx.moveTo(p.baseX + p.w / 2 - p.rangeX, p.baseY + 22 - p.rangeY);
        ctx.lineTo(p.baseX + p.w / 2 + p.rangeX, p.baseY + 22 + p.rangeY);
        ctx.stroke(); ctx.restore();
      }
      if (f && im) {
        const h = this.levelIndex === 0 && p.type !== 'moving' ? 40 : 30;
        ctx.drawImage(im, f.x, f.y, f.w, f.h, round(p.x), round(p.y - 5), round(p.w), h);
      } else {
        ctx.fillStyle = ink; ctx.fillRect(p.x, p.y, p.w, 22);
        ctx.fillStyle = theme.accent; ctx.fillRect(p.x, p.y, p.w, 4);
      }
      if (p.type === 'moving') {
        ctx.fillStyle = 'rgba(113,242,255,.55)';
        ctx.fillRect(round(p.x + 13), round(p.y + 25), 16, 3);
        ctx.fillRect(round(p.x + p.w - 29), round(p.y + 25), 16, 3);
      }
      if (p.crumble && p.shake && p.y < p.crumble.to) ctx.restore();
    }

    belt(p) {
      // Moving chevrons along the running surface show which way the conveyor pulls.
      const ctx = this.ctx, dir = Math.sign(p.belt), y = p.y;
      ctx.fillStyle = '#231b3f'; ctx.fillRect(p.x, y - 2, p.w, 12);
      ctx.fillStyle = '#ffd56b'; ctx.fillRect(p.x, y - 3, p.w, 2);
      ctx.save(); ctx.beginPath(); ctx.rect(p.x, y - 2, p.w, 12); ctx.clip();
      const offset = ((this.time * Math.abs(p.belt) * 60) % 28) * dir;
      ctx.fillStyle = dir > 0 ? '#8af2bc' : '#ff9a8a';
      for (let x = p.x - 28 + offset; x < p.x + p.w + 28; x += 28) {
        for (let i = 0; i < 5; i++) ctx.fillRect(round(x + (dir > 0 ? i : 4 - i) * 2), y + 1 + i, 6, 1);
        for (let i = 0; i < 4; i++) ctx.fillRect(round(x + (dir > 0 ? 3 - i : 1 + i) * 2), y + 6 + i, 6, 1);
      }
      ctx.restore();
    }

    wall(p, state) {
      const ctx = this.ctx, theme = THEMES[this.levelIndex], x = round(p.x), y = round(p.y);
      ctx.fillStyle = ink; ctx.fillRect(x - 2, y - 2, p.w + 4, p.h + 4);
      ctx.fillStyle = theme.base; ctx.fillRect(x, y, p.w, p.h);
      ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(x, y, p.w, 3);
      ctx.fillStyle = 'rgba(29,22,57,.3)';
      for (let i = 12; i < Math.max(p.w, p.h); i += 22) {
        if (p.w > p.h) ctx.fillRect(x + i, y + 4, 2, p.h - 6); else ctx.fillRect(x + 3, y + i, p.w - 6, 2);
      }
      if (p.type !== 'breakable') return;
      // A cracked panel: the only hint that a dash will go straight through.
      ctx.strokeStyle = '#ffe9a2'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(x + 4, y + 14); ctx.lineTo(x + 14, y + 38); ctx.lineTo(x + 7, y + 58); ctx.lineTo(x + 18, y + 84); ctx.lineTo(x + 9, y + p.h - 6);
      ctx.moveTo(x + 14, y + 38); ctx.lineTo(x + 21, y + 30);
      ctx.stroke();
      const glow = .25 + .25 * Math.sin(this.time * 3);
      ctx.fillStyle = `rgba(255,233,162,${glow})`; ctx.fillRect(x + p.w - 3, y + 8, 3, p.h - 16);
      if (Math.abs(state.player.x - p.x) < 150 && Math.abs(state.player.y + state.player.h - (p.y + p.h)) < 12) {
        this.label('LOOKS THIN. DASH?', x + p.w / 2, y - 14, '#ffe8ae', 10);
      }
    }

    crusher(c) {
      const ctx = this.ctx, x = round(c.x), bottom = round(c.top + c.h);
      ctx.fillStyle = '#2b2350'; ctx.fillRect(x + c.w / 2 - 9, 0, 18, bottom - 36);
      ctx.fillStyle = '#6b6f9c'; ctx.fillRect(x + c.w / 2 - 5, 0, 5, bottom - 36);
      ctx.fillStyle = ink; ctx.fillRect(x - 3, bottom - 43, c.w + 6, 46);
      ctx.fillStyle = '#51567f'; ctx.fillRect(x, bottom - 40, c.w, 40);
      ctx.fillStyle = '#8a8fc0'; ctx.fillRect(x, bottom - 40, c.w, 5);
      for (let i = 0; i < c.w; i += 24) {
        ctx.fillStyle = i / 24 % 2 ? '#231b3f' : '#ffd56b'; ctx.fillRect(x + i, bottom - 10, Math.min(24, c.w - i), 10);
      }
      if (c.warn) {
        ctx.fillStyle = `rgba(255,120,120,${.3 + .3 * Math.sin(this.time * 24)})`; ctx.fillRect(x, c.floor - 4, c.w, 4);
        this.label('!', x + c.w / 2, bottom + 20, '#ffdc73', 14);
      }
    }

    roomFade(state) {
      // The screen dips only while the car is between floors.
      const ctx = this.ctx, ride = state.floorTransition, L = H.LIFT;
      const dark = ride.phase === 'ride' ? (ride.tick - (L.ride - 10)) / 10 : ride.phase === 'arrive' ? 1 - ride.tick / 10 : 0;
      if (dark <= 0) return;
      ctx.fillStyle = `rgba(25,20,46,${Math.min(1, dark)})`;
      ctx.fillRect(0, 0, this.canvas.width, HGT);
    }

    // The room's back wall is one plate that runs from the lift you arrived in to the lift you
    // leave by. It is fixed to the floor, so furniture standing against it never slides along it.
    roomWall(floor, room) {
      const ctx = this.ctx, im = this.images['hqRoom' + (floor + 1)];
      if (!im) return;
      const width = round(ROOM_WALL.height * im.width / im.height), x = room.start + 150;
      if (this.visible(x, width)) ctx.drawImage(im, x, ROOM_WALL.floor + 2 - ROOM_WALL.height, width, ROOM_WALL.height);
      // A soft shadow where the wall meets the floor seats the furniture against it.
      const shade = ctx.createLinearGradient(0, ROOM_WALL.floor - 26, 0, ROOM_WALL.floor);
      shade.addColorStop(0, 'rgba(34,24,70,0)'); shade.addColorStop(1, 'rgba(34,24,70,.3)');
      ctx.fillStyle = shade; ctx.fillRect(Math.max(room.start, this.camera - 4), ROOM_WALL.floor - 26, W + 8, 26);
    }

    furniture(d) {
      const f = this.frame('furniture', d.piece), im = this.images.furniture;
      if (!f || !im) return;
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(round(d.x + d.w / 2), round(d.y) + 1);
      if (d.flip) ctx.scale(-1, 1);
      ctx.drawImage(im, f.x, f.y, f.w, f.h, -d.w / 2, -d.h, d.w, d.h);
      ctx.restore();
    }

    // An indoor floor: a polished marble slab with a gold nosing over the building's own stone.
    roomFloor(p) {
      const ctx = this.ctx, x = round(p.x), y = round(p.y), w = round(p.w);
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, HGT - y + 4); ctx.clip();
      ctx.fillStyle = THEMES[3].base; ctx.fillRect(x, y, w, HGT - y);
      const start = Math.max(0, Math.floor((this.camera - p.x - 96) / 96));
      const last = Math.min(Math.ceil(p.w / 96), Math.ceil((this.camera + W - p.x + 96) / 96));
      for (let col = start; col < last; col++) {
        for (let row = 0; y + 14 + row * 96 < HGT; row++) this.tile('stone', p.x + col * 96, y + 14 + row * 96);
      }
      ctx.fillStyle = ink; ctx.fillRect(x, y + 14, w, 3);
      ctx.fillStyle = '#b08a3c'; ctx.fillRect(x, y + 11, w, 3);
      ctx.fillStyle = '#ffd97a'; ctx.fillRect(x, y + 9, w, 2);
      ctx.fillStyle = '#c9bdf0'; ctx.fillRect(x, y, w, 9);
      ctx.fillStyle = '#e9e1ff'; ctx.fillRect(x, y, w, 5);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, w, 2);
      // Slab joints and a soft sheen, fixed to the world so they scroll with the floor.
      for (let jx = Math.ceil(p.x / 96) * 96; jx < p.x + p.w; jx += 96) {
        ctx.fillStyle = 'rgba(88,72,150,.55)'; ctx.fillRect(jx, y, 2, 9);
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(jx + 14, y + 2, 26, 1); ctx.fillRect(jx + 46, y + 3, 10, 1);
      }
      ctx.fillStyle = 'rgba(29,22,57,.3)'; ctx.fillRect(x + w - 4, y + 14, 4, HGT - y);
      ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(x, y + 14, 3, HGT - y);
      ctx.restore();
    }

    // True while the hero is inside the car, where the lift draws them behind its doors.
    riding(state) {
      return ['close', 'ride', 'arrive', 'open'].includes(state.floorTransition?.phase);
    }

    lifts(state, room) {
      const doors = state.world.floorDoors;
      if (!doors) return;
      const L = H.LIFT, ride = state.floorTransition, top = doors.length + 1;
      const ease = t => t * t * (3 - 2 * t);
      const rider = () => this.player(state.player, state);
      const out = doors[state.floor], back = doors[state.floor - 1];
      if (out && this.visible(out.car - 70, 190)) {
        const here = state.floor + 1, called = state.bossIndex > out.round ? out.called : 0;
        const o = { number: top, arrow: 0, open: 0, car: null, moving: false, locked: called === 0,
          wall: [out.x, room.end], button: out.x + 24, label: 'LIFT TO FLOOR ' + (here + 1) };
        if (called > 0 && called < L.call) {
          // Called: the car comes down the shaft from the top floor.
          const t = called / L.call;
          o.number = Math.max(here, round(top - (top - here) * t * 1.15)); o.arrow = -1; o.moving = true;
          o.car = (1 - ease(t)) * (out.y + 30);
        } else if (called >= L.call) {
          o.number = here; o.car = 0; o.open = clamp((called - L.call) / L.doors, 0, 1);
        }
        if (ride?.door === out && ride.phase !== 'board') o.label = null;
        if (ride?.door === out && ride.phase === 'close') { o.open = 1 - ride.tick / L.doors; o.rider = rider; }
        if (ride?.door === out && ride.phase === 'ride') {
          const t = ride.tick / L.ride;
          o.open = 0; o.car = t * t * (out.y + 30); o.rider = rider; o.moving = true; o.arrow = 1;
          if (t > .5) o.number = here + 1;
        }
        if (o.locked) o.note = 'CLEAR THE ROUND';
        this.lift(out.car, out.y, o);
      }
      if (back && this.visible(back.arrival.x - 100, 190)) {
        const shut = back.shut ?? L.doors;
        const o = { number: state.floor + 1, arrow: 0, open: 1 - shut / L.doors, car: 0, moving: false,
          wall: [room.start, back.arrival.x - LIFT_ART.half], button: back.arrival.x + LIFT_ART.half - 12 };
        if (ride?.door === back) {
          if (ride.phase === 'arrive') { o.open = 0; o.moving = true; o.arrow = 1; o.rider = rider; }
          else if (ride.phase === 'open') { o.open = ride.tick / L.doors; o.rider = rider; }
          else o.open = 1;
        }
        this.lift(back.arrival.x, back.arrival.y, o);
      }
    }

    // One lift, seen from the landing: a glazed shaft, a car on its cables, a pair of sliding
    // doors, a floor indicator over them and a call button on the wall beside.
    lift(cx, floor, o) {
      const ctx = this.ctx, A = LIFT_ART, t = this.time;
      const left = cx - A.half, doorTop = floor - A.height, headTop = doorTop - A.header;
      const stone = (x, w) => {
        ctx.fillStyle = ink; ctx.fillRect(x - 2, -4, w + 4, floor + 4);
        ctx.fillStyle = '#a79bdc'; ctx.fillRect(x, -4, w, floor + 4);
        ctx.fillStyle = '#d9d0f8'; ctx.fillRect(x, -4, Math.min(5, w), floor + 4);
        ctx.fillStyle = '#7d70be'; ctx.fillRect(x + w - Math.min(5, w), -4, Math.min(5, w), floor + 4);
        ctx.fillStyle = 'rgba(54,42,108,.5)';
        for (let y = floor - 34; y > 0; y -= 46) ctx.fillRect(x, y, w, 2);
      };
      ctx.save();
      // The wall the floor ends at.
      if (o.wall && o.wall[1] > o.wall[0]) stone(o.wall[0], o.wall[1] - o.wall[0]);
      // Shaft: dark well, guide rails, cross ties and the cables the car hangs from.
      ctx.fillStyle = ink; ctx.fillRect(left - 2, -4, A.half * 2 + 4, floor + 4);
      const well = ctx.createLinearGradient(left, 0, left + A.half * 2, 0);
      well.addColorStop(0, '#191338'); well.addColorStop(.5, '#2d2460'); well.addColorStop(1, '#191338');
      ctx.fillStyle = well; ctx.fillRect(left + 12, -4, A.half * 2 - 24, floor + 4);
      ctx.fillStyle = '#4b4290';
      for (let y = (floor - 20) % 58 - 58; y < headTop; y += 58) ctx.fillRect(left + 12, y, A.half * 2 - 24, 3);
      ctx.fillStyle = '#6e63b8'; ctx.fillRect(cx - 46, -4, 3, floor); ctx.fillRect(cx + 43, -4, 3, floor);
      const run = o.moving ? (t * 190 * (o.arrow || 1)) % 14 : 0;
      for (const x of [cx - 8, cx + 6]) {
        ctx.fillStyle = '#8f86cf'; ctx.fillRect(x, -4, 2, floor);
        ctx.fillStyle = '#d6cffa';
        for (let y = -14 - run; y < headTop; y += 14) ctx.fillRect(x, round(y), 2, 5);
      }
      // The car.
      if (o.car !== null) {
        const rise = round(o.car), cw = A.door + 6, ch = A.height + 8, cy = floor - ch - rise;
        ctx.save();
        ctx.beginPath(); ctx.rect(left + 12, -4, A.half * 2 - 24, floor + 4); ctx.clip();
        ctx.fillStyle = ink; ctx.fillRect(cx - cw - 2, cy - 12, cw * 2 + 4, ch + 14);
        ctx.fillStyle = '#8d6a2c'; ctx.fillRect(cx - cw, cy - 10, cw * 2, 10);
        ctx.fillStyle = '#e2b85a'; ctx.fillRect(cx - cw, cy - 10, cw * 2, 3);
        ctx.fillStyle = '#5d4a9e'; ctx.fillRect(cx - 12, cy - 18, 24, 8);
        const wall = ctx.createLinearGradient(0, cy, 0, cy + ch);
        wall.addColorStop(0, '#fff6d6'); wall.addColorStop(.55, '#f6dfa6'); wall.addColorStop(1, '#d9b470');
        ctx.fillStyle = wall; ctx.fillRect(cx - cw, cy, cw * 2, ch);
        ctx.fillStyle = '#b98646'; ctx.fillRect(cx - cw, cy + ch - 44, cw * 2, 44);
        ctx.fillStyle = '#9a6a35';
        for (let x = cx - cw + 14; x < cx + cw; x += 22) ctx.fillRect(x, cy + ch - 44, 2, 40);
        ctx.fillStyle = '#ffe9a8'; ctx.fillRect(cx - cw, cy + ch - 48, cw * 2, 4);
        ctx.fillStyle = '#7a5a2a'; ctx.fillRect(cx - cw, cy + ch - 44, cw * 2, 2);
        // Mirror on the back wall, ceiling light and floor.
        ctx.fillStyle = '#a9dff2'; ctx.fillRect(cx - 24, cy + 16, 48, 40);
        ctx.fillStyle = '#e6fbff'; ctx.fillRect(cx - 24, cy + 16, 48, 3); ctx.fillRect(cx - 16, cy + 24, 3, 22); ctx.fillRect(cx - 10, cy + 24, 2, 14);
        ctx.strokeStyle = '#b98a3a'; ctx.lineWidth = 2; ctx.strokeRect(cx - 25, cy + 15, 50, 42);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 26, cy + 3, 52, 4);
        ctx.fillStyle = 'rgba(255,250,210,.35)'; ctx.fillRect(cx - 32, cy + 7, 64, 6);
        ctx.fillStyle = '#6b4a8c'; ctx.fillRect(cx - cw, cy + ch - 5, cw * 2, 5);
        if (o.rider) {
          ctx.save(); ctx.beginPath(); ctx.rect(cx - cw, cy, cw * 2, ch); ctx.clip();
          ctx.translate(0, -rise); o.rider(); ctx.restore();
        }
        // Side frames of the car.
        ctx.fillStyle = '#c99a45'; ctx.fillRect(cx - cw, cy, 3, ch); ctx.fillRect(cx + cw - 3, cy, 3, ch);
        ctx.restore();
      }
      // Glass over the open shaft.
      ctx.fillStyle = 'rgba(150,214,255,.16)'; ctx.fillRect(left + 12, -4, A.half * 2 - 24, headTop + 4);
      ctx.fillStyle = 'rgba(255,255,255,.2)';
      for (let y = headTop - 150; y > -80; y -= 150) {
        for (let i = 0; i < 26; i++) ctx.fillRect(left + 18 + i * 2, y + 60 - i * 2, 12, 1);
      }
      ctx.fillStyle = ink;
      for (let y = headTop - 96; y > -10; y -= 96) ctx.fillRect(left + 12, y, A.half * 2 - 24, 3);
      // Doors: two leaves that part from the middle.
      const slide = round(clamp(o.open, 0, 1) * (A.door - 3));
      ctx.save();
      ctx.beginPath(); ctx.rect(cx - A.door, doorTop, A.door * 2, A.height); ctx.clip();
      if (o.car === null || o.car > 2) { ctx.fillStyle = '#140f2c'; ctx.fillRect(cx - A.door, doorTop, A.door * 2, A.height); }
      for (const side of [-1, 1]) {
        const x = side < 0 ? cx - A.door - slide : cx + slide;
        const metal = ctx.createLinearGradient(x, 0, x + A.door, 0);
        metal.addColorStop(0, '#b9a4e8'); metal.addColorStop(.3, '#efe8ff'); metal.addColorStop(.62, '#cbbdf3'); metal.addColorStop(1, '#9585d2');
        ctx.fillStyle = metal; ctx.fillRect(x, doorTop, A.door, A.height);
        ctx.strokeStyle = '#7566b8'; ctx.lineWidth = 2; ctx.strokeRect(x + 7, doorTop + 10, A.door - 14, A.height - 22);
        ctx.fillStyle = '#ffd97a'; ctx.fillRect(x + 7, doorTop + 52, A.door - 14, 3);
        ctx.fillStyle = ink; ctx.fillRect(side < 0 ? x + A.door - 2 : x, doorTop, 2, A.height);
      }
      ctx.restore();
      // Surround: stone piers, a gold sill and the header that carries the indicator.
      stone(left, 24); stone(cx + A.door, 24);
      ctx.fillStyle = '#ffd97a'; ctx.fillRect(left, doorTop - 6, 24, 4); ctx.fillRect(cx + A.door, doorTop - 6, 24, 4);
      ctx.fillStyle = '#b08a3c'; ctx.fillRect(cx - A.door - 2, floor - 3, A.door * 2 + 4, 3);
      ctx.fillStyle = ink; ctx.fillRect(left - 2, headTop - 2, A.half * 2 + 4, A.header + 4);
      ctx.fillStyle = '#3a2d72'; ctx.fillRect(left, headTop, A.half * 2, A.header);
      ctx.fillStyle = '#ffd97a'; ctx.fillRect(left, headTop, A.half * 2, 3); ctx.fillRect(left, doorTop - 3, A.half * 2, 3);
      ctx.fillStyle = '#120d28'; ctx.fillRect(cx - 27, headTop + 6, 54, 16);
      const blink = !o.moving || Math.floor(t * 5) % 2 === 0;
      ctx.fillStyle = '#ffc94f'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
      ctx.fillText(String(o.number), cx - (o.arrow ? 8 : 0), headTop + 19);
      if (o.arrow && blink) {
        const ax = cx + 10, ay = headTop + 14;
        for (let i = 0; i < 5; i++) ctx.fillRect(ax - i, ay + (o.arrow > 0 ? i - 4 : 4 - i), i * 2 + 1, 1);
      }
      // Call button.
      const bx = round(o.button), by = floor - 62;
      ctx.fillStyle = ink; ctx.fillRect(bx - 7, by - 12, 14, 26);
      ctx.fillStyle = '#d8c98f'; ctx.fillRect(bx - 5, by - 10, 10, 22);
      ctx.fillStyle = o.locked ? '#d2536f' : o.moving || o.open > 0 ? '#fff3a6' : '#8a7a4a';
      ctx.fillRect(bx - 3, by - 6, 6, 6);
      if (!o.locked && (o.moving || o.open > 0)) { ctx.fillStyle = 'rgba(255,240,150,.3)'; ctx.fillRect(bx - 6, by - 9, 12, 12); }
      ctx.fillStyle = '#4a3f86'; ctx.fillRect(bx - 3, by + 4, 6, 3);
      ctx.restore();
      if (o.label) this.label(o.label, cx, headTop - 14, '#ffe8ae', 11);
      if (o.note) this.label(o.note, cx, headTop - 36, '#d4f5e3', 10);
    }

    decor(world, front) {
      const ctx = this.ctx;
      for (const d of world.decor) {
        if (!this.visible(d.x, 240)) continue;
        if (d.type === 'arch') {
          if (front) {
            ctx.save(); ctx.beginPath(); ctx.rect(d.x, d.y + 14, 150, 160); ctx.clip();
            this.sprite('props', 'arch', d.x + 72, d.y + 136, 126);
            ctx.restore();
          }
          continue;
        }
        if (front) continue;
        if (d.type === 'furniture') { this.furniture(d); continue; }
        if (d.type === 'sign') { this.sign(d); continue; }
        // World terminals are supplied by checkpoint actors, avoiding two screens
        // occupying the same save point.
        if (d.type === 'terminal') continue;
        const mapped = d.type === 'crane' ? 'satellite' : d.type;
        const height = ({ cafe: 188, tree: this.levelIndex === 3 ? 140 : 166, pink_tree: 164,
          banner: 124, crate: 48, satellite: 100, lamp: 120 })[mapped] || 82;
        const name = mapped === 'tree' && this.levelIndex === 3 ? 'pink_tree' : mapped;
        const f = this.frame('props', name);
        if (!f) continue;
        const width = height * f.w / f.h;
        this.sprite('props', name, d.x + width / 2, d.y + 3, height, false, mapped === 'crate' ? .9 : 1);
      }
      if (!front) {
        // Sparse repeated street furniture gives the same generated components a
        // consistent scale across the four distinct level layouts.
        for (let i = 0; i < world.platforms.length; i++) {
          const p = world.platforms[i];
          if (p.type !== 'ground' || p.w < 420) continue;
          // Street lamps stay outdoors.
          if (world.floorScenes && p.x >= world.floorScenes[1].start) continue;
          const x = p.x + p.w - 82;
          if (!this.visible(x, 80) || x > world.boss.x - 160) continue;
          // Never in front of a sign or a save point.
          if (world.decor.some(d => d.type === 'sign' && d.y === p.y && x > d.x - 52 && x < d.x + 232)
            || world.checkpoints.some(c => c.y === p.y && Math.abs(c.x + 10 - x) < 80)) continue;
          const prop = this.levelIndex === 2 ? 'pink_tree' : 'lamp';
          this.sprite('props', prop, x, p.y + 2, prop === 'lamp' ? 103 : 98, false, .88);
        }
      }
    }

    sign(d) {
      const ctx = this.ctx;
      const long = d.text.length > 25, width = long ? 180 : 174, height = long ? 58 : 65;
      const x = round(d.x), y = round(d.y - height - 24);
      ctx.fillStyle = '#3a325e'; ctx.fillRect(x + 12, y + height, 6, 25); ctx.fillRect(x + width - 18, y + height, 6, 25);
      ctx.fillStyle = '#b4a4d7'; ctx.fillRect(x - 3, y - 3, width + 6, height + 6);
      ctx.fillStyle = '#241e58'; ctx.fillRect(x, y, width, height);
      ctx.fillStyle = '#7066ba'; ctx.fillRect(x, y, width, 4);
      ctx.fillStyle = '#ffdc83'; ctx.fillRect(x + 8, y + 10, 4, 4); ctx.fillRect(x + width - 12, y + 10, 4, 4);
      const lines = this.wrap(d.text, width - 22, long ? 10 : 13);
      const lineH = long ? 12 : 15;
      ctx.fillStyle = '#faf6ff'; ctx.font = 'bold ' + (long ? 10 : 13) + 'px monospace'; ctx.textAlign = 'center';
      lines.forEach((line, i) => ctx.fillText(line, x + width / 2, y + (height - lines.length * lineH) / 2 + 13 + i * lineH));
      ctx.textAlign = 'left';
    }

    wrap(text, maxWidth, size) {
      const ctx = this.ctx; ctx.font = 'bold ' + size + 'px monospace';
      const lines = []; let line = '';
      for (const word of text.split(' ')) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
        else line = test;
      }
      if (line) lines.push(line);
      return lines;
    }

    boost(b) {
      const ctx = this.ctx;
      ctx.fillStyle = '#1b3a64'; ctx.fillRect(b.x, b.y - 4, b.w, 7);
      ctx.fillStyle = '#72f6ff'; ctx.fillRect(b.x, b.y - 5, b.w, 2);
      ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y - 4, b.w, 7); ctx.clip();
      const offset = (this.time * 36) % 32;
      for (let x = b.x - 32 + offset; x < b.x + b.w; x += 32) {
        ctx.fillStyle = '#d9feff';
        ctx.fillRect(round(x), b.y - 3, 9, 2); ctx.fillRect(round(x + 7), b.y - 1, 7, 2);
      }
      ctx.restore();
    }

    spring(s, state) {
      const ctx = this.ctx;
      const compressed = state.player.springCooldown > 15 && Math.abs(state.player.x - s.x) < 80;
      const height = compressed ? 9 : 18, y = s.y - height;
      ctx.fillStyle = ink; ctx.fillRect(s.x - 2, y - 3, s.w + 4, 8);
      ctx.fillStyle = '#ffda5e'; ctx.fillRect(s.x, y - 2, s.w, 5);
      ctx.fillStyle = '#fff6b2'; ctx.fillRect(s.x + 2, y - 2, s.w - 4, 2);
      ctx.strokeStyle = '#b8b9ef'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(s.x + 9, y + 6); ctx.lineTo(s.x + s.w - 9, y + 10);
      ctx.lineTo(s.x + 10, y + 14); ctx.lineTo(s.x + s.w - 10, s.y);
      ctx.stroke();
      ctx.fillStyle = '#473666'; ctx.fillRect(s.x + 3, s.y - 2, s.w - 6, 4);
    }

    checkpoint(cp) {
      const ctx = this.ctx, x = cp.x + 16, feet = cp.y;
      if (cp.active) {
        ctx.fillStyle = 'rgba(77,253,231,.13)'; ctx.fillRect(x - 28, feet - 68, 56, 68);
        ctx.strokeStyle = '#76ffe6'; ctx.lineWidth = 2; ctx.strokeRect(x - 29, feet - 69, 58, 69);
      }
      this.sprite('props', 'terminal', x, feet + 1, 57);
      this.label(cp.active ? 'SAVED' : 'CHECKPOINT', x, feet - 81, cp.active ? '#b8fff0' : '#fff5c7', 10);
      if (cp.active) {
        ctx.strokeStyle = '#baff9f'; ctx.lineWidth = 3; ctx.beginPath();
        ctx.moveTo(x + 18, feet - 67); ctx.lineTo(x + 22, feet - 63); ctx.lineTo(x + 30, feet - 73); ctx.stroke();
      }
    }

    collectible(item, state) {
      if (item.secret) {
        const close = Math.abs(state.player.x - item.x) < 185 && state.player.y < item.y + 115;
        if (!close) {
          this.sprite('enemies','briefcase',item.x,item.y + 10,19,false,.72);
          return;
        }
      }
      const ctx = this.ctx, bob = Math.sin(this.time * 4 + item.x * .017) * 4;
      if (item.kind === 'key') {
        // A keyword tag: the only thing the CV Filter can read.
        if (item.bell) {
          const bx = round(item.x), by = round(item.y + bob);
          ctx.fillStyle = '#261a45'; ctx.fillRect(bx - 13, by + 6, 26, 6); ctx.fillRect(bx - 11, by - 8, 22, 15);
          ctx.fillStyle = '#ffd36c'; ctx.fillRect(bx - 9, by - 6, 18, 12); ctx.fillRect(bx - 11, by + 7, 22, 3);
          ctx.fillStyle = '#fff6c4'; ctx.fillRect(bx - 7, by - 5, 4, 8); ctx.fillRect(bx - 2, by - 11, 4, 4);
          return;
        }
        const x = round(item.x), y = round(item.y + bob), width = Math.max(58, item.word.length * 7 + 18);
        ctx.fillStyle = 'rgba(255,224,112,.22)'; ctx.fillRect(x - width / 2 - 5, y - 16, width + 10, 32);
        ctx.fillStyle = '#261a45'; ctx.fillRect(x - width / 2 - 2, y - 13, width + 4, 26);
        ctx.fillStyle = '#ffe070'; ctx.fillRect(x - width / 2, y - 11, width, 22);
        ctx.fillStyle = '#fff6c4'; ctx.fillRect(x - width / 2, y - 11, width, 3);
        ctx.fillStyle = '#261a45'; ctx.fillRect(x - width / 2 + 4, y - 2, 4, 4);
        ctx.save(); ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
        ctx.fillText(item.word, x + 4, y + 4); ctx.restore();
        return;
      }
      if (item.kind === 'bonus') {
        const x = round(item.x), y = round(item.y + bob);
        ctx.fillStyle = '#261a45';
        ctx.fillRect(x - 18, y - 14, 36, 28);
        ctx.fillStyle = item.colour;
        ctx.fillRect(x - 16, y - 12, 32, 24);
        ctx.fillStyle = '#261a45';
        ctx.fillRect(x - 16, y - 7, 32, 3);
        ctx.save();
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(item.badge, x, y + 7);
        ctx.restore();
        return;
      }
      const skill = item.kind === 'skill';
      const pick = skill ? ['palette', 'bricks', 'code', 'cube'][this.levelIndex] : 'bulb';
      const height = skill ? 40 : 26, cy = item.y + bob;
      if (skill) {
        ctx.save(); ctx.strokeStyle = '#fff4b7'; ctx.lineWidth = 2; ctx.setLineDash([3, 6]);
        ctx.beginPath(); ctx.arc(item.x, cy, 27 + Math.sin(this.time * 3) * 2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        const pulse = Math.sin(this.time * 4);
        ctx.fillStyle = '#fff2b3'; ctx.fillRect(item.x - 2, cy - 35 - pulse * 2, 4, 4);
      }
      ctx.save();
      ctx.translate(round(item.x), round(cy));
      const squeeze = skill ? 1 : .84 + Math.abs(Math.sin(this.time * 2 + item.x)) * .16;
      ctx.scale(squeeze, 1);
      this.sprite('enemies', pick, 0, height / 2, height);
      ctx.restore();
      if (skill && Math.abs(state.player.x - item.x) < 115 && Math.abs(state.player.y - item.y) < 160) {
        this.label(item.skill.title, item.x, cy - 43, '#fff4d2', 11);
      }
    }

    gate(g, state) {
      const ctx = this.ctx, x = round(g.x), floor = g.y + g.h, top = floor - 250;
      ctx.fillStyle = '#261a45'; ctx.fillRect(x - 4, top - 6, g.w + 8, 256);
      ctx.fillStyle = '#5a4a9a'; ctx.fillRect(x, top, g.w, 250);
      ctx.fillStyle = '#7d6cc4'; ctx.fillRect(x, top, 5, 250);
      for (let y = top + 14; y < floor - 8; y += 34) {
        ctx.fillStyle = '#3a2d70'; ctx.fillRect(x + 6, y, g.w - 12, 4);
        ctx.fillStyle = '#ffd36c'; ctx.fillRect(x + 8, y + 9, 5, 5); ctx.fillRect(x + g.w - 13, y + 9, 5, 5);
      }
      ctx.fillStyle = '#ffd36c'; ctx.fillRect(x - 4, top - 10, g.w + 8, 6);
      const pulse = .5 + .5 * Math.sin(this.time * 4);
      ctx.fillStyle = `rgba(255,120,150,${.25 + pulse * .3})`; ctx.fillRect(x - 8, top, 3, 250);
      this.label(g.label, x + g.w / 2, top + 44, '#ffe8ae', 11);
      if (g.needs === 'keys') {
        const keys = state.world.collectibles.filter(item => item.kind === 'key');
        this.label(keys[0].bell ? 'RING FOR ATTENTION' : keys.filter(k => k.collected).length + ' / ' + keys.length + ' KEYWORDS', x + g.w / 2, top + 66, '#d4f5e3', 10);
      } else this.label('CLEAR THE ROUND', x + g.w / 2, top + 66, '#d4f5e3', 10);
    }

    fakeExit(state) {
      const f = state.fakeExit;
      if (!f || f.timer >= 150 || !this.visible(f.x - 60, f.w + 120)) return;
      const cx = f.x + f.w / 2, feet = f.y + f.h;
      // Once touched, the finish line leans and is hauled away to the right.
      const lift = f.triggered ? Math.min(26, f.timer * 1.5) : 0;
      this.sprite('props', 'portal', cx, feet + 2 - lift, 116, false, f.triggered ? .9 : 1);
      this.label(f.triggered ? 'ONE MORE THING…' : 'SHIPPED! FINISH HERE', cx, feet - 133 - lift, f.triggered ? '#ffc2a8' : '#b6fff0', 10);
      if (f.triggered) this.sprite('enemies', 'scopecreep', cx + 74, feet - lift, 96);
    }

    feed(state) {
      const c = state.chase;
      if (!c || !(c.active || c.gone < H.FEED.leave)) return;
      const ctx = this.ctx, right = round(c.x), left = round(this.camera) - 10;
      const m = this.meta.feed, art = this.images.feed, f = m?.frames?.front;
      // Its crest overhangs its face, so it comes into view a little before the face does.
      if (right + (art && f ? f.w - m.edge : 0) < left) {
        // Still off screen: the edge glows where it is about to arrive.
        if (c.active) { ctx.fillStyle = `rgba(255,131,180,${.2 + .2 * Math.sin(this.time * 9)})`; ctx.fillRect(left + 10, 0, 10, HGT); }
        return;
      }
      // Outrun, it falls behind and drops out of the picture.
      const leaving = c.active ? 0 : c.gone / H.FEED.leave;
      ctx.save(); ctx.globalAlpha = 1 - leaving; ctx.translate(0, round(HGT * leaving * leaving));
      if (art && f) this.feedArt(m, art, f, left, right, 1 - leaving);
      else {
        // Without its art the Feed is a plain dark wall with a bright edge.
        ctx.fillStyle = '#1d1640'; ctx.fillRect(left, 0, right - left, HGT);
        ctx.fillStyle = '#ff83b4'; ctx.fillRect(right - 4, 0, 4, HGT);
      }
      // Its name rides the leading edge, wherever a narrow view leaves the wall.
      this.label('THE FEED', Math.max(right - 62, left + 62), 118, '#ffd0e2', 13);
      ctx.restore();
    }

    // The Feed's painted leading edge stands with its face on the Feed's position. Behind it a wall
    // of posts scrolls upwards, the way a feed does, and likes and alerts fly off the front.
    feedArt(m, art, f, left, right, opacity) {
      const ctx = this.ctx, t = this.time, body = this.images.feedBody;
      const x = right - m.edge, y = round(-10 + 5 * Math.sin(t * 2.6));
      if (x > left) {
        ctx.fillStyle = '#1d1640'; ctx.fillRect(left, 0, x + 48 - left, HGT);
        if (body) {
          const bw = m.body.size[0], bh = m.body.size[1], scroll = round(t * 110) % bh;
          ctx.save(); ctx.beginPath(); ctx.rect(left, 0, x + 48 - left, HGT); ctx.clip();
          for (let bx = x + 48 - bw; bx > left - bw; bx -= bw) for (let by = -scroll; by < HGT; by += bh) ctx.drawImage(body, bx, by);
          ctx.restore();
        }
      }
      ctx.drawImage(art, f.x, f.y, f.w, f.h, x, y, f.w, f.h);
      const icons = ['heart', 'like', 'bubble', 'badge', 'bell', 'share'];
      for (let i = 0; i < 10; i++) {
        const icon = m.frames[icons[i % icons.length]];
        if (!icon) continue;
        const life = (t * (.5 + i % 3 * .12) + i * .37) % 1;
        // Every other one leaves the crest; the rest leave the face at a height of their own.
        const fromX = i % 2 ? right - 6 : x + m.crest[0] - 14, fromY = i % 2 ? 110 + i * 97 % 330 : y + m.crest[1];
        const reach = 56 + i * 29 % 60, rise = 26 + i * 17 % 34, scale = (.72 + i % 4 * .11) * (.75 + .25 * life);
        ctx.globalAlpha = opacity * Math.min(1, life * 6) * (1 - life) ** .7;
        ctx.drawImage(art, icon.x, icon.y, icon.w, icon.h, round(fromX + reach * life - icon.w * scale / 2),
          round(fromY - rise * Math.sin(life * Math.PI) + 18 * life * life - icon.h * scale / 2), round(icon.w * scale), round(icon.h * scale));
      }
      ctx.globalAlpha = opacity;
    }

    enemy(e) {
      const animation = e.type === 'inbox' ? 'envelope' : e.type;
      const frame = animation + '_' + Math.floor((e.phase || 0) / (animation === 'plane' ? 14 : 8)) % 2;
      const height = e.type === 'plane' ? 36 : e.h + 9;
      this.sprite('enemies', frame, e.x + e.w / 2, e.y + e.h + 1, height, e.type === 'plane' && e.facing < 0);
    }

    signoffs(state) {
      if (!state.boss.signoffs) return;
      const cleared = state.boss.maxHealth - state.boss.health;
      for (const [i, terminal] of state.boss.signoffs.entries()) {
        if (!this.visible(terminal.x - 55, 110)) continue;
        const floor = state.boss.floor;
        this.sprite('props', 'terminal', terminal.x, floor, 68, false, i > cleared ? .55 : 1);
        const prompt = i < cleared ? 'FILED' : i === cleared ? 'DASH' : 'WAIT';
        this.label(terminal.label + ' · ' + prompt, terminal.x, floor - 82,
          i === cleared ? '#ffe070' : '#d4f5e3', 11);
      }
    }

    boss(state) {
      const b = state.boss;
      if (!b || !this.visible(b.x - 80, b.w + 160)) return;
      if (b.type === 'finalreview') {
        this.sprite('enemies', b.type, b.x + b.w / 2, b.floor, 90);
        this.label(b.alive ? 'RECEPTION' : 'THE ROOM IS YOURS', b.x + b.w / 2, b.floor - 105, '#ffe8ae', 12);
        return;
      }
      if (!b.alive) return;
      const ctx = this.ctx, cx = b.x + b.w / 2, feet = b.y + b.h;
      const visualHeight = b.h + 24;
      const open = b.phase === 'vulnerable';
      const warning = b.phase === 'telegraph';
      if (b.active && !open && b.type !== 'scopecreep') {
        ctx.save();
        ctx.strokeStyle = warning ? '#ffd46f' : 'rgba(157,201,255,.7)'; ctx.lineWidth = warning ? 3 : 2;
        ctx.setLineDash(warning ? [6, 4] : [3, 7]); ctx.lineDashOffset = -this.time * 22;
        ctx.beginPath(); ctx.ellipse(cx, feet - visualHeight / 2, b.w / 2 + 14, visualHeight / 2 + 11, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      const hitFlash = b.hitCooldown > 0 && Math.floor(b.hitCooldown / 4) % 2;
      if (!hitFlash) this.sprite('enemies', b.type, cx, feet, visualHeight);
      if (b.active) {
        const y = feet - visualHeight - 34;
        this.label(b.name.toUpperCase() + (b.enraged && b.maxHealth > 1 ? ' · ESCALATED' : ''), cx, y - 15, b.enraged ? '#ffc2a8' : '#fff9e9', 10);
        ctx.fillStyle = '#20183f'; ctx.fillRect(cx - 49, y, 98, 9);
        ctx.fillStyle = '#b8a1ed'; ctx.fillRect(cx - 47, y + 2, 94, 5);
        ctx.fillStyle = open ? '#8af2bc' : '#ffb15d';
        ctx.fillRect(cx - 47, y + 2, round(94 * b.health / b.maxHealth), 5);
        for (let i = 1; i < b.maxHealth; i++) { ctx.fillStyle = ink; ctx.fillRect(cx - 48 + i * 96 / b.maxHealth, y + 1, 2, 7); }
        if (warning) {
          const wx = cx + b.facing * (b.w / 2 + 36), wy = feet - 60;
          ctx.fillStyle = '#ffdc73'; ctx.beginPath(); ctx.moveTo(wx, wy - 22); ctx.lineTo(wx - 18, wy + 10); ctx.lineTo(wx + 18, wy + 10); ctx.closePath(); ctx.fill();
          ctx.fillStyle = ink; ctx.font = 'bold 25px monospace'; ctx.textAlign = 'center'; ctx.fillText('!', wx, wy + 6); ctx.textAlign = 'left';
        } else if (b.type === 'scopecreep' && !open) {
          this.label(b.phase === 'attack' ? 'JUMP OVER THE CHARGE' : 'WAIT FOR THE STOP', cx, feet + 23, '#ffdf9a', 10);
        } else if (open) {
          this.label('OPEN · STOMP OR DASH', cx, feet + 23, '#b4ffcb', 10);
          const bounce = Math.sin(this.time * 8) * 3;
          ctx.fillStyle = '#b8ffd2'; ctx.beginPath();
          ctx.moveTo(cx - 7, feet - visualHeight - 10 + bounce);
          ctx.lineTo(cx + 7, feet - visualHeight - 10 + bounce);
          ctx.lineTo(cx, feet - visualHeight - 3 + bounce); ctx.closePath(); ctx.fill();
        } else if (b.phase === 'attack') {
          this.label(b.type === 'algorithm' ? 'DODGE THE FAN' : 'DODGE THE SCAN', cx, feet + 23, '#ffdb92', 10);
        } else {
          this.label('SHIELD UP', cx, feet + 23, '#d2e7ff', 9);
        }
      }
    }

    projectile(shot) {
      if (!this.visible(shot.x, 20)) return;
      const ctx = this.ctx, col = shot.kind === 'purple' ? '#d7a0ff' : '#83f7ff';
      ctx.fillStyle = 'rgba(132,218,255,.22)'; ctx.fillRect(round(shot.x - 4), round(shot.y - 4), 22, 22);
      ctx.fillStyle = '#423171'; ctx.fillRect(round(shot.x - 1), round(shot.y - 1), 16, 16);
      ctx.fillStyle = col; ctx.fillRect(round(shot.x + 2), round(shot.y + 2), 10, 10);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(round(shot.x + 4), round(shot.y + 4), 4, 4);
    }

    player(p, state) {
      const ctx = this.ctx, im = this.images.hero, animations = this.meta.hero?.animations;
      if (!im || !animations) return;
      const name = state.mode === 'complete' ? 'victory' : p.animation || 'idle';
      if (name !== this.lastAnimation) { this.lastAnimation = name; this.animationStarted = this.time; }
      const anim = animations[name] || animations.idle;
      const elapsed = Math.max(0, this.time - this.animationStarted);
      let index = Math.floor(elapsed * (anim.fps || 8));
      index = anim.loop ? index % anim.frames.length : Math.min(index, anim.frames.length - 1);
      const f = this.frame('hero', anim.frames[index]);
      if (!f) return;
      const x = round(p.x + p.w / 2), feet = round(p.y + p.h);
      const draw = (atX, opacity) => {
        ctx.save(); ctx.globalAlpha *= opacity; ctx.translate(atX, feet);
        if (p.facing < 0) ctx.scale(-1, 1);
        ctx.drawImage(im, f.x, f.y, f.w, f.h, -f.anchor[0], -f.anchor[1], f.w, f.h);
        ctx.restore();
      };
      if (p.dashTime > 0) { draw(x - p.facing * 34, .13); draw(x - p.facing * 17, .28); }
      const blink = p.invulnerable > 0 && Math.floor(state.tick / 5) % 2;
      draw(x, blink ? .45 : 1);
      if (state.assist && p.grounded) {
        ctx.fillStyle = '#a6fff1'; ctx.fillRect(x - 11, feet + 1, 22, 2);
      }
    }

    exit(state) {
      const ex = state.world.exit;
      if (!this.visible(ex.x - 20, ex.w + 40)) return;
      const ctx = this.ctx, cx = ex.x + ex.w / 2, feet = ex.y + ex.h;
      const unlocked = !state.boss.alive;
      if (unlocked) {
        ctx.fillStyle = 'rgba(110,250,255,.12)'; ctx.fillRect(cx - 45, feet - 114, 90, 115);
      }
      this.sprite('props', 'portal', cx, feet + 2, 116);
      this.label(unlocked ? (state.levelIndex === 3 ? 'FINISH THE STORY' : 'NEXT WORLD') : 'CLEAR THE REVIEW', cx, feet - 133, unlocked ? '#b6fff0' : '#efe0ff', 10);
      if (!unlocked) {
        ctx.fillStyle = '#32235f'; ctx.fillRect(cx - 18, feet - 64, 36, 27);
        ctx.strokeStyle = '#ffe09c'; ctx.lineWidth = 3; ctx.strokeRect(cx - 9, feet - 73, 18, 17);
        ctx.fillStyle = '#ffd36c'; ctx.fillRect(cx - 13, feet - 63, 26, 20);
        ctx.fillStyle = ink; ctx.fillRect(cx - 2, feet - 57, 4, 8);
      } else {
        for (let i = 0; i < 5; i++) {
          const a = this.time * 1.8 + i * Math.PI * .4;
          ctx.fillStyle = i % 2 ? '#ffdc8c' : '#c0ffff';
          ctx.fillRect(round(cx + Math.cos(a) * 52), round(feet - 58 + Math.sin(a) * 62), 3, 3);
        }
      }
    }

    label(text, x, y, colour = '#ffffff', size = 11) {
      const ctx = this.ctx;
      ctx.save(); ctx.font = 'bold ' + size + 'px monospace'; ctx.textAlign = 'center';
      const width = ctx.measureText(text).width + 14;
      ctx.fillStyle = 'rgba(31,25,68,.88)'; ctx.fillRect(round(x - width / 2), round(y - size - 3), round(width), size + 10);
      ctx.fillStyle = colour; ctx.fillText(text, round(x), round(y + 1)); ctx.restore();
    }

    particle(p) {
      if (!this.visible(p.x, 8)) return;
      const ctx = this.ctx;
      ctx.save(); ctx.globalAlpha = clamp(p.life / Math.min(14, p.maxLife), 0, 1);
      ctx.fillStyle = p.kind === 'confetti' ? ['#ffed8e', '#ff98ca', '#8cf7ed', '#bba0ff'][Math.abs(round(p.x + p.y)) % 4] : COLOURS[p.kind] || '#fff4d4';
      ctx.fillRect(round(p.x), round(p.y), p.size, p.kind === 'confetti' ? p.size / 2 + 1 : p.size);
      ctx.restore();
    }
  }

  H.Renderer = Renderer;
  if (typeof module !== 'undefined' && module.exports) module.exports = { Renderer };
})(typeof globalThis !== 'undefined' ? globalThis : window);

